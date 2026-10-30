import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  // The person behind the business, shown as "Meet <name>" on the profile.
  ownerName: text("ownerName"),
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
  // The maker email that may edit this listing in the maker portal. One email can own several listings.
  loginEmail: text("loginEmail"),
  ...profileColumns(),
  approvedAt: integer("approvedAt", { mode: "timestamp" }).default(now).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("vendor_profiles_slug_unique").on(table.slug), index("vendor_profiles_login_email_idx").on(table.loginEmail)]);

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

// An owner's unpublished change to an image spot (Edit pages, Draft then Publish).
// url null means "back to the original image" once published.
export const siteImageDrafts = sqliteTable("site_image_drafts", {
  id: text("id").primaryKey(),
  url: text("url"),
  alt: text("alt"),
  draftBy: text("draftBy"),
  updatedAt: updatedAt(),
});

// The guest list for the maker portal. Cloudflare Access lets anyone request an
// email code; only these emails (plus the owners) can then use the portal.
export const makerInvites = sqliteTable("maker_invites", {
  email: text("email").primaryKey(),
  invitedBy: text("invitedBy").notNull(),
  createdAt: createdAt(),
});

// Home page "Find something with a story" cards, managed by owners. The home page
// shows up to 3 that are live (inside their optional start and end dates).
export const productHighlights = sqliteTable("product_highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  makerSlug: text("makerSlug"),
  makerName: text("makerName"),
  imageUrl: text("imageUrl"),
  displayOrder: integer("displayOrder").default(100).notNull(),
  startsAt: integer("startsAt", { mode: "timestamp" }),
  endsAt: integer("endsAt", { mode: "timestamp" }),
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

// How many times each maker used the AI writing helper per day (UTC), to stay
// inside Cloudflare's free Workers AI allowance.
export const aiUsage = sqliteTable("ai_usage", {
  email: text("email").notNull(),
  day: text("day").notNull(),
  count: integer("count").default(0).notNull(),
}, (table) => [primaryKey({ columns: [table.email, table.day] })]);

// Maker application submissions (replaces the Google Form). Owners review them
// in the Applications tab and can invite an applicant to the maker portal.
export const makerApplications = sqliteTable("maker_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessName: text("businessName").notNull(),
  address: text("address").notNull(),
  websiteUrl: text("websiteUrl"),
  facebookUrl: text("facebookUrl"),
  instagramUrl: text("instagramUrl"),
  otherSocial: text("otherSocial"),
  tagline: text("tagline").notNull(),
  productDescription: text("productDescription").notNull(),
  fullName: text("fullName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  referredBy: text("referredBy").notNull(),
  categories: text("categories").notNull(),
  salesChannels: text("salesChannels").notNull(),
  status: text("status", { enum: ["new", "invited", "declined", "archived"] }).default("new").notNull(),
  adminNote: text("adminNote"),
  // A one way hash of the sender's network address, only to slow down spam.
  sourceHash: text("sourceHash"),
  reviewedAt: integer("reviewedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
}, (table) => [index("maker_applications_status_idx").on(table.status), index("maker_applications_source_idx").on(table.sourceHash, table.createdAt)]);

export type VendorAccount = typeof vendorAccounts.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorSubmission = typeof vendorSubmissions.$inferSelect;

// Site text editor. A row exists only for text an owner has edited.
// published: what the site shows (null = the original wording in shared/siteText.ts).
// draft: saved but not yet published (null = no draft).
export const siteText = sqliteTable("site_text", {
  key: text("key").primaryKey(),
  draft: text("draft"),
  published: text("published"),
  draftBy: text("draftBy"),
  publishedBy: text("publishedBy"),
  publishedAt: integer("publishedAt", { mode: "timestamp" }),
  updatedAt: updatedAt(),
});

// Every publish, so an owner can bring back an earlier wording.
export const siteTextHistory = sqliteTable("site_text_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  // The text that was published. An empty string means "back to the original".
  text: text("text").notNull(),
  publishedBy: text("publishedBy"),
  publishedAt: createdAt(),
}, (table) => [index("site_text_history_key_idx").on(table.key, table.id)]);

// Gift boxes (hidden until the owners turn gift boxes on). Checkout is a link to
// the store's payment provider, so this works with Square or any future system.
export const giftBoxes = sqliteTable("gift_boxes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  priceCents: integer("priceCents"),
  description: text("description").notNull(),
  details: text("details"),
  imageUrl: text("imageUrl"),
  // A Square Payment Link, Square Online item page, or any provider's checkout page.
  checkoutUrl: text("checkoutUrl"),
  // The item's id in the point of sale catalog (for example a Square catalog item id), for phase 2.
  externalItemId: text("externalItemId"),
  externalVariationId: text("externalVariationId"),
  corporateOnly: integer("corporateOnly", { mode: "boolean" }).default(false).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  displayOrder: integer("displayOrder").default(100).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("gift_boxes_slug_unique").on(table.slug)]);

