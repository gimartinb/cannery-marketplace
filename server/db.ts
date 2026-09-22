import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminCredentials, credentialSessions, InsertUser, siteSettings, users,
  vendorAccounts, vendorProfiles, vendorSubmissions,
} from "../drizzle/schema";
import type { VendorProfileInput } from "../shared/vendorProfile";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL); return _db; }
async function requireDb() { const db = await getDb(); if (!db) throw new Error("Database is not available"); return db; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ||= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) { const db = await requireDb(); return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0]; }

export async function getAdminCount() { const db = await requireDb(); const [row] = await db.select({ count: sql<number>`count(*)` }).from(adminCredentials); return Number(row?.count || 0); }
export async function getAdminByUsername(username: string) { const db = await requireDb(); return (await db.select().from(adminCredentials).where(eq(adminCredentials.username, username.toLowerCase())).limit(1))[0]; }
export async function createAdminCredential(username: string, passwordHash: string) { const db = await requireDb(); const result = await db.insert(adminCredentials).values({ username: username.toLowerCase(), passwordHash }); return Number(result[0].insertId); }
export async function recordAdminLogin(id: number, success: boolean, failedAttempts = 0) { const db = await requireDb(); if (success) await db.update(adminCredentials).set({ failedAttempts: 0, lockedUntil: null, lastSignedIn: new Date() }).where(eq(adminCredentials.id, id)); else { const next = failedAttempts + 1; await db.update(adminCredentials).set({ failedAttempts: next, lockedUntil: next >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null }).where(eq(adminCredentials.id, id)); } }

export async function getVendorAccountByEmail(email: string) { const db = await requireDb(); return (await db.select().from(vendorAccounts).where(eq(vendorAccounts.email, email.toLowerCase())).limit(1))[0]; }
export async function createVendorAccount(email: string, passwordHash: string) { const db = await requireDb(); const result = await db.insert(vendorAccounts).values({ email: email.toLowerCase(), passwordHash }); return Number(result[0].insertId); }
export async function recordVendorLogin(id: number) { const db = await requireDb(); await db.update(vendorAccounts).set({ lastSignedIn: new Date() }).where(eq(vendorAccounts.id, id)); }

export async function insertCredentialSession(input: { tokenHash: string; accountType: "admin" | "vendor"; accountId: number; expiresAt: Date }) { const db = await requireDb(); await db.insert(credentialSessions).values(input); }
export async function getCredentialSessionByHash(tokenHash: string) { const db = await requireDb(); return (await db.select().from(credentialSessions).where(and(eq(credentialSessions.tokenHash, tokenHash), gt(credentialSessions.expiresAt, new Date()))).limit(1))[0]; }
export async function deleteCredentialSession(tokenHash: string) { const db = await requireDb(); await db.delete(credentialSessions).where(eq(credentialSessions.tokenHash, tokenHash)); }

export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function serializeProfile(input: VendorProfileInput) { return { slug: input.slug || slugify(input.name), name: input.name, category: input.category, shortBio: input.shortBio, ownerBio: input.ownerBio || null, contactEmail: input.contactEmail.toLowerCase(), websiteUrl: input.websiteUrl || null, instagramUrl: input.instagramUrl || null, facebookUrl: input.facebookUrl || null, tiktokUrl: input.tiktokUrl || null, coverImageUrl: input.coverImageUrl || null, galleryImageUrls: JSON.stringify(input.galleryImageUrls || []), featured: input.featured, displayOrder: input.displayOrder, active: input.active }; }
function deserializeProfile<T extends { galleryImageUrls: string | null }>(row: T) { let galleryImageUrls: string[] = []; try { galleryImageUrls = JSON.parse(row.galleryImageUrls || "[]"); } catch { galleryImageUrls = []; } return { ...row, galleryImageUrls }; }

