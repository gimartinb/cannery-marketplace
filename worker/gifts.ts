import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { giftBoxes, giftRequests } from "../drizzle/schema";
import { commerceSettingsSchema, DEFAULT_COMMERCE, priceToCents, type CommerceSettings, type GiftBoxInput } from "../shared/gifts";
import { getSiteSetting, setSiteSetting, slugify, type Database } from "./db";
import type { Env } from "./env";

export async function getCommerceSettings(db: Database): Promise<CommerceSettings> {
  try { return commerceSettingsSchema.parse(JSON.parse(await getSiteSetting(db, "commerce", "{}"))); }
  catch { return DEFAULT_COMMERCE; }
}

export async function setCommerceSettings(db: Database, settings: CommerceSettings) {
  await setSiteSetting(db, "commerce", JSON.stringify(settings));
}

/**
 * Where a box's Buy button goes. Phase 1: the link the owners pasted from their point of sale.
 * Phase 2 (Square API): when SQUARE_ACCESS_TOKEN and a location are set, this is where a
 * checkout link would be created from the box's Square catalog id instead (Square Checkout API,
 * CreatePaymentLink). Until then, a box without a pasted link shows "Ask about this box".
 */
export function checkoutLinkFor(box: { checkoutUrl: string | null }, settings: CommerceSettings): string | null {
  if (settings.provider === "none") return null;
  return box.checkoutUrl || null;
}

/** True once phase 2 has what it needs. Shown to owners on the Gifts tab. */
export function squareApiReady(env: Env, settings: CommerceSettings) {
  return Boolean(env.SQUARE_ACCESS_TOKEN && settings.squareLocationId);
}

export async function listGiftBoxes(db: Database) {
  return db.select().from(giftBoxes).orderBy(asc(giftBoxes.displayOrder), asc(giftBoxes.name));
}

/** What shoppers see: active boxes that are not corporate only, with the checkout link worked out. */
export async function listPublicGiftBoxes(db: Database) {
  const [rows, settings] = await Promise.all([
    db.select().from(giftBoxes).where(and(eq(giftBoxes.active, true), eq(giftBoxes.corporateOnly, false))).orderBy(asc(giftBoxes.displayOrder), asc(giftBoxes.name)),
    getCommerceSettings(db),
  ]);
  return {
    providerName: settings.provider === "none" ? "" : settings.providerName || (settings.provider.startsWith("square") ? "Square" : ""),
    pickupNote: settings.pickupNote,
    boxes: rows.map((row) => ({ slug: row.slug, name: row.name, price: row.price, description: row.description, details: row.details, imageUrl: row.imageUrl, checkoutUrl: checkoutLinkFor(row, settings) })),
  };
}

/** Box names for the corporate form's "Start from a box" choice (corporate only boxes included). */
export async function listGiftBoxChoices(db: Database) {
  return db.select({ slug: giftBoxes.slug, name: giftBoxes.name, price: giftBoxes.price }).from(giftBoxes).where(eq(giftBoxes.active, true)).orderBy(asc(giftBoxes.displayOrder), asc(giftBoxes.name));
}

async function freeGiftSlug(db: Database, name: string, exceptId?: number) {
  const base = slugify(name) || "gift-box";
  for (let suffix = 1; suffix < 200; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    const taken = (await db.select({ id: giftBoxes.id }).from(giftBoxes).where(eq(giftBoxes.slug, slug)).limit(1))[0];
    if (!taken || taken.id === exceptId) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function saveGiftBox(db: Database, input: GiftBoxInput) {
  const values = {
    name: input.name, price: input.price, priceCents: priceToCents(input.price), description: input.description, details: input.details || null,
    imageUrl: input.imageUrl || null, checkoutUrl: input.checkoutUrl || null, externalItemId: input.externalItemId || null, externalVariationId: input.externalVariationId || null,
    corporateOnly: input.corporateOnly, active: input.active, displayOrder: input.displayOrder,
  };
  if (input.id) {
    const current = (await db.select().from(giftBoxes).where(eq(giftBoxes.id, input.id)).limit(1))[0];
    if (!current) return null;
    await db.update(giftBoxes).set({ ...values, slug: current.name === input.name ? current.slug : await freeGiftSlug(db, input.name, input.id) }).where(eq(giftBoxes.id, input.id));
    return { id: input.id, previousImage: current.imageUrl };
  }
  const [row] = await db.insert(giftBoxes).values({ ...values, slug: await freeGiftSlug(db, input.name) }).returning({ id: giftBoxes.id });
  return { id: row.id, previousImage: null };
}

export async function deleteGiftBox(db: Database, id: number) {
  const current = (await db.select().from(giftBoxes).where(eq(giftBoxes.id, id)).limit(1))[0];
  await db.delete(giftBoxes).where(eq(giftBoxes.id, id));
  return current ?? null;
}

// Corporate and custom gift requests.
export const GIFT_REQUEST_LIMIT_PER_SOURCE_PER_DAY = 5;

export async function countRecentGiftRequests(db: Database, sourceHash: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db.select({ total: sql<number>`count(*)` }).from(giftRequests).where(and(eq(giftRequests.sourceHash, sourceHash), gt(giftRequests.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function createGiftRequest(db: Database, values: typeof giftRequests.$inferInsert) {
  const [row] = await db.insert(giftRequests).values(values).returning({ id: giftRequests.id });
  return row.id;
}

export async function listGiftRequests(db: Database) {
  const rows = await db.select().from(giftRequests).orderBy(desc(giftRequests.createdAt), desc(giftRequests.id)).limit(500);
  const list = (value: string) => { try { return JSON.parse(value) as string[]; } catch { return []; } };
  return rows.map((row) => ({ ...row, branding: list(row.branding), preferredCategories: list(row.preferredCategories) }));
}

export async function updateGiftRequest(db: Database, id: number, change: { status: (typeof giftRequests.$inferSelect)["status"]; adminNote: string; quoteAmount: string; externalOrderId: string }) {
  await db.update(giftRequests).set({ status: change.status, adminNote: change.adminNote || null, quoteAmount: change.quoteAmount || null, externalOrderId: change.externalOrderId || null }).where(eq(giftRequests.id, id));
}
