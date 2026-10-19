import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { TRPCError } from "@trpc/server";
import { galleryPhotos, makerInvites, productHighlights, siteImages, siteSettings, vendorAccounts, vendorProfiles, vendorSubmissions } from "../drizzle/schema";
import type { VendorProfileInput } from "../shared/vendorProfile";

export type Database = ReturnType<typeof createDb>;
export function createDb(d1: D1Database) { return drizzle(d1); }

export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function serializeProfile(input: VendorProfileInput) {
  return {
    slug: input.slug || slugify(input.name), name: input.name, category: input.category, shortBio: input.shortBio,
    ownerBio: input.ownerBio || null, contactEmail: input.contactEmail.toLowerCase(), websiteUrl: input.websiteUrl || null,
    instagramUrl: input.instagramUrl || null, facebookUrl: input.facebookUrl || null, tiktokUrl: input.tiktokUrl || null,
    coverImageUrl: input.coverImageUrl || null, galleryImageUrls: JSON.stringify(input.galleryImageUrls || []),
    featured: input.featured, displayOrder: input.displayOrder, active: input.active,
  };
}

function deserializeProfile<T extends { galleryImageUrls: string | null }>(row: T) {
  let galleryImageUrls: string[] = [];
  try { galleryImageUrls = JSON.parse(row.galleryImageUrls || "[]"); } catch { galleryImageUrls = []; }
  return { ...row, galleryImageUrls };
}

// Vendor accounts: created on first visit, keyed by the email Cloudflare Access verified.
export async function getOrCreateVendorAccount(db: Database, email: string) {
  const normalized = email.toLowerCase();
  await db.insert(vendorAccounts).values({ email: normalized, lastSignedIn: new Date() })
    .onConflictDoUpdate({ target: vendorAccounts.email, set: { lastSignedIn: new Date() } });
  const account = (await db.select().from(vendorAccounts).where(eq(vendorAccounts.email, normalized)).limit(1))[0];
  if (!account) throw new Error("Could not load vendor account");
  return account;
}

export const DIRECTORY_PAGE_SIZES = [10, 25, 50] as const;

/**
 * One page of the public maker directory. Reads only the rows it returns plus a
 * count, which keeps D1 usage tiny (the free tier allows 5 million row reads a day).
 */