// Corporate and custom gift requests from /request-a-quote.
export const giftRequests = sqliteTable("gift_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  contactName: text("contactName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  quantity: integer("quantity").notNull(),
  budgetPerGift: text("budgetPerGift").notNull(),
  neededBy: text("neededBy"),
  deliveryMethod: text("deliveryMethod").notNull(),
  destinations: text("destinations"),
  branding: text("branding").notNull(),
  cardMessage: text("cardMessage"),
  logoLink: text("logoLink"),
  startingBox: text("startingBox"),
  customBox: integer("customBox", { mode: "boolean" }).default(false).notNull(),
  preferredCategories: text("preferredCategories").notNull(),
  preferredMakers: text("preferredMakers"),
  message: text("message").notNull(),
  status: text("status", { enum: ["new", "quoted", "won", "lost", "archived"] }).default("new").notNull(),
  adminNote: text("adminNote"),
  quoteAmount: text("quoteAmount"),
  // The invoice or order id in the point of sale (for example a Square invoice id), for phase 2.
  externalOrderId: text("externalOrderId"),
  sourceHash: text("sourceHash"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("gift_requests_status_idx").on(table.status), index("gift_requests_source_idx").on(table.sourceHash, table.createdAt)]);

// Owner edits to the email templates in shared/emailTemplates.ts (no row = the original wording).
export const emailTemplates = sqliteTable("email_templates", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedBy: text("updatedBy"),
  updatedAt: updatedAt(),
});

// Every email the site sent (or tried to), for the owners' sent log and the daily limit.
export const emailLog = sqliteTable("email_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  template: text("template").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  status: text("status", { enum: ["sent", "failed"] }).notNull(),
  error: text("error"),
  providerId: text("providerId"),
  about: text("about"),
  sentBy: text("sentBy"),
  createdAt: createdAt(),
}, (table) => [index("email_log_created_idx").on(table.createdAt)]);

// The category list makers pick from (owners manage it in the Categories tab).
// "Other" is built in and is not stored here.
export const makerCategories = sqliteTable("maker_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  displayOrder: integer("displayOrder").default(100).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("maker_categories_name_unique").on(table.name)]);

// Old maker page addresses that now point to a listing's current address,
// so shared links keep working after a listing is renamed.
export const listingRedirects = sqliteTable("listing_redirects", {
  oldSlug: text("oldSlug").primaryKey(),
  newSlug: text("newSlug").notNull(),
  createdAt: createdAt(),
});

// Who has been featured on the home page and Makers page, and when, so owners can
// give every maker a turn. endedAt null means featured right now.
export const featuredHistory = sqliteTable("featured_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profileId").notNull(),
  name: text("name").notNull(),
  startedAt: integer("startedAt", { mode: "timestamp" }).default(now).notNull(),
  endedAt: integer("endedAt", { mode: "timestamp" }),
  startedBy: text("startedBy"),
}, (table) => [index("featured_history_profile_idx").on(table.profileId, table.startedAt)]);
