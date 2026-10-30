import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";
import { aiUsage, galleryPhotos, giftBoxes, reviews, productHighlights, siteImageDrafts, siteImages, siteSettings, vendorProfiles, vendorSubmissions } from "../drizzle/schema";
import { createDb, type Database } from "./db";
import type { Env } from "./env";

// Guardrails that keep the site inside Cloudflare's free allowances.
//
// Workers AI: free 10,000 neurons a day for the whole account; past that it simply
// fails (no charge on the Free plan). We stop earlier so there is always room:
// makers stop at 70 percent, owners at 85 percent.
//
// R2 photo storage: the only service here that bills past its free tier
// (10 GB stored, 1 million uploads a month). We track usage and refuse new
// uploads before reaching those amounts, and a nightly job removes photos no
// page uses anymore.

export const AI_FREE_NEURONS_PER_DAY = 10_000;
export const AI_STOP_FOR_MAKERS = 7_000;
export const AI_STOP_FOR_OWNERS = 8_500;
const SITE_AI_KEY = "site:neurons";

export const STORAGE_FREE_BYTES = 10 * 1024 ** 3;
export const STORAGE_BLOCK_BYTES = 9 * 1024 ** 3;
export const UPLOADS_FREE_PER_MONTH = 1_000_000;
export const UPLOADS_BLOCK_PER_MONTH = 900_000;
const ORPHAN_GRACE_DAYS = 7;
const MANAGED_PREFIX = /^(vendor-\d+|vendor-owner|site|review)\//;

// Workers AI pricing for the model we use (neurons per million tokens).
const NEURONS_PER_M_INPUT = 4_119;
const NEURONS_PER_M_OUTPUT = 34_868;

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Neurons for one request, from the token counts Workers AI reports (or a character based estimate). */
export function estimateNeurons(promptTokens: number, completionTokens: number) {
  return Math.max(1, Math.ceil((promptTokens * NEURONS_PER_M_INPUT + completionTokens * NEURONS_PER_M_OUTPUT) / 1_000_000));
}

export async function siteNeuronsToday(db: Database) {
  const row = (await db.select({ count: aiUsage.count }).from(aiUsage).where(sql`${aiUsage.email} = ${SITE_AI_KEY} AND ${aiUsage.day} = ${today()}`).limit(1))[0];
  return row?.count ?? 0;
}

/** Refuses before the shared daily allowance runs low. Owners get the last slice so the dashboard keeps working. */
export async function assertAiBudget(db: Database, role: "maker" | "owner") {
  const used = await siteNeuronsToday(db);
  const stop = role === "owner" ? AI_STOP_FOR_OWNERS : AI_STOP_FOR_MAKERS;
  if (used >= stop) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "The writing helper has reached today's free limit for the marketplace. It resets every afternoon (midnight UTC, 4 or 5 p.m. Pacific), and you can keep editing by hand." });
}

export async function addSiteNeurons(db: Database, neurons: number) {
  await db.insert(aiUsage).values({ email: SITE_AI_KEY, day: today(), count: neurons })
    .onConflictDoUpdate({ target: [aiUsage.email, aiUsage.day], set: { count: sql`${aiUsage.count} + ${neurons}` } });
}

