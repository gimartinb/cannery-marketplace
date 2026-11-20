import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { siteImageDrafts, siteImages } from "../drizzle/schema";
import { isSiteImageSlot, type SiteImageSlotId } from "../shared/siteImageSlots";
import type { Database } from "./db";
import type { Env } from "./env";
import { deleteSiteImageObject } from "./media";

// Image spots follow the same Draft, Preview, Publish steps as site text.
// site_images holds what visitors see; site_image_drafts holds unpublished changes.

export async function listImageDrafts(db: Database) {
  return (await db.select().from(siteImageDrafts)).filter((row) => isSiteImageSlot(row.id));
}

/** What the site would show if every image draft were published (for Preview). */
export async function previewSiteImages(db: Database) {
  const [live, drafts] = await Promise.all([db.select({ id: siteImages.id, url: siteImages.url, alt: siteImages.alt }).from(siteImages), listImageDrafts(db)]);
  const merged = new Map(live.map((row) => [row.id, row]));
  for (const draft of drafts) {
    if (draft.url === null) merged.delete(draft.id);
    else merged.set(draft.id, { id: draft.id, url: draft.url, alt: draft.alt });
  }
  return [...merged.values()];
}

async function liveImage(db: Database, id: string) {
  return (await db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1))[0] ?? null;
}
async function draftImage(db: Database, id: string) {
  return (await db.select().from(siteImageDrafts).where(eq(siteImageDrafts.id, id)).limit(1))[0] ?? null;
}

/** A new upload becomes the draft. A previous unpublished draft upload is removed from storage. */
export async function saveImageDraftUpload(env: Env, db: Database, id: SiteImageSlotId, url: string, email: string) {
  const [live, previous] = await Promise.all([liveImage(db, id), draftImage(db, id)]);
  const alt = previous?.url ? previous.alt : live?.alt ?? null;
  await db.insert(siteImageDrafts).values({ id, url, alt, draftBy: email }).onConflictDoUpdate({ target: siteImageDrafts.id, set: { url, alt, draftBy: email } });
  if (previous?.url && previous.url !== live?.url && previous.url !== url) await deleteSiteImageObject(env, previous.url);
}

/** Changes the description. It applies to the draft image, or starts a draft of the live replacement. */
export async function saveImageDraftAlt(db: Database, id: SiteImageSlotId, alt: string, email: string) {
  const [live, draft] = await Promise.all([liveImage(db, id), draftImage(db, id)]);
  const url = draft ? draft.url : live?.url ?? null;
  if (!url) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a replacement image before editing its description." });
  await db.insert(siteImageDrafts).values({ id, url, alt: alt || null, draftBy: email }).onConflictDoUpdate({ target: siteImageDrafts.id, set: { alt: alt || null, draftBy: email } });
}

/** Drafts a return to the original built in image. */
export async function draftOriginalImage(env: Env, db: Database, id: SiteImageSlotId, email: string) {
  const [live, previous] = await Promise.all([liveImage(db, id), draftImage(db, id)]);
  await db.insert(siteImageDrafts).values({ id, url: null, alt: null, draftBy: email }).onConflictDoUpdate({ target: siteImageDrafts.id, set: { url: null, alt: null, draftBy: email } });
  if (previous?.url && previous.url !== live?.url) await deleteSiteImageObject(env, previous.url);
}

export async function discardImageDraft(env: Env, db: Database, id: SiteImageSlotId) {
  const [live, draft] = await Promise.all([liveImage(db, id), draftImage(db, id)]);
  await db.delete(siteImageDrafts).where(eq(siteImageDrafts.id, id));
  if (draft?.url && draft.url !== live?.url) await deleteSiteImageObject(env, draft.url);
}

/** Publishes image drafts (some or all). Replaced uploads are removed from storage. */
export async function publishSiteImages(env: Env, db: Database, ids: string[] | "all") {
  const drafts = (await listImageDrafts(db)).filter((draft) => ids === "all" || ids.includes(draft.id));
  if (!drafts.length) return { published: 0 };
  const live = new Map((await db.select().from(siteImages).where(inArray(siteImages.id, drafts.map((draft) => draft.id)))).map((row) => [row.id, row]));
  const statements = drafts.flatMap((draft) => [
    draft.url === null
      ? db.delete(siteImages).where(eq(siteImages.id, draft.id))
      : db.insert(siteImages).values({ id: draft.id, url: draft.url, alt: draft.alt }).onConflictDoUpdate({ target: siteImages.id, set: { url: draft.url, alt: draft.alt } }),
    db.delete(siteImageDrafts).where(eq(siteImageDrafts.id, draft.id)),
  ]);
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  for (const draft of drafts) {
    const old = live.get(draft.id)?.url;
    if (old && old !== draft.url) await deleteSiteImageObject(env, old);
  }
  return { published: drafts.length };
}
