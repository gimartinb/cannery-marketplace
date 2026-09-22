import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const vendorAccounts = mysqlTable("vendor_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
}, (table) => [uniqueIndex("vendor_accounts_email_unique").on(table.email)]);

export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 80 }).notNull(),
  passwordHash: text("passwordHash").notNull(),
  failedAttempts: int("failedAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
}, (table) => [uniqueIndex("admin_credentials_username_unique").on(table.username)]);

export const credentialSessions = mysqlTable("credential_sessions", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  accountType: mysqlEnum("accountType", ["admin", "vendor"]).notNull(),
  accountId: int("accountId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("credential_sessions_token_unique").on(table.tokenHash)]);

export const vendorProfiles = mysqlTable("vendor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId"),
  slug: varchar("slug", { length: 160 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  shortBio: text("shortBio").notNull(),
  ownerBio: text("ownerBio"),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  facebookUrl: varchar("facebookUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  coverImageUrl: varchar("coverImageUrl", { length: 700 }),
  galleryImageUrls: text("galleryImageUrls"),
  featured: boolean("featured").default(false).notNull(),
  displayOrder: int("displayOrder").default(100).notNull(),
  active: boolean("active").default(true).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("vendor_profiles_slug_unique").on(table.slug)]);

export const vendorSubmissions = mysqlTable("vendor_submissions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  profileId: int("profileId"),
  name: varchar("name", { length: 140 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  shortBio: text("shortBio").notNull(),
  ownerBio: text("ownerBio"),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  facebookUrl: varchar("facebookUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  coverImageUrl: varchar("coverImageUrl", { length: 700 }),
  galleryImageUrls: text("galleryImageUrls"),
  featured: boolean("featured").default(false).notNull(),
  displayOrder: int("displayOrder").default(100).notNull(),
  active: boolean("active").default(true).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "changes_requested"]).default("draft").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type VendorAccount = typeof vendorAccounts.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorSubmission = typeof vendorSubmissions.$inferSelect;
