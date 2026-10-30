import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { reviews, vendorProfiles } from "../drizzle/schema";
import { FEATURED_REVIEW_LIMIT, summarize, type ReviewSource } from "../shared/reviews";
import type { Database } from "./db";

export const REVIEW_LIMIT_PER_SOURCE_PER_DAY = 5;

// What the public sees: no name, no email, no owner notes. Reviews are anonymous on the site;
// only owners see the reviewer's name (in the Reviews tab).
const publicFields = { id: reviews.id, profileId: reviews.profileId, makerName: reviews.makerName, rating: reviews.rating, body: reviews.body, reviewerCity: reviews.reviewerCity, photoUrl: reviews.photoUrl, source: reviews.source, createdAt: reviews.createdAt };

export async function countRecentReviews(db: Database, sourceHash: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db.select({ total: sql<number>`count(*)` }).from(reviews).where(and(eq(reviews.sourceHash, sourceHash), gt(reviews.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function publicListing(db: Database, slug: string) {
  return (await db.select({ id: vendorProfiles.id, name: vendorProfiles.name, active: vendorProfiles.active }).from(vendorProfiles).where(eq(vendorProfiles.slug, slug)).limit(1))[0] ?? null;
}

export async function createReview(db: Database, values: typeof reviews.$inferInsert) {
  const [row] = await db.insert(reviews).values(values).returning({ id: reviews.id });
  return row.id;
}

/** Approved reviews for one maker, newest first, with the average rating. */
export async function reviewsForMaker(db: Database, profileId: number) {
  const rows = await db.select(publicFields).from(reviews).where(and(eq(reviews.profileId, profileId), eq(reviews.status, "approved"))).orderBy(desc(reviews.createdAt)).limit(100);
  return { summary: summarize(rows.map((row) => row.rating)), reviews: rows };
}

/** Reviews the owners chose for the home page, with each maker's link. */
export async function featuredReviews(db: Database) {
  const rows = await db.select({ ...publicFields, makerSlug: vendorProfiles.slug, makerActive: vendorProfiles.active }).from(reviews).leftJoin(vendorProfiles, eq(vendorProfiles.id, reviews.profileId)).where(and(eq(reviews.status, "approved"), eq(reviews.featured, true))).orderBy(desc(reviews.reviewedAt)).limit(FEATURED_REVIEW_LIMIT);
  return rows.map((row) => ({ ...row, makerSlug: row.makerActive ? row.makerSlug : null }));
}

export async function listReviewsForOwners(db: Database) {
  return db.select().from(reviews).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(500);
}

export async function setReviewStatus(db: Database, id: number, status: "pending" | "approved" | "rejected", note: string, email: string) {
  const change: Partial<typeof reviews.$inferInsert> = { status, ownerNote: note || null, reviewedBy: email, reviewedAt: new Date() };
  if (status !== "approved") change.featured = false;
  await db.update(reviews).set(change).where(eq(reviews.id, id));
}

export async function setReviewFeatured(db: Database, id: number, featured: boolean) {
  if (featured) {
    const review = (await db.select({ status: reviews.status }).from(reviews).where(eq(reviews.id, id)).limit(1))[0];
    if (review?.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Approve the review before featuring it." });
    const [count] = await db.select({ total: sql<number>`count(*)` }).from(reviews).where(and(eq(reviews.featured, true), eq(reviews.status, "approved")));
    if (Number(count?.total ?? 0) >= FEATURED_REVIEW_LIMIT) throw new TRPCError({ code: "CONFLICT", message: `Up to ${FEATURED_REVIEW_LIMIT} reviews can be on the home page. Remove one first.` });
  }
  await db.update(reviews).set({ featured }).where(eq(reviews.id, id));
}

export async function addOwnerReview(db: Database, input: { profileId: number | null; rating: number; body: string; reviewerName: string; reviewerCity: string; source: ReviewSource }, email: string) {
  const maker = input.profileId ? (await db.select({ name: vendorProfiles.name }).from(vendorProfiles).where(eq(vendorProfiles.id, input.profileId)).limit(1))[0] : null;
  if (input.profileId && !maker) throw new TRPCError({ code: "NOT_FOUND", message: "That maker no longer exists. Refresh the page." });
  return createReview(db, { ...input, reviewerCity: input.reviewerCity || null, makerName: maker?.name ?? null, status: "approved", reviewedBy: email, reviewedAt: new Date() });
}

export async function deleteReview(db: Database, id: number) {
  const row = (await db.select({ photoUrl: reviews.photoUrl }).from(reviews).where(eq(reviews.id, id)).limit(1))[0];
  await db.delete(reviews).where(eq(reviews.id, id));
  return row?.photoUrl ?? null;
}

/** For the maker portal: approved reviews of the listings tied to this email. */
export async function reviewsForMakerEmail(db: Database, email: string) {
  const listings = await db.select({ id: vendorProfiles.id }).from(vendorProfiles).where(eq(vendorProfiles.loginEmail, email.toLowerCase()));
  if (!listings.length) return [];
  return db.select(publicFields).from(reviews).where(and(inArray(reviews.profileId, listings.map((row) => row.id)), eq(reviews.status, "approved"))).orderBy(desc(reviews.createdAt)).limit(200);
}

export async function pendingReviewCount(db: Database) {
  const [row] = await db.select({ total: sql<number>`count(*)` }).from(reviews).where(eq(reviews.status, "pending"));
  return Number(row?.total ?? 0);
}

/** Every approved review for the Reviews page: makers that are public, plus the marketplace itself. */
export async function allApprovedReviews(db: Database) {
  const rows = await db.select({ ...publicFields, makerSlug: vendorProfiles.slug, makerActive: vendorProfiles.active, category: vendorProfiles.category }).from(reviews).leftJoin(vendorProfiles, eq(vendorProfiles.id, reviews.profileId)).where(eq(reviews.status, "approved")).orderBy(desc(reviews.createdAt)).limit(1000);
  // Reviews of makers that were hidden or deleted are left out.
  const shown = rows.filter((row) => row.profileId === null || (row.makerActive && row.makerSlug)).map(({ makerActive: _active, ...row }) => row);
  return { summary: summarize(shown.map((row) => row.rating)), marketplace: summarize(shown.filter((row) => row.profileId === null).map((row) => row.rating)), reviews: shown };
}
