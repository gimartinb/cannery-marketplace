import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { TRPCError } from "@trpc/server";
import { galleryPhotos, makerApplications, makerInvites, productHighlights, siteImages, siteSettings, vendorAccounts, vendorProfiles, vendorSubmissions } from "../drizzle/schema";
import type { OwnerVendorInput, VendorProfileInput } from "../shared/vendorProfile";

export type Database = ReturnType<typeof createDb>;
export function createDb(d1: D1Database) { return drizzle(d1); }

export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function serializeProfile(input: VendorProfileInput) {
  return {
    slug: input.slug || slugify(input.name), name: input.name, category: input.category, shortBio: input.shortBio,
    ownerBio: input.ownerBio || null, ownerName: input.ownerName || null, contactEmail: input.contactEmail.toLowerCase(), websiteUrl: input.websiteUrl || null,
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

export async function listVendorSubmissions(db: Database) {
  const rows = await db.select({ submission: vendorSubmissions, accountEmail: vendorAccounts.email }).from(vendorSubmissions).leftJoin(vendorAccounts, eq(vendorAccounts.id, vendorSubmissions.accountId)).orderBy(desc(vendorSubmissions.updatedAt), desc(vendorSubmissions.id));
  return rows.map((row) => ({ ...deserializeProfile(row.submission), accountEmail: row.accountEmail }));
}

export async function reviewVendorSubmission(db: Database, submissionId: number, decision: "approved" | "rejected" | "changes_requested", note: string, categoryOverride?: string) {
  const submission = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1))[0];
  if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
  const reviewedAt = new Date();
  // Owners can keep a maker's own category or switch it to one on the list when approving.
  const category = categoryOverride || submission.category;
  const markReviewed = db.update(vendorSubmissions).set({ status: decision, adminNote: note || null, reviewedAt, category }).where(eq(vendorSubmissions.id, submissionId));
  if (decision !== "approved") { await markReviewed; return; }

  const account = (await db.select({ email: vendorAccounts.email }).from(vendorAccounts).where(eq(vendorAccounts.id, submission.accountId)).limit(1))[0];
  const profile = {
    ownerAccountId: submission.accountId, name: submission.name, category, shortBio: submission.shortBio,
    ownerBio: submission.ownerBio, ownerName: submission.ownerName, contactEmail: submission.contactEmail, websiteUrl: submission.websiteUrl,
    instagramUrl: submission.instagramUrl, facebookUrl: submission.facebookUrl, tiktokUrl: submission.tiktokUrl,
    coverImageUrl: submission.coverImageUrl, galleryImageUrls: submission.galleryImageUrls, featured: submission.featured,
    displayOrder: submission.displayOrder, active: submission.active, approvedAt: reviewedAt,
  };
  // D1 has no interactive transactions; batch() runs both statements atomically.
  await db.batch([
    markReviewed,
    // A brand new listing belongs to the maker who submitted it. An existing listing keeps the login email the owners set.
    db.insert(vendorProfiles).values({ ...profile, slug: submission.slug, loginEmail: account?.email ?? null }).onConflictDoUpdate({ target: vendorProfiles.slug, set: profile }),
  ]);
}

