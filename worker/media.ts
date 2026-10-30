import { isSiteImageSlot } from "../shared/siteImageSlots";
import { saveImageDraftUpload } from "./siteImages";
import { getAccessIdentity, isAdminEmail } from "./access";
import { addGalleryPhoto, countGalleryPhotos, createDb, getOrCreateVendorAccount, isInvitedMaker, MAX_GALLERY_PHOTOS } from "./db";
import type { Env } from "./env";
import { sql } from "drizzle-orm";
import { aiUsage } from "../drizzle/schema";
import { deleteStoredObject, recordUpload, storageRoomProblem } from "./usage";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

/**
 * POST /api/vendor/upload?name=<file name>
 * Body: the raw image bytes. Streamed straight into R2, so it costs almost no
 * Worker CPU (base64 inside JSON would not fit the free tier's CPU budget).
 */
/** Checks method, type, and size. Returns the image type and extension, or an error response. */
function validateImageUpload(request: Request): { contentType: string; extension: string; body: ReadableStream; length: number } | Response {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSIONS[contentType];
  if (!extension) return json({ error: "Use a JPEG, PNG, or WebP image." }, 415);
  const length = Number(request.headers.get("Content-Length") || "0");
  if (!length) return json({ error: "Missing image." }, 411);
  if (length > MAX_UPLOAD_BYTES) return json({ error: "Image exceeds 5 MB." }, 413);
  if (!request.body) return json({ error: "Missing image." }, 400);
  return { contentType, extension, body: request.body, length };
}

const randomSuffix = () => crypto.randomUUID().replace(/-/g, "").slice(0, 8);

/** Deletes an owner-uploaded site image from R2. Never touches vendor photos or built-in defaults. */
export async function deleteSiteImageObject(env: Env, url: string | null | undefined) {
  if (url && url.startsWith("/media/site/")) await deleteStoredObject(env, url.slice("/media/".length));
}

/**
 * Saves one upload to R2, but only if it fits inside the free storage and upload
 * allowances (see usage.ts), and adds it to the running totals.
 */
async function storeObject(env: Env, key: string, upload: { body: ReadableStream; contentType: string; length: number }): Promise<Response | null> {
  const db = createDb(env.DB);
  const problem = await storageRoomProblem(db, upload.length);
  if (problem) return json({ error: problem }, 507);
  const stored = await env.MEDIA.put(key, upload.body, { httpMetadata: { contentType: upload.contentType } });
  await recordUpload(db, stored?.size ?? upload.length);
  return null;
}

export async function handleVendorUpload(request: Request, env: Env): Promise<Response> {
  const identity = await getAccessIdentity(request, env);
  if (!identity) return json({ error: "Please sign in to the maker portal." }, 401);
  if (!isAdminEmail(env, identity.email) && !(await isInvitedMaker(createDb(env.DB), identity.email))) return json({ error: "This email has not been invited to the maker portal yet." }, 403);
  const upload = validateImageUpload(request);
  if (upload instanceof Response) return upload;
  const { contentType, extension } = upload;

  const account = await getOrCreateVendorAccount(createDb(env.DB), identity.email);
  const rawName = new URL(request.url).searchParams.get("name") || "image";
  const base = rawName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "image";
  const key = `vendor-${account.id}/${base}_${randomSuffix()}.${extension}`;

  { const refused = await storeObject(env, key, upload); if (refused) return refused; }
  return json({ key, url: `/media/${key}` });
}

/**
 * POST /api/admin/upload  (owners only). Body: the raw image bytes.
 *   ?slot=<site image spot>  saves a draft replacement for that spot (published from Edit pages)
 *   ?purpose=highlight       stores a home highlight image and returns its URL (saved with the highlight)
 *   ?purpose=gift            stores a gift box photo and returns its URL (saved with the box)
 *   ?purpose=gallery&alt=... adds a photo to the About page gallery (up to 12)
 *   ?purpose=vendor          stores a photo for a maker listing the owner is editing, and returns its URL
 */