export async function listPublicVendorPage(db: Database, options: { offset: number; limit: number; category?: string; search?: string }) {
  const filters: SQL[] = [eq(vendorProfiles.active, true)];
  if (options.category) filters.push(eq(vendorProfiles.category, options.category));
  if (options.search) {
    const pattern = `%${options.search.toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    filters.push(sql`(lower(${vendorProfiles.name}) LIKE ${pattern} ESCAPE '\\' OR lower(${vendorProfiles.category}) LIKE ${pattern} ESCAPE '\\' OR lower(${vendorProfiles.shortBio}) LIKE ${pattern} ESCAPE '\\')`);
  }
  const where = and(...filters);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(vendorProfiles).where(where).orderBy(asc(vendorProfiles.displayOrder), asc(vendorProfiles.name), asc(vendorProfiles.id)).limit(options.limit).offset(options.offset),
    db.select({ total: sql<number>`count(*)` }).from(vendorProfiles).where(where),
  ]);
  const items = rows.map(deserializeProfile);
  const nextOffset = options.offset + items.length;
  return { items, total: Number(total), nextCursor: nextOffset < Number(total) ? nextOffset : null };
}

export async function listPublicVendorCategories(db: Database) {
  const rows = await db.selectDistinct({ category: vendorProfiles.category }).from(vendorProfiles).where(eq(vendorProfiles.active, true)).orderBy(asc(vendorProfiles.category));
  return rows.map((row) => row.category);
}

export async function listFeaturedVendorProfiles(db: Database, limit: number) {
  const rows = await db.select().from(vendorProfiles).where(and(eq(vendorProfiles.active, true), eq(vendorProfiles.featured, true))).orderBy(asc(vendorProfiles.displayOrder), asc(vendorProfiles.name)).limit(limit);
  return rows.map(deserializeProfile);
}

export async function getPublicVendorProfile(db: Database, slug: string) {
  const row = (await db.select().from(vendorProfiles).where(and(eq(vendorProfiles.slug, slug), eq(vendorProfiles.active, true))).limit(1))[0];
  return row ? deserializeProfile(row) : null;
}

export async function listAllVendorProfiles(db: Database) {
  return (await db.select().from(vendorProfiles).orderBy(vendorProfiles.displayOrder, vendorProfiles.name)).map(deserializeProfile);
}

export async function setVendorActive(db: Database, id: number, active: boolean) {
  await db.update(vendorProfiles).set({ active }).where(eq(vendorProfiles.id, id));
}

export async function createVendorSubmission(db: Database, accountId: number, input: VendorProfileInput) {
  const [row] = await db.insert(vendorSubmissions).values({ ...serializeProfile(input), accountId, profileId: input.profileId || null, status: "pending", adminNote: null, reviewedAt: null }).returning({ id: vendorSubmissions.id });
  return row.id;
}

export async function getLatestVendorSubmission(db: Database, accountId: number) {
  const row = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.accountId, accountId)).orderBy(desc(vendorSubmissions.updatedAt), desc(vendorSubmissions.id)).limit(1))[0];
  return row ? deserializeProfile(row) : null;
}

export async function listVendorSubmissions(db: Database) {
  return (await db.select().from(vendorSubmissions).orderBy(desc(vendorSubmissions.updatedAt), desc(vendorSubmissions.id))).map(deserializeProfile);
}

export async function reviewVendorSubmission(db: Database, submissionId: number, decision: "approved" | "rejected" | "changes_requested", note: string) {
  const submission = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1))[0];
  if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
  const reviewedAt = new Date();
  const markReviewed = db.update(vendorSubmissions).set({ status: decision, adminNote: note || null, reviewedAt }).where(eq(vendorSubmissions.id, submissionId));
  if (decision !== "approved") { await markReviewed; return; }

  const profile = {
    ownerAccountId: submission.accountId, name: submission.name, category: submission.category, shortBio: submission.shortBio,
    ownerBio: submission.ownerBio, contactEmail: submission.contactEmail, websiteUrl: submission.websiteUrl,
    instagramUrl: submission.instagramUrl, facebookUrl: submission.facebookUrl, tiktokUrl: submission.tiktokUrl,
    coverImageUrl: submission.coverImageUrl, galleryImageUrls: submission.galleryImageUrls, featured: submission.featured,
    displayOrder: submission.displayOrder, active: submission.active, approvedAt: reviewedAt,
  };
  // D1 has no interactive transactions; batch() runs both statements atomically.
  await db.batch([
    markReviewed,
    db.insert(vendorProfiles).values({ ...profile, slug: submission.slug }).onConflictDoUpdate({ target: vendorProfiles.slug, set: profile }),
  ]);
}

export async function bulkImportVendorProfiles(db: Database, inputs: VendorProfileInput[]) {
  const slugs = inputs.map((input) => input.slug || slugify(input.name));
  if (new Set(slugs).size !== slugs.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The import contains duplicate slugs." });
  const existing = slugs.length ? await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(inArray(vendorProfiles.slug, slugs)) : [];
  if (existing.length) throw new TRPCError({ code: "CONFLICT", message: `Duplicate vendor slug${existing.length === 1 ? "" : "s"}: ${existing.map((item) => item.slug).join(", ")}` });
  const inserts = inputs.map((input) => db.insert(vendorProfiles).values({ ...serializeProfile(input), ownerAccountId: null, approvedAt: new Date() }));
  const [first, ...rest] = inserts;
  if (first) await db.batch([first, ...rest]);
  return inputs.length;
}

export async function getSiteSetting(db: Database, key: string, fallback: string) {
  return (await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1))[0]?.value ?? fallback;
}

export async function setSiteSetting(db: Database, key: string, value: string) {
  await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

// Site images: owner replacements for the named image spots.
export async function listSiteImages(db: Database) {
  return db.select({ id: siteImages.id, url: siteImages.url, alt: siteImages.alt }).from(siteImages);
}

export async function getSiteImage(db: Database, id: string) {
  return (await db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1))[0] ?? null;
}

export async function setSiteImageUrl(db: Database, id: string, url: string) {
  await db.insert(siteImages).values({ id, url }).onConflictDoUpdate({ target: siteImages.id, set: { url } });
}

export async function setSiteImageAlt(db: Database, id: string, alt: string) {
  const result = await db.update(siteImages).set({ alt: alt || null }).where(eq(siteImages.id, id)).returning({ id: siteImages.id });
  return result.length > 0;
}

export async function deleteSiteImage(db: Database, id: string) {
  await db.delete(siteImages).where(eq(siteImages.id, id));
}

// Maker portal guest list.
export async function isInvitedMaker(db: Database, email: string) {
  return (await db.select({ email: makerInvites.email }).from(makerInvites).where(eq(makerInvites.email, email.toLowerCase())).limit(1)).length > 0;
}

export async function listMakerInvites(db: Database) {
  const invites = await db.select().from(makerInvites).orderBy(asc(makerInvites.email));
  const accounts = invites.length ? await db.select({ email: vendorAccounts.email, lastSignedIn: vendorAccounts.lastSignedIn }).from(vendorAccounts).where(inArray(vendorAccounts.email, invites.map((invite) => invite.email))) : [];
  const lastSeen = new Map(accounts.map((account) => [account.email, account.lastSignedIn]));
  return invites.map((invite) => ({ ...invite, lastSignedIn: lastSeen.get(invite.email) ?? null }));
}

export async function addMakerInvites(db: Database, emails: string[], invitedBy: string) {
  const unique = Array.from(new Set(emails.map((email) => email.trim().toLowerCase())));
  if (!unique.length) return 0;
  const [first, ...rest] = unique.map((email) => db.insert(makerInvites).values({ email, invitedBy: invitedBy.toLowerCase() }).onConflictDoNothing());
  await db.batch([first, ...rest]);
  return unique.length;
}

export async function removeMakerInvite(db: Database, email: string) {
  await db.delete(makerInvites).where(eq(makerInvites.email, email.toLowerCase()));
}

// Home page product highlights (owner managed).
export const MAX_HIGHLIGHTS = 3;
export type HighlightInput = { title: string; description: string; category: string; makerSlug?: string | null; imageUrl?: string | null; displayOrder: number };

async function makerNameFor(db: Database, slug: string | null | undefined) {
  if (!slug) return null;
  const profile = (await db.select({ name: vendorProfiles.name }).from(vendorProfiles).where(eq(vendorProfiles.slug, slug)).limit(1))[0];
  if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "That maker could not be found." });
  return profile.name;
}

export async function listHighlights(db: Database) {
  return db.select().from(productHighlights).orderBy(asc(productHighlights.displayOrder), asc(productHighlights.id));
}

/** Public: highlights whose linked maker is still published (or that link to no maker). */
export async function listPublicHighlights(db: Database) {
  const rows = await listHighlights(db);
  const slugs = rows.map((row) => row.makerSlug).filter((slug): slug is string => Boolean(slug));
  const active = slugs.length ? new Set((await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(and(inArray(vendorProfiles.slug, slugs), eq(vendorProfiles.active, true)))).map((row) => row.slug)) : new Set<string>();
  return rows.map((row) => ({ ...row, makerSlug: row.makerSlug && active.has(row.makerSlug) ? row.makerSlug : null }));
}

export async function getHighlight(db: Database, id: number) {
  return (await db.select().from(productHighlights).where(eq(productHighlights.id, id)).limit(1))[0] ?? null;
}

export async function createHighlight(db: Database, input: HighlightInput) {
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(productHighlights);
  if (Number(total) >= MAX_HIGHLIGHTS) throw new TRPCError({ code: "BAD_REQUEST", message: `The home page shows up to ${MAX_HIGHLIGHTS} highlights. Remove one before adding another.` });
  const makerName = await makerNameFor(db, input.makerSlug);
  const [row] = await db.insert(productHighlights).values({ ...input, makerSlug: input.makerSlug || null, imageUrl: input.imageUrl || null, makerName }).returning({ id: productHighlights.id });
  return row.id;
}

export async function updateHighlight(db: Database, id: number, input: HighlightInput) {
  const makerName = await makerNameFor(db, input.makerSlug);
  await db.update(productHighlights).set({ ...input, makerSlug: input.makerSlug || null, imageUrl: input.imageUrl || null, makerName }).where(eq(productHighlights.id, id));
}

export async function deleteHighlight(db: Database, id: number) {
  await db.delete(productHighlights).where(eq(productHighlights.id, id));
}

// About page gallery (owner managed).
export const MAX_GALLERY_PHOTOS = 12;

export async function listGalleryPhotos(db: Database) {
  return db.select().from(galleryPhotos).orderBy(asc(galleryPhotos.displayOrder), asc(galleryPhotos.id));
}

export async function countGalleryPhotos(db: Database) {
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(galleryPhotos);
  return Number(total);
}

export async function addGalleryPhoto(db: Database, url: string, alt: string) {
  const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${galleryPhotos.displayOrder}), 0) + 1` }).from(galleryPhotos);
  const [row] = await db.insert(galleryPhotos).values({ url, alt, displayOrder: Number(next) }).returning({ id: galleryPhotos.id });
  return row.id;
}

export async function getGalleryPhoto(db: Database, id: number) {
  return (await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1))[0] ?? null;
}

export async function updateGalleryPhoto(db: Database, id: number, input: { alt: string; caption: string }) {
  await db.update(galleryPhotos).set({ alt: input.alt, caption: input.caption || null }).where(eq(galleryPhotos.id, id));
}

export async function deleteGalleryPhoto(db: Database, id: number) {
  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
}

/** Saves a new order: ids listed first to last. */
export async function reorderGalleryPhotos(db: Database, ids: number[]) {
  const [first, ...rest] = ids.map((id, index) => db.update(galleryPhotos).set({ displayOrder: index + 1 }).where(eq(galleryPhotos.id, id)));
  if (first) await db.batch([first, ...rest]);
}