export async function bulkImportVendorProfiles(db: Database, inputs: OwnerVendorInput[], invitedBy: string) {
  const slugs = inputs.map((input) => input.slug || slugify(input.name));
  if (new Set(slugs).size !== slugs.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The spreadsheet lists the same maker web address more than once. Give each maker a unique name or slug." });
  const existing = slugs.length ? await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(inArray(vendorProfiles.slug, slugs)) : [];
  if (existing.length) throw new TRPCError({ code: "CONFLICT", message: `${existing.length === 1 ? "This maker is" : "These makers are"} already on the site: ${existing.map((item) => item.slug).join(", ")}. Remove ${existing.length === 1 ? "that row" : "those rows"} or edit the existing listing instead.` });
  const inserts = inputs.map((input) => db.insert(vendorProfiles).values({ ...serializeProfile(input), loginEmail: input.loginEmail || null, ownerAccountId: null, approvedAt: new Date() }));
  const [first, ...rest] = inserts;
  if (first) await db.batch([first, ...rest]);
  const invited = await addMakerInvites(db, inputs.map((input) => input.loginEmail).filter(Boolean), invitedBy);
  return { imported: inputs.length, invited, makers: inputs.map((input, index) => ({ name: input.name, slug: slugs[index], loginEmail: input.loginEmail || null })) };
}

/** Owner support: edit a published listing directly (no review step) and set who may edit it. */
export async function updateVendorProfileAsOwner(db: Database, id: number, input: OwnerVendorInput, invitedBy: string) {
  const current = (await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(eq(vendorProfiles.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "That listing no longer exists. Refresh the page." });
  // The web address stays the same so existing links keep working.
  const { slug: _ignored, ...values } = serializeProfile({ ...input, slug: current.slug });
  await db.update(vendorProfiles).set({ ...values, loginEmail: input.loginEmail || null }).where(eq(vendorProfiles.id, id));
  const invited = input.loginEmail ? await addMakerInvites(db, [input.loginEmail], invitedBy) : 0;
  return { slug: current.slug, invited };
}

/**
 * Owner bulk update: applies the same change to several listings in one step.
 * Only the fields provided change. A login email is also added to Maker access.
 */
export async function bulkUpdateVendorProfiles(db: Database, ids: number[], change: { loginEmail?: string; active?: boolean; featured?: boolean }, invitedBy: string) {
  const unique = Array.from(new Set(ids));
  const set: { loginEmail?: string | null; active?: boolean; featured?: boolean } = {};
  if (change.loginEmail !== undefined) set.loginEmail = change.loginEmail.trim().toLowerCase() || null;
  if (change.active !== undefined) set.active = change.active;
  if (change.featured !== undefined) set.featured = change.featured;
  if (!Object.keys(set).length) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose what to change for the selected listings." });
  // D1 allows about 100 values per statement, so large selections run in chunks inside one batch.
  const chunks: number[][] = [];
  for (let start = 0; start < unique.length; start += 90) chunks.push(unique.slice(start, start + 90));
  const statements = chunks.map((chunk) => db.update(vendorProfiles).set(set).where(inArray(vendorProfiles.id, chunk)).returning({ id: vendorProfiles.id, name: vendorProfiles.name, slug: vendorProfiles.slug }));
  const [first, ...rest] = statements;
  const rows = (await db.batch([first, ...rest])).flat();
  if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Those listings no longer exist. Refresh the page." });
  if (set.loginEmail) await addMakerInvites(db, [set.loginEmail], invitedBy);
  return { updated: rows.length, listings: rows };
}

/** Connects a listing to a maker login email (or disconnects it with ""), and invites that email. */
export async function assignListingLogin(db: Database, profileId: number, email: string, invitedBy: string) {
  const normalized = email.trim().toLowerCase();
  const row = (await db.update(vendorProfiles).set({ loginEmail: normalized || null }).where(eq(vendorProfiles.id, profileId)).returning({ name: vendorProfiles.name, slug: vendorProfiles.slug }))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "That listing no longer exists. Refresh the page." });
  if (normalized) await addMakerInvites(db, [normalized], invitedBy);
  return row;
}

