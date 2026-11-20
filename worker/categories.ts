import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { makerCategories, productHighlights, vendorProfiles, vendorSubmissions } from "../drizzle/schema";
import { MAKER_CATEGORIES } from "../shared/makerListing";
import type { Database } from "./db";

// The category list makers pick from. Owners add, rename, reorder, and remove
// categories in the Categories tab. "Other" is built in and always last.

const clean = (name: string) => name.trim().replace(/\s+/g, " ");

export function categoryNameProblem(name: string): string | null {
  const value = clean(name);
  if (value.length < 3) return "Use at least 3 characters.";
  if (value.length > 40) return "Keep the category under 40 characters.";
  if (!/^[\p{L}][\p{L}0-9 &',.-]*$/u.test(value)) return "Use letters, numbers, spaces, commas, and &.";
  if (value.toLowerCase() === "other") return "\"Other\" is built in, so choose another name.";
  return null;
}

/** Category names in display order. Falls back to the built in list if the table is empty. */
export async function listCategoryNames(db: Database): Promise<string[]> {
  const rows = await db.select({ name: makerCategories.name }).from(makerCategories).orderBy(asc(makerCategories.displayOrder), asc(makerCategories.name));
  return rows.length ? rows.map((row) => row.name) : MAKER_CATEGORIES.filter((name) => name !== "Other");
}

/** For the owners: every category with how many listings use it, plus categories makers typed themselves. */
export async function listCategoriesForOwners(db: Database) {
  const [rows, usage] = await Promise.all([
    db.select().from(makerCategories).orderBy(asc(makerCategories.displayOrder), asc(makerCategories.name)),
    db.select({ category: vendorProfiles.category, total: sql<number>`count(*)` }).from(vendorProfiles).groupBy(vendorProfiles.category),
  ]);
  const counts = new Map(usage.map((row) => [row.category, Number(row.total)]));
  const listed = new Set(rows.map((row) => row.name));
  return {
    categories: rows.map((row) => ({ id: row.id, name: row.name, listings: counts.get(row.name) ?? 0 })),
    // Categories in use that are not on the list (typed by makers, or left over from an old name).
    unlisted: [...counts.entries()].filter(([name]) => !listed.has(name) && name !== "Other").map(([name, listings]) => ({ name, listings })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function nameTaken(db: Database, name: string, exceptId?: number) {
  const row = (await db.select({ id: makerCategories.id }).from(makerCategories).where(sql`lower(${makerCategories.name}) = ${name.toLowerCase()}`).limit(1))[0];
  return Boolean(row && row.id !== exceptId);
}

export async function addCategory(db: Database, name: string) {
  const value = clean(name);
  const problem = categoryNameProblem(value);
  if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
  if (await nameTaken(db, value)) throw new TRPCError({ code: "CONFLICT", message: `"${value}" is already on the list.` });
  const [last] = await db.select({ order: sql<number>`coalesce(max(${makerCategories.displayOrder}), 0)` }).from(makerCategories);
  await db.insert(makerCategories).values({ name: value, displayOrder: Number(last?.order ?? 0) + 10 });
  return { name: value };
}

/** Renames a category everywhere it is used: listings, maker drafts, and home highlights. */
export async function renameCategory(db: Database, id: number, name: string) {
  const value = clean(name);
  const problem = categoryNameProblem(value);
  if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
  const current = (await db.select().from(makerCategories).where(eq(makerCategories.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "That category no longer exists. Refresh the page." });
  if (current.name === value) return { name: value, moved: 0 };
  if (await nameTaken(db, value, id)) throw new TRPCError({ code: "CONFLICT", message: `"${value}" is already on the list. To combine them, delete one and move its listings.` });
  const [count] = await db.select({ total: sql<number>`count(*)` }).from(vendorProfiles).where(eq(vendorProfiles.category, current.name));
  await db.batch([
    db.update(makerCategories).set({ name: value }).where(eq(makerCategories.id, id)),
    db.update(vendorProfiles).set({ category: value }).where(eq(vendorProfiles.category, current.name)),
    db.update(vendorSubmissions).set({ category: value }).where(eq(vendorSubmissions.category, current.name)),
    db.update(productHighlights).set({ category: value }).where(eq(productHighlights.category, current.name)),
  ]);
  return { name: value, moved: Number(count?.total ?? 0) };
}

/** Removes a category. Listings that used it move to another category (required when any exist). */
export async function deleteCategory(db: Database, id: number, moveTo: string) {
  const current = (await db.select().from(makerCategories).where(eq(makerCategories.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "That category no longer exists. Refresh the page." });
  const [count] = await db.select({ total: sql<number>`count(*)` }).from(vendorProfiles).where(eq(vendorProfiles.category, current.name));
  const inUse = Number(count?.total ?? 0);
  const target = clean(moveTo);
  if (inUse && !target) throw new TRPCError({ code: "BAD_REQUEST", message: `${inUse} listing${inUse === 1 ? " uses" : "s use"} "${current.name}". Choose a category to move ${inUse === 1 ? "it" : "them"} to.` });
  if (target && target === current.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a different category to move the listings to." });
  if (target && !(await nameTaken(db, target))) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a category from the list to move the listings to." });
  const statements = [db.delete(makerCategories).where(eq(makerCategories.id, id))];
  if (target) statements.push(
    db.update(vendorProfiles).set({ category: target }).where(eq(vendorProfiles.category, current.name)) as never,
    db.update(vendorSubmissions).set({ category: target }).where(eq(vendorSubmissions.category, current.name)) as never,
    db.update(productHighlights).set({ category: target }).where(eq(productHighlights.category, current.name)) as never,
  );
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return { moved: inUse, to: target || null };
}

/** Saves a new order (ids from first to last). */
export async function reorderCategories(db: Database, ids: number[]) {
  if (!ids.length) return;
  await db.batch(ids.map((id, index) => db.update(makerCategories).set({ displayOrder: (index + 1) * 10 }).where(eq(makerCategories.id, id))) as unknown as Parameters<typeof db.batch>[0]);
}

/** Adds a maker's own category (from the review queue) to the list. */
export async function adoptCategory(db: Database, name: string) {
  const value = clean(name);
  if (await nameTaken(db, value)) return { name: value };
  return addCategory(db, value);
}
