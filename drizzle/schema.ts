import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Cloudflare D1 (SQLite) schema.
// Sign in is handled by Cloudflare Access, so there are no password or session
// tables. Vendors are identified by the verified email Access gives us.

const now = sql`(unixepoch())`;
const createdAt = () => integer("createdAt", { mode: "timestamp" }).default(now).notNull();
const updatedAt = () => integer("updatedAt", { mode: "timestamp" }).default(now).notNull().$onUpdate(() => new Date());

export const vendorAccounts = sqliteTable("vendor_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }),
}, (table) => [uniqueIndex("vendor_accounts_email_unique").on(table.email)]);

const profileColumns = () => ({
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  shortBio: text("shortBio").notNull(),
  ownerBio: text("ownerBio"),
  contactEmail: text("contactEmail").notNull(),
  websiteUrl: text("websiteUrl"),
  instagramUrl: text("instagramUrl"),
  facebookUrl: text("facebookUrl"),
  tiktokUrl: text("tiktokUrl"),
  coverImageUrl: text("coverImageUrl"),
  galleryImageUrls: text("galleryImageUrls"),
  featured: integer("featured", { mode: "boolean" }).default(false).notNull(),
  displayOrder: integer("displayOrder").default(100).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
});

export const vendorProfiles = sqliteTable("vendor_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerAccountId: integer("ownerAccountId"),
  ...profileColumns(),
  approvedAt: integer("approvedAt", { mode: "timestamp" }).default(now).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("vendor_profiles_slug_unique").on(table.slug)]);

export const vendorSubmissions = sqliteTable("vendor_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("accountId").notNull(),
  profileId: integer("profileId"),
  ...profileColumns(),
  status: text("status", { enum: ["draft", "pending", "approved", "rejected", "changes_requested"] }).default("draft").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: integer("reviewedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export type VendorAccount = typeof vendorAccounts.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorSubmission = typeof vendorSubmissions.$inferSelect;
