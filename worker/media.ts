import { getAccessIdentity } from "./access";
import { createDb, getOrCreateVendorAccount } from "./db";
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
export async function handleVendorUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const identity = await getAccessIdentity(request, env);
  if (!identity) return json({ error: "Please sign in to the maker portal." }, 401);

  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSIONS[contentType];
  if (!extension) return json({ error: "Use a JPEG, PNG, or WebP image." }, 415);
  const length = Number(request.headers.get("Content-Length") || "0");
  if (!length) return json({ error: "Missing image." }, 411);
  if (length > MAX_UPLOAD_BYTES) return json({ error: "Image exceeds 5 MB." }, 413);
  if (!request.body) return json({ error: "Missing image." }, 400);

  const account = await getOrCreateVendorAccount(createDb(env.DB), identity.email);
  const rawName = new URL(request.url).searchParams.get("name") || "image";
  const base = rawName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "image";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const key = `vendor-${account.id}/${base}_${suffix}.${extension}`;

  await env.MEDIA.put(key, request.body, { httpMetadata: { contentType } });
  return json({ key, url: `/media/${key}` });
}

/**
 * GET /media/<key> serves an image from R2.
 * GET /manus-storage/<key> is an alias so image URLs saved on the old site keep working after migration.
 */
export async function handleMedia(request: Request, env: Env, key: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  // onlyIf matched a conditional request (If-None-Match etc.): no body returned.
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