/** The listings a maker email may edit, each with its newest unapproved change if there is one. */
export async function listMakerListings(db: Database, email: string, accountId: number) {
  const normalized = email.toLowerCase();
  const profiles = (await db.select().from(vendorProfiles).where(eq(vendorProfiles.loginEmail, normalized)).orderBy(asc(vendorProfiles.name))).map(deserializeProfile);
  const submissions = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.accountId, accountId)).orderBy(desc(vendorSubmissions.updatedAt), desc(vendorSubmissions.id))).map(deserializeProfile);
  const ownedIds = new Set(profiles.map((profile) => profile.id));
  const ownedSlugs = new Set(profiles.map((profile) => profile.slug));
  const listings = profiles.map((profile) => {
    const change = submissions.find((item) => (item.profileId === profile.id || item.slug === profile.slug) && (item.status === "pending" || (item.status !== "approved" && item.updatedAt >= profile.updatedAt))) ?? null;
    return { profile, change };
  });
  // New listings the maker submitted that are not published yet (newest per name).
  const seen = new Set<string>();
  const drafts = submissions.filter((item) => {
    if (item.status === "approved" || (item.profileId && ownedIds.has(item.profileId)) || ownedSlugs.has(item.slug) || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
  return { listings, drafts };
}

/** The listing's web address and owner controlled settings, when this email may edit it. Otherwise null. */
export async function makerOwnsProfile(db: Database, profileId: number, email: string) {
  const row = (await db.select({ loginEmail: vendorProfiles.loginEmail, slug: vendorProfiles.slug, featured: vendorProfiles.featured, displayOrder: vendorProfiles.displayOrder, active: vendorProfiles.active }).from(vendorProfiles).where(eq(vendorProfiles.id, profileId)).limit(1))[0];
  return row && row.loginEmail === email.toLowerCase() ? row : null;
}

/** Picks a web address for a brand new listing that no published listing already uses. */
export async function freeSlugFor(db: Database, name: string) {
  const base = slugify(name) || "maker";
  const taken = new Set((await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(sql`${vendorProfiles.slug} = ${base} OR ${vendorProfiles.slug} LIKE ${`${base}-%`}`)).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
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
  const owned = invites.length ? await db.select({ id: vendorProfiles.id, name: vendorProfiles.name, slug: vendorProfiles.slug, loginEmail: vendorProfiles.loginEmail }).from(vendorProfiles).where(inArray(vendorProfiles.loginEmail, invites.map((invite) => invite.email))).orderBy(asc(vendorProfiles.name)) : [];
  return invites.map((invite) => ({ ...invite, lastSignedIn: lastSeen.get(invite.email) ?? null, listings: owned.filter((listing) => listing.loginEmail === invite.email).map(({ id, name, slug }) => ({ id, name, slug })) }));
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

// Home page product highlights (owner managed). Owners can save up to 12; the home
// page shows the 3 newest that are live (inside their optional start and end dates).
export const MAX_HIGHLIGHTS = 12;
export const HIGHLIGHTS_SHOWN = 3;
export type HighlightInput = { title: string; description: string; category: string; makerSlug?: string | null; imageUrl?: string | null; displayOrder: number; startsAt?: Date | null; endsAt?: Date | null };

async function makerNameFor(db: Database, slug: string | null | undefined) {
  if (!slug) return null;
  const profile = (await db.select({ name: vendorProfiles.name }).from(vendorProfiles).where(eq(vendorProfiles.slug, slug)).limit(1))[0];
  if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "That maker could not be found. Pick another maker or remove the link." });
  return profile.name;
}

export async function listHighlights(db: Database) {
  return db.select().from(productHighlights).orderBy(asc(productHighlights.displayOrder), asc(productHighlights.id));
}

/** Ids of the highlights the home page shows right now: the newest live ones, up to 3. */
export function pickLiveHighlights<T extends { id: number; startsAt: Date | null; endsAt: Date | null; createdAt: Date; displayOrder: number }>(rows: T[], now = new Date()) {
  const live = rows.filter((row) => (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt > now));
  const newest = [...live].sort((a, b) => (b.startsAt ?? b.createdAt).getTime() - (a.startsAt ?? a.createdAt).getTime() || b.id - a.id).slice(0, HIGHLIGHTS_SHOWN);
  return newest.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
}

/** Public: the live highlights, with links only to makers that are still published. */
export async function listPublicHighlights(db: Database) {
  const now = new Date();
  const rows = await db.select().from(productHighlights).where(and(or(isNull(productHighlights.startsAt), lte(productHighlights.startsAt, now)), or(isNull(productHighlights.endsAt), gt(productHighlights.endsAt, now))));
  const shown = pickLiveHighlights(rows, now);
  const slugs = shown.map((row) => row.makerSlug).filter((slug): slug is string => Boolean(slug));
  const active = slugs.length ? new Set((await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(and(inArray(vendorProfiles.slug, slugs), eq(vendorProfiles.active, true)))).map((row) => row.slug)) : new Set<string>();
  return shown.map((row) => ({ ...row, makerSlug: row.makerSlug && active.has(row.makerSlug) ? row.makerSlug : null }));
}

export async function getHighlight(db: Database, id: number) {
  return (await db.select().from(productHighlights).where(eq(productHighlights.id, id)).limit(1))[0] ?? null;
}

export async function createHighlight(db: Database, input: HighlightInput) {
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(productHighlights);
  if (Number(total) >= MAX_HIGHLIGHTS) throw new TRPCError({ code: "BAD_REQUEST", message: `You can save up to ${MAX_HIGHLIGHTS} highlights. Remove an old one before adding another.` });
  const makerName = await makerNameFor(db, input.makerSlug);
  const [row] = await db.insert(productHighlights).values({ ...input, makerSlug: input.makerSlug || null, imageUrl: input.imageUrl || null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, makerName }).returning({ id: productHighlights.id });
  return row.id;
}

export async function updateHighlight(db: Database, id: number, input: HighlightInput) {
  const makerName = await makerNameFor(db, input.makerSlug);
  await db.update(productHighlights).set({ ...input, makerSlug: input.makerSlug || null, imageUrl: input.imageUrl || null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, makerName }).where(eq(productHighlights.id, id));
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

// Vendor interest form submissions.
export const APPLICATION_LIMIT_PER_SOURCE_PER_DAY = 5;

export async function countRecentApplications(db: Database, sourceHash: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(makerApplications).where(and(eq(makerApplications.sourceHash, sourceHash), gt(makerApplications.createdAt, since)));
  return Number(total);
}

export async function createApplication(db: Database, values: Omit<typeof makerApplications.$inferInsert, "id" | "status" | "createdAt">) {
  const [row] = await db.insert(makerApplications).values(values).returning({ id: makerApplications.id });
  return row.id;
}

export async function listApplications(db: Database) {
  const rows = await db.select().from(makerApplications).orderBy(desc(makerApplications.createdAt), desc(makerApplications.id));
  const parse = (value: string) => { try { return JSON.parse(value) as string[]; } catch { return []; } };
  const invited = rows.length ? new Set((await db.select({ email: makerInvites.email }).from(makerInvites).where(inArray(makerInvites.email, Array.from(new Set(rows.map((row) => row.email))).slice(0, 90)))).map((row) => row.email)) : new Set<string>();
  return rows.map(({ sourceHash: _hidden, ...row }) => ({ ...row, categories: parse(row.categories), salesChannels: parse(row.salesChannels), hasAccess: invited.has(row.email) }));
}

export async function getApplication(db: Database, id: number) {
  return (await db.select().from(makerApplications).where(eq(makerApplications.id, id)).limit(1))[0] ?? null;
}

export async function setApplicationStatus(db: Database, id: number, status: "new" | "invited" | "declined" | "archived", note: string) {
  await db.update(makerApplications).set({ status, adminNote: note || null, reviewedAt: status === "new" ? null : new Date() }).where(eq(makerApplications.id, id));
}

// Owners inviting an applicant: start the maker's listing for them.
// Vendor interest form categories mapped to the maker portal's category list.
const APPLICATION_TO_LISTING_CATEGORY: Record<string, string> = {
  "Art": "Paper & Art", "Stationery & Books": "Paper & Art", "Apparel & Accessories": "Wearables", "Baked Goods & Sweets": "Coffee & Bakery",
  "Bath & Body": "Candles & Bath", "Candles & Wax Melts": "Candles & Bath", "Self Care": "Candles & Bath", "Children & Kids": "Kids & Baby",
  "Floral Products": "Plants & Floral", "Food Products": "Food & Pantry", "Home Decor": "Home & Gifts", "Jewelry": "Jewelry",
};

/**
 * Creates a draft listing from an application, tied to the applicant's email, so
 * the first time they sign in their space already has their business filled in.
 * Skips it when that email already has a listing or a draft for the same business
 * (a maker with one listing can still be invited for a second business).
 */
export async function startListingFromApplication(db: Database, application: typeof makerApplications.$inferSelect) {
  const email = application.email.toLowerCase();
  await db.insert(vendorAccounts).values({ email }).onConflictDoNothing();
  const account = (await db.select({ id: vendorAccounts.id }).from(vendorAccounts).where(eq(vendorAccounts.email, email)).limit(1))[0];
  if (!account) return { created: false };
  const slugBase = slugify(application.businessName);
  const existingProfile = (await db.select({ id: vendorProfiles.id }).from(vendorProfiles).where(and(eq(vendorProfiles.loginEmail, email), sql`${vendorProfiles.slug} LIKE ${`${slugBase}%`}`)).limit(1))[0];
  const existingDraft = (await db.select({ id: vendorSubmissions.id }).from(vendorSubmissions).where(and(eq(vendorSubmissions.accountId, account.id), sql`${vendorSubmissions.slug} LIKE ${`${slugBase}%`}`)).limit(1))[0];
  if (existingProfile || existingDraft) return { created: false };
  let categories: string[] = [];
  try { categories = JSON.parse(application.categories); } catch { categories = []; }
  const category = categories.map((item) => APPLICATION_TO_LISTING_CATEGORY[item]).find(Boolean) || "";
  await db.insert(vendorSubmissions).values({
    accountId: account.id, profileId: null, status: "draft", adminNote: null, reviewedAt: null,
    name: application.businessName, slug: await freeSlugFor(db, application.businessName), category, shortBio: application.tagline,
    ownerBio: null, ownerName: application.fullName, contactEmail: email, websiteUrl: application.websiteUrl, instagramUrl: application.instagramUrl,
    facebookUrl: application.facebookUrl, tiktokUrl: null, coverImageUrl: null, galleryImageUrls: "[]", featured: false, displayOrder: 100, active: true,
  });
  return { created: true };
}
