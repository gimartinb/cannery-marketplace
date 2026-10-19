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

// Owner replacements for the site's named image spots (logo, hero, ...).
// No row means the built-in default image is shown.
export const siteImages = sqliteTable("site_images", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  alt: text("alt"),
  updatedAt: updatedAt(),
});

// The guest list for the maker portal. Cloudflare Access lets anyone request an
// email code; only these emails (plus the owners) can then use the portal.
export const makerInvites = sqliteTable("maker_invites", {
  email: text("email").primaryKey(),
  invitedBy: text("invitedBy").notNull(),
  createdAt: createdAt(),
});

// Home page "Find something with a story" cards, managed by owners (up to 3).
export const productHighlights = sqliteTable("product_highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  makerSlug: text("makerSlug"),
  makerName: text("makerName"),
  imageUrl: text("imageUrl"),
  displayOrder: integer("displayOrder").default(100).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// About page "Inside the Cannery" gallery, managed by owners (up to 12 photos).
export const galleryPhotos = sqliteTable("gallery_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  caption: text("caption"),
  displayOrder: integer("displayOrder").default(100).notNull(),
  createdAt: createdAt(),
});

export type VendorAccount = typeof vendorAccounts.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorSubmission = typeof vendorSubmissions.$inferSelect;