async function aiRequestsToday(db: Database) {
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${aiUsage.count}), 0)` }).from(aiUsage).where(sql`${aiUsage.day} = ${today()} AND ${aiUsage.email} <> ${SITE_AI_KEY}`);
  return Number(row?.total ?? 0);
}

// Storage totals live in site_settings: a running total updated on every upload
// and delete, corrected by the nightly recount.
async function getNumber(db: Database, key: string) {
  const row = (await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1))[0];
  return Number(row?.value ?? 0) || 0;
}
async function addNumber(db: Database, key: string, amount: number) {
  await db.insert(siteSettings).values({ key, value: String(Math.max(0, amount)) })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: sql`max(0, cast(${siteSettings.value} as integer) + ${amount})` } });
}
async function setValue(db: Database, key: string, value: string) {
  await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

/** Checks there is room for one more upload of this size. Returns a readable reason when there is not. */
export async function storageRoomProblem(db: Database, incomingBytes: number): Promise<string | null> {
  const [bytes, uploads] = await Promise.all([getNumber(db, "storage:bytes"), getNumber(db, `uploads:${thisMonth()}`)]);
  if (bytes + incomingBytes > STORAGE_BLOCK_BYTES) return "Photo storage is almost full, so new uploads are paused to keep the site free. Please let the marketplace know.";
  if (uploads >= UPLOADS_BLOCK_PER_MONTH) return "The monthly upload limit is almost reached, so new uploads are paused until next month to keep the site free.";
  return null;
}

export async function recordUpload(db: Database, bytes: number) {
  await Promise.all([addNumber(db, "storage:bytes", bytes), addNumber(db, "storage:objects", 1), addNumber(db, `uploads:${thisMonth()}`, 1)]);
}

/** Deletes one stored photo and takes its size off the running total. */
export async function deleteStoredObject(env: Env, key: string) {
  const head = await env.MEDIA.head(key);
  if (!head) return;
  await env.MEDIA.delete(key);
  const db = createDb(env.DB);
  await Promise.all([addNumber(db, "storage:bytes", -head.size), addNumber(db, "storage:objects", -1)]);
}

const keyFromUrl = (url: string | null | undefined) => {
  const match = (url || "").match(/^\/(?:media|manus-storage)\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};
const parseList = (value: string | null) => { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } };

/** Every stored photo key that some page, listing, or pending change still uses. */
async function referencedKeys(db: Database) {
  const keys = new Set<string>();
  const add = (url: string | null | undefined) => { const key = keyFromUrl(url); if (key) keys.add(key); };
  for (const row of await db.select({ cover: vendorProfiles.coverImageUrl, gallery: vendorProfiles.galleryImageUrls }).from(vendorProfiles)) { add(row.cover); parseList(row.gallery).forEach(add); }
  for (const row of await db.select({ cover: vendorSubmissions.coverImageUrl, gallery: vendorSubmissions.galleryImageUrls }).from(vendorSubmissions).where(inArray(vendorSubmissions.status, ["draft", "pending", "changes_requested"]))) { add(row.cover); parseList(row.gallery).forEach(add); }
  for (const row of await db.select({ url: siteImages.url }).from(siteImages)) add(row.url);
  for (const row of await db.select({ url: siteImageDrafts.url }).from(siteImageDrafts)) add(row.url);
  for (const row of await db.select({ url: productHighlights.imageUrl }).from(productHighlights)) add(row.url);
  for (const row of await db.select({ url: galleryPhotos.url }).from(galleryPhotos)) add(row.url);
  for (const row of await db.select({ url: giftBoxes.imageUrl }).from(giftBoxes)) add(row.url);
  for (const row of await db.select({ url: reviews.photoUrl }).from(reviews)) add(row.url);
  return keys;
}

/** Decides which stored photos can be removed: unused, inside our own folders, and older than the grace period. */
export function pickUnused(objects: Array<{ key: string; size: number; uploaded: Date }>, referenced: Set<string>, now = Date.now()) {
  const cutoff = now - ORPHAN_GRACE_DAYS * 24 * 60 * 60 * 1000;
  // Safety: if nothing at all is referenced, something is wrong with the lookup, so remove nothing.
  if (referenced.size === 0) return [];
  return objects.filter((object) => !referenced.has(object.key) && MANAGED_PREFIX.test(object.key) && object.uploaded.getTime() < cutoff);
}

export type StorageCheck = { objects: number; bytes: number; removed: number; removedBytes: number; checkedAt: string };

/**
 * Nightly (and on demand): counts what is really in the bucket, and removes
 * photos that nothing uses anymore and that are older than a week, such as
 * replaced cover photos or uploads from forms that were never saved.
 */
export async function runStorageMaintenance(env: Env, options: { removeUnused: boolean } = { removeUnused: true }): Promise<StorageCheck> {
  const db = createDb(env.DB);
  const referenced = await referencedKeys(db);
  const all: Array<{ key: string; size: number; uploaded: Date }> = [];
  let cursor: string | undefined;
  do {
    const page = await env.MEDIA.list({ cursor, limit: 1000 });
    for (const object of page.objects) all.push({ key: object.key, size: object.size, uploaded: object.uploaded });
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const unused = options.removeUnused ? pickUnused(all, referenced) : [];
  const toRemove = unused.map((object) => object.key);
  const removedBytes = unused.reduce((total, object) => total + object.size, 0);
  const objects = all.length - unused.length;
  const bytes = all.reduce((total, object) => total + object.size, 0) - removedBytes;
  for (let start = 0; start < toRemove.length; start += 1000) { await env.MEDIA.delete(toRemove.slice(start, start + 1000)); }
  const removed = toRemove.length;
  const checkedAt = new Date().toISOString();
  await Promise.all([setValue(db, "storage:bytes", String(bytes)), setValue(db, "storage:objects", String(objects)), setValue(db, "storage:checked_at", checkedAt), setValue(db, "storage:last_removed", String(removed))]);
  return { objects, bytes, removed, removedBytes, checkedAt };
}

/** What the dashboard Usage card shows. */
export async function usageSummary(db: Database) {
  const [neurons, aiRequests, bytes, objects, uploads, checkedAt, lastRemoved] = await Promise.all([
    siteNeuronsToday(db), aiRequestsToday(db), getNumber(db, "storage:bytes"), getNumber(db, "storage:objects"), getNumber(db, `uploads:${thisMonth()}`),
    db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, "storage:checked_at")).limit(1).then((rows) => rows[0]?.value ?? null),
    getNumber(db, "storage:last_removed"),
  ]);
  return {
    ai: { neuronsToday: neurons, requestsToday: aiRequests, freePerDay: AI_FREE_NEURONS_PER_DAY, makerStop: AI_STOP_FOR_MAKERS, ownerStop: AI_STOP_FOR_OWNERS },
    storage: { bytes, objects, freeBytes: STORAGE_FREE_BYTES, blockBytes: STORAGE_BLOCK_BYTES, checkedAt, lastRemoved },
    uploads: { thisMonth: uploads, freePerMonth: UPLOADS_FREE_PER_MONTH, blockAt: UPLOADS_BLOCK_PER_MONTH },
  };
}
