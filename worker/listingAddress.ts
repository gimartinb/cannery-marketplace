import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { listingRedirects, productHighlights, vendorProfiles, vendorSubmissions } from "../drizzle/schema";
import { addressMatchesName } from "../shared/listingAddress";
import { slugify, type Database } from "./db";

// Each maker page lives at /vendors/<address>. The address comes from the business
// name. When a listing is renamed, its address follows the new name and the old
// address keeps working by sending visitors to the new one.

/** A free address for this name, ignoring the listing's own current address. */
async function freeAddressFor(db: Database, name: string, listingId: number) {
  const base = slugify(name) || "maker";
  const rows = await db.select({ id: vendorProfiles.id, slug: vendorProfiles.slug }).from(vendorProfiles).where(sql`${vendorProfiles.slug} = ${base} OR ${vendorProfiles.slug} LIKE ${`${base}-%`}`);
  const taken = new Set(rows.filter((row) => row.id !== listingId).map((row) => row.slug));
  // An old address another listing still redirects from is also taken.
  const redirects = await db.select({ oldSlug: listingRedirects.oldSlug, newSlug: listingRedirects.newSlug }).from(listingRedirects).where(sql`${listingRedirects.oldSlug} = ${base} OR ${listingRedirects.oldSlug} LIKE ${`${base}-%`}`);
  const own = rows.find((row) => row.id === listingId)?.slug;
  for (const row of redirects) if (row.newSlug !== own) taken.add(row.oldSlug);
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Moves a listing to the address that matches its name. Everything that points at the old
 * address (maker drafts, home highlights, earlier redirects) follows, and the old address
 * redirects to the new one. Returns null when the address already matches.
 */
export async function fixListingAddress(db: Database, listingId: number) {
  const listing = (await db.select({ id: vendorProfiles.id, name: vendorProfiles.name, slug: vendorProfiles.slug }).from(vendorProfiles).where(eq(vendorProfiles.id, listingId)).limit(1))[0];
  if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "That listing no longer exists. Refresh the page." });
  if (addressMatchesName(listing.name, listing.slug)) return null;
  const next = await freeAddressFor(db, listing.name, listing.id);
  const old = listing.slug;
  await db.batch([
    db.update(vendorProfiles).set({ slug: next }).where(eq(vendorProfiles.id, listing.id)),
    db.update(vendorSubmissions).set({ slug: next }).where(sql`${vendorSubmissions.slug} = ${old} AND (${vendorSubmissions.profileId} = ${listing.id} OR ${vendorSubmissions.profileId} IS NULL)`),
    db.update(productHighlights).set({ makerSlug: next }).where(eq(productHighlights.makerSlug, old)),
    // Earlier addresses of this listing now go straight to the new one.
    db.update(listingRedirects).set({ newSlug: next }).where(eq(listingRedirects.newSlug, old)),
    db.delete(listingRedirects).where(eq(listingRedirects.oldSlug, next)),
    db.insert(listingRedirects).values({ oldSlug: old, newSlug: next }).onConflictDoUpdate({ target: listingRedirects.oldSlug, set: { newSlug: next } }),
  ]);
  return { id: listing.id, name: listing.name, from: old, to: next };
}

/** Fixes every listing whose address does not match its name. */
export async function fixAllListingAddresses(db: Database) {
  const rows = await db.select({ id: vendorProfiles.id, name: vendorProfiles.name, slug: vendorProfiles.slug }).from(vendorProfiles);
  const fixed = [];
  for (const row of rows) if (!addressMatchesName(row.name, row.slug)) { const result = await fixListingAddress(db, row.id); if (result) fixed.push(result); }
  return fixed;
}

/** Where an old address now lives, or null. */
export async function redirectFor(db: Database, slug: string) {
  return (await db.select({ newSlug: listingRedirects.newSlug }).from(listingRedirects).where(eq(listingRedirects.oldSlug, slug)).limit(1))[0]?.newSlug ?? null;
}