export async function listPublicVendorProfiles() { const db = await requireDb(); const rows = await db.select().from(vendorProfiles).where(eq(vendorProfiles.active, true)).orderBy(vendorProfiles.displayOrder, vendorProfiles.name); return rows.map(deserializeProfile); }
export async function getPublicVendorProfile(slug: string) { const db = await requireDb(); const row = (await db.select().from(vendorProfiles).where(and(eq(vendorProfiles.slug, slug), eq(vendorProfiles.active, true))).limit(1))[0]; return row ? deserializeProfile(row) : null; }
export async function listAllVendorProfiles() { const db = await requireDb(); return (await db.select().from(vendorProfiles).orderBy(vendorProfiles.displayOrder, vendorProfiles.name)).map(deserializeProfile); }
export async function setVendorActive(id: number, active: boolean) { const db = await requireDb(); await db.update(vendorProfiles).set({ active }).where(eq(vendorProfiles.id, id)); }

export async function createVendorSubmission(accountId: number, input: VendorProfileInput) { const db = await requireDb(); const data = serializeProfile(input); const result = await db.insert(vendorSubmissions).values({ ...data, accountId, profileId: input.profileId || null, status: "pending", adminNote: null, reviewedAt: null }); return Number(result[0].insertId); }
export async function getLatestVendorSubmission(accountId: number) { const db = await requireDb(); const row = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.accountId, accountId)).orderBy(desc(vendorSubmissions.updatedAt)).limit(1))[0]; return row ? deserializeProfile(row) : null; }
export async function listVendorSubmissions() { const db = await requireDb(); return (await db.select().from(vendorSubmissions).orderBy(desc(vendorSubmissions.updatedAt))).map(deserializeProfile); }

export async function reviewVendorSubmission(submissionId: number, decision: "approved" | "rejected" | "changes_requested", note: string, reviewerId: number) {
  const db = await requireDb();
  const submission = (await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1))[0];
  if (!submission) throw new Error("Submission not found");
  await db.transaction(async (tx) => {
    await tx.update(vendorSubmissions).set({ status: decision, adminNote: note || null, reviewedAt: new Date() }).where(eq(vendorSubmissions.id, submissionId));
    if (decision === "approved") await tx.insert(vendorProfiles).values({ ownerAccountId: submission.accountId, slug: submission.slug, name: submission.name, category: submission.category, shortBio: submission.shortBio, ownerBio: submission.ownerBio, contactEmail: submission.contactEmail, websiteUrl: submission.websiteUrl, instagramUrl: submission.instagramUrl, facebookUrl: submission.facebookUrl, tiktokUrl: submission.tiktokUrl, coverImageUrl: submission.coverImageUrl, galleryImageUrls: submission.galleryImageUrls, featured: submission.featured, displayOrder: submission.displayOrder, active: submission.active, approvedAt: new Date() }).onDuplicateKeyUpdate({ set: { ownerAccountId: submission.accountId, name: submission.name, category: submission.category, shortBio: submission.shortBio, ownerBio: submission.ownerBio, contactEmail: submission.contactEmail, websiteUrl: submission.websiteUrl, instagramUrl: submission.instagramUrl, facebookUrl: submission.facebookUrl, tiktokUrl: submission.tiktokUrl, coverImageUrl: submission.coverImageUrl, galleryImageUrls: submission.galleryImageUrls, featured: submission.featured, displayOrder: submission.displayOrder, active: submission.active, approvedAt: new Date() } });
  });
  return { reviewerId };
}

export async function bulkImportVendorProfiles(inputs: VendorProfileInput[]) {
  const db = await requireDb();
  const slugs = inputs.map((input) => input.slug || slugify(input.name));
  if (new Set(slugs).size !== slugs.length) throw new Error("The import contains duplicate slugs.");
  const existing = slugs.length ? await db.select({ slug: vendorProfiles.slug }).from(vendorProfiles).where(inArray(vendorProfiles.slug, slugs)) : [];
  if (existing.length) throw new Error(`Duplicate vendor slug${existing.length === 1 ? "" : "s"}: ${existing.map((item) => item.slug).join(", ")}`);
  await db.transaction(async (tx) => { for (const input of inputs) { const data = serializeProfile(input); await tx.insert(vendorProfiles).values({ ...data, ownerAccountId: null, approvedAt: new Date() }); } });
  return inputs.length;
}

export async function getSiteSetting(key: string, fallback: string) { const db = await requireDb(); return (await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1))[0]?.value ?? fallback; }
export async function setSiteSetting(key: string, value: string) { const db = await requireDb(); await db.insert(siteSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } }); }