export async function handleSiteImageUpload(request: Request, env: Env): Promise<Response> {
  const identity = await getAccessIdentity(request, env);
  if (!identity) return json({ error: "Please sign in as an administrator." }, 401);
  if (!isAdminEmail(env, identity.email)) return json({ error: "This email is not on the approved owner list." }, 403);
  const params = new URL(request.url).searchParams;
  const purpose = params.get("purpose");
  const db = createDb(env.DB);

  if (purpose === "vendor") {
    const upload = validateImageUpload(request);
    if (upload instanceof Response) return upload;
    // Kept outside site/ so removing a highlight or gallery photo never deletes a maker's photo.
    const key = `vendor-owner/${randomSuffix()}${randomSuffix()}.${upload.extension}`;
    { const refused = await storeObject(env, key, upload); if (refused) return refused; }
    return json({ key, url: `/media/${key}` });
  }

  if (purpose === "highlight" || purpose === "gallery" || purpose === "gift") {
    if (purpose === "gallery" && (await countGalleryPhotos(db)) >= MAX_GALLERY_PHOTOS) return json({ error: `The gallery holds up to ${MAX_GALLERY_PHOTOS} photos. Remove one before adding another.` }, 400);
    const upload = validateImageUpload(request);
    if (upload instanceof Response) return upload;
    const key = `site/${purpose}/${randomSuffix()}${randomSuffix()}.${upload.extension}`;
    { const refused = await storeObject(env, key, upload); if (refused) return refused; }
    const url = `/media/${key}`;
    if (purpose === "gallery") {
      const alt = (params.get("alt") || "").trim().slice(0, 300) || "Inside The Cannery Marketplace";
      return json({ id: await addGalleryPhoto(db, url, alt), url });
    }
    return json({ url });
  }

  const slot = params.get("slot") || "";
  if (!isSiteImageSlot(slot)) return json({ error: "Unknown image spot." }, 400);
  const upload = validateImageUpload(request);
  if (upload instanceof Response) return upload;

  const key = `site/${slot}_${randomSuffix()}.${upload.extension}`;
  { const refused = await storeObject(env, key, upload); if (refused) return refused; }
  const url = `/media/${key}`;
  // Saved as a draft. Visitors see it after an owner publishes (Edit pages).
  await saveImageDraftUpload(env, db, slot, url, identity.email);
  return json({ key, url, draft: true });
}

/**
 * GET /media/<key> serves an image from R2.
 * GET /manus-storage/<key> is an alias so image URLs saved on the old site keep working after migration.
 */
export async function handleMedia(request: Request, env: Env, key: string, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  // Cloudflare's edge cache (the free CDN). Every upload gets a unique file name,
  // so a cached copy never goes stale. Note: the edge cache is active on a custom
  // domain (cannerymarket.com); on workers.dev it is skipped and R2 serves every request.
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return request.method === "HEAD" ? new Response(null, cached) : cached;

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  const response = new Response(object.body, { headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return request.method === "HEAD" ? new Response(null, { headers }) : response;
}

export const REVIEW_PHOTOS_PER_SOURCE_PER_DAY = 5;

/**
 * POST /api/review-photo  (anyone; for the review form). Body: the raw image bytes.
 * Limited to a few photos per connection per day, and to the free storage allowance.
 * A photo that never ends up on a review is removed by the nightly storage job.
 */
export async function handleReviewPhotoUpload(request: Request, env: Env): Promise<Response> {
  const address = request.headers.get("CF-Connecting-IP") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cannery-review-photo:${address}`));
  const key = `review-photo:${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const db = createDb(env.DB);
  const day = new Date().toISOString().slice(0, 10);
  // Reuses the small daily counter table (ai_usage) as a per connection upload counter.
  const [row] = await db.insert(aiUsage).values({ email: key, day, count: 1 }).onConflictDoUpdate({ target: [aiUsage.email, aiUsage.day], set: { count: sql`${aiUsage.count} + 1` } }).returning({ count: aiUsage.count });
  if (row && row.count > REVIEW_PHOTOS_PER_SOURCE_PER_DAY) return json({ error: "That is the most photos we can take from one connection today. You can still send your review without a photo." }, 429);
  const upload = validateImageUpload(request);
  if (upload instanceof Response) return upload;
  const objectKey = `review/${randomSuffix()}${randomSuffix()}.${upload.extension}`;
  { const refused = await storeObject(env, objectKey, upload); if (refused) return refused; }
  return json({ url: `/media/${objectKey}` });
}

/** Removes a review photo (owners deleting a review). */
export async function deleteReviewPhoto(env: Env, url: string | null | undefined) {
  if (url && url.startsWith("/media/review/")) await deleteStoredObject(env, url.slice("/media/".length));
}
