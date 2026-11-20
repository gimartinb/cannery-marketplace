import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { featuredHistory, vendorProfiles } from "../drizzle/schema";
import type { Database } from "./db";

// The home page and the Makers page spotlight show 3 featured makers. Owners pick
// them with a checkbox; a 4th asks which one to swap out. Every feature is logged
// so owners can see who has had a turn and who is still waiting.
export const FEATURED_LIMIT = 3;

/** Makes the log match the listings: opens a turn for newly featured makers and closes ended ones. */
export async function syncFeaturedHistory(db: Database, email = "owner") {
  const [featured, open] = await Promise.all([
    db.select({ id: vendorProfiles.id, name: vendorProfiles.name }).from(vendorProfiles).where(eq(vendorProfiles.featured, true)),
    db.select({ id: featuredHistory.id, profileId: featuredHistory.profileId }).from(featuredHistory).where(isNull(featuredHistory.endedAt)),
  ]);
  const featuredIds = new Set(featured.map((row) => row.id));
  const openIds = new Set(open.map((row) => row.profileId));
  const statements = [
    ...featured.filter((row) => !openIds.has(row.id)).map((row) => db.insert(featuredHistory).values({ profileId: row.id, name: row.name, startedBy: email })),
    ...open.filter((row) => !featuredIds.has(row.profileId)).map((row) => db.update(featuredHistory).set({ endedAt: new Date() }).where(eq(featuredHistory.id, row.id))),
  ];
  if (statements.length) await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
}

async function featuredNow(db: Database) {
  return db.select({ id: vendorProfiles.id, name: vendorProfiles.name }).from(vendorProfiles).where(eq(vendorProfiles.featured, true));
}

/** Refuses a change that would feature more than 3 makers, naming the current ones. */
export async function assertFeaturedRoom(db: Database, turningOn: number[]) {
  const current = await featuredNow(db);
  const after = new Set([...current.map((row) => row.id), ...turningOn]);
  if (after.size > FEATURED_LIMIT) throw new TRPCError({ code: "CONFLICT", message: `Only ${FEATURED_LIMIT} makers can be featured at a time. Featured now: ${current.map((row) => row.name).join(", ")}. Unfeature one first, or use Swap in Featured makers.` });
}

/** Features or unfeatures one maker; replaceId swaps out a featured maker in the same step. */
export async function setFeatured(db: Database, id: number, on: boolean, email: string, replaceId?: number) {
  if (on) {
    // Check the limit as if the swap had happened, then make both changes together.
    const current = (await featuredNow(db)).filter((row) => row.id !== replaceId);
    const after = new Set([...current.map((row) => row.id), id]);
    if (after.size > FEATURED_LIMIT) throw new TRPCError({ code: "CONFLICT", message: `Only ${FEATURED_LIMIT} makers can be featured at a time. Featured now: ${current.map((row) => row.name).join(", ")}. Choose who to swap out.` });
    await db.batch([
      ...(replaceId ? [db.update(vendorProfiles).set({ featured: false }).where(eq(vendorProfiles.id, replaceId))] : []),
      db.update(vendorProfiles).set({ featured: true }).where(eq(vendorProfiles.id, id)),
    ] as unknown as Parameters<typeof db.batch>[0]);
  } else {
    await db.update(vendorProfiles).set({ featured: false }).where(eq(vendorProfiles.id, id));
  }
  await syncFeaturedHistory(db, email);
}

/** Everything the Featured makers card needs. */
export async function featuredOverview(db: Database) {
  await syncFeaturedHistory(db);
  const [listings, history] = await Promise.all([
    db.select({ id: vendorProfiles.id, name: vendorProfiles.name, slug: vendorProfiles.slug, category: vendorProfiles.category, active: vendorProfiles.active, featured: vendorProfiles.featured, coverImageUrl: vendorProfiles.coverImageUrl }).from(vendorProfiles),
    db.select().from(featuredHistory).orderBy(desc(featuredHistory.startedAt), desc(featuredHistory.id)).limit(500),
  ]);
  const byProfile = new Map<number, typeof history>();
  for (const row of history) byProfile.set(row.profileId, [...(byProfile.get(row.profileId) ?? []), row]);
  const now = Date.now();
  const days = (from: Date, to: Date | null) => Math.max(1, Math.round(((to?.getTime() ?? now) - from.getTime()) / 86_400_000));
  const makers = listings.map((row) => {
    const turns = byProfile.get(row.id) ?? [];
    const open = turns.find((turn) => !turn.endedAt);
    const lastEnded = turns.find((turn) => turn.endedAt);
    return { ...row, featuredSince: open?.startedAt ?? null, lastFeaturedAt: open ? null : lastEnded?.endedAt ?? null, timesFeatured: turns.length, daysFeatured: turns.reduce((sum, turn) => sum + days(turn.startedAt, turn.endedAt), 0) };
  });
  // Waiting longest first: never featured, then the longest since their last turn.
  const waiting = makers.filter((row) => !row.featured && row.active).sort((a, b) => (a.lastFeaturedAt ? a.lastFeaturedAt.getTime() : 0) - (b.lastFeaturedAt ? b.lastFeaturedAt.getTime() : 0) || a.name.localeCompare(b.name));
  return {
    limit: FEATURED_LIMIT,
    current: makers.filter((row) => row.featured).sort((a, b) => (a.featuredSince?.getTime() ?? 0) - (b.featuredSince?.getTime() ?? 0)),
    waiting,
    history: history.filter((row) => row.endedAt).slice(0, 60).map((row) => ({ id: row.id, profileId: row.profileId, name: row.name, startedAt: row.startedAt, endedAt: row.endedAt, days: days(row.startedAt, row.endedAt) })),
    neverFeatured: waiting.filter((row) => !row.timesFeatured).length,
  };
}

/** Unfeatures any listings past the limit (keeps the earliest featured). Used after imports. */
export async function trimFeatured(db: Database) {
  const open = await db.select({ profileId: featuredHistory.profileId }).from(featuredHistory).where(isNull(featuredHistory.endedAt)).orderBy(featuredHistory.startedAt);
  const featured = await featuredNow(db);
  if (featured.length <= FEATURED_LIMIT) return;
  const order = [...open.map((row) => row.profileId), ...featured.map((row) => row.id)];
  const keep = new Set(order.filter((id, index) => order.indexOf(id) === index && featured.some((row) => row.id === id)).slice(0, FEATURED_LIMIT));
  const drop = featured.filter((row) => !keep.has(row.id)).map((row) => row.id);
  if (drop.length) await db.update(vendorProfiles).set({ featured: false }).where(and(inArray(vendorProfiles.id, drop), eq(vendorProfiles.featured, true)));
}
