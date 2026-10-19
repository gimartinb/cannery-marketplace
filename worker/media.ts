import { isSiteImageSlot } from "../shared/siteImageSlots";
import { getAccessIdentity, isAdminEmail } from "./access";
import { createDb, getOrCreateVendorAccount, getSiteImage, isInvitedMaker, setSiteImageUrl } from "./db";
import type { Env } from "./env";

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
function validateImageUpload(request: Request): { contentType: string; extension: string; body: ReadableStream } | Response {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSIONS[contentType];
  if (!extension) return json({ error: "Use a JPEG, PNG, or WebP image." }, 415);
  const length = Number(request.headers.get("Content-Length") || "0");
  if (!length) return json({ error: "Missing image." }, 411);
  if (length > MAX_UPLOAD_BYTES) return json({ error: "Image exceeds 5 MB." }, 413);
  if (!request.body) return json({ error: "Missing image." }, 400);
  return { contentType, extension, body: request.body };
}

const randomSuffix = () => crypto.randomUUID().replace(/-/g, "").slice(0, 8);

/** Deletes an owner-uploaded site image from R2. Never touches vendor photos or built-in defaults. */
export async function deleteSiteImageObject(env: Env, url: string | null | undefined) {
  if (url && url.startsWith("/media/site/")) await env.MEDIA.delete(url.slice("/media/".length));
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

  await env.MEDIA.put(key, upload.body, { httpMetadata: { contentType } });
  return json({ key, url: `/media/${key}` });
}

/**
 * POST /api/admin/upload?slot=<site image spot>  (owners only)
 * Body: the raw image bytes. Replaces that spot's image and removes the previous upload.
 */
export async function handleSiteImageUpload(request: Request, env: Env): Promise<Response> {
  const identity = await getAccessIdentity(request, env);
  if (!identity) return json({ error: "Please sign in as an administrator." }, 401);
  if (!isAdminEmail(env, identity.email)) return json({ error: "This email is not on the approved owner list." }, 403);
  const slot = new URL(request.url).searchParams.get("slot") || "";
  if (!isSiteImageSlot(slot)) return json({ error: "Unknown image spot." }, 400);
  const upload = validateImageUpload(request);
  if (upload instanceof Response) return upload;

  const db = createDb(env.DB);
  const previous = await getSiteImage(db, slot);
  const key = `site/${slot}_${randomSuffix()}.${upload.extension}`;
  await env.MEDIA.put(key, upload.body, { httpMetadata: { contentType: upload.contentType } });
  const url = `/media/${key}`;
  await setSiteImageUrl(db, slot, url);
  await deleteSiteImageObject(env, previous?.url);
  return json({ key, url });
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
