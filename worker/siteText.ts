import { TRPCError } from "@trpc/server";
import { desc, eq, inArray, isNotNull } from "drizzle-orm";
import { siteText, siteTextHistory } from "../drizzle/schema";
import { SITE_TEXT_BY_KEY, siteTextProblem } from "../shared/siteText";
import type { Database } from "./db";

/** Published wording that differs from the original, keyed by text id. The site uses the original for the rest. */
export async function publishedSiteText(db: Database): Promise<Record<string, string>> {
  const rows = await db.select({ key: siteText.key, published: siteText.published }).from(siteText).where(isNotNull(siteText.published));
  return Object.fromEntries(rows.filter((row) => row.published !== null && SITE_TEXT_BY_KEY.has(row.key)).map((row) => [row.key, row.published as string]));
}

/** What the site would show if every draft were published (for Preview). */
export async function previewSiteText(db: Database): Promise<Record<string, string>> {
  const rows = await db.select().from(siteText);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (!SITE_TEXT_BY_KEY.has(row.key)) continue;
    const value = row.draft ?? row.published;
    if (value !== null) result[row.key] = value;
  }
  return result;
}

/** Everything the Site text tab needs: each edited row plus its recent publishes. */
export async function listSiteTextForOwners(db: Database) {
  const [rows, history] = await Promise.all([
    db.select().from(siteText),
    db.select().from(siteTextHistory).orderBy(desc(siteTextHistory.id)).limit(600),
  ]);
  const byKey: Record<string, Array<{ id: number; text: string; publishedBy: string | null; publishedAt: Date }>> = {};
  for (const entry of history) {
    const list = (byKey[entry.key] ??= []);
    if (list.length < 6) list.push({ id: entry.id, text: entry.text, publishedBy: entry.publishedBy, publishedAt: entry.publishedAt });
  }
  return {
    rows: rows.filter((row) => SITE_TEXT_BY_KEY.has(row.key)).map((row) => ({ key: row.key, draft: row.draft, published: row.published, draftBy: row.draftBy, publishedBy: row.publishedBy, publishedAt: row.publishedAt, updatedAt: row.updatedAt })),
    history: byKey,
  };
}

function check(key: string, text: string) {
  const problem = siteTextProblem(key, text);
  if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
  return text.trim().replace(/\r\n/g, "\n");
}

/** Saves a draft. A draft that matches what is live already is simply cleared. */
export async function saveSiteTextDraft(db: Database, key: string, text: string, email: string) {
  const value = check(key, text);
  const block = SITE_TEXT_BY_KEY.get(key)!;
  const row = (await db.select().from(siteText).where(eq(siteText.key, key)).limit(1))[0];
  const live = row?.published ?? block.original;
  const draft = value === live ? null : value;
  await db.insert(siteText).values({ key, draft, draftBy: email }).onConflictDoUpdate({ target: siteText.key, set: { draft, draftBy: email } });
  return { key, draft };
}

export async function discardSiteTextDraft(db: Database, key: string) {
  await db.update(siteText).set({ draft: null, draftBy: null }).where(eq(siteText.key, key));
}

/** Puts the original wording into the draft, ready to publish. */
export async function restoreOriginalSiteText(db: Database, key: string, email: string) {
  const block = SITE_TEXT_BY_KEY.get(key);
  if (!block) throw new TRPCError({ code: "NOT_FOUND", message: "That text is not on the site anymore." });
  return saveSiteTextDraft(db, key, block.original, email);
}

/** Publishes the drafts for the given texts (or every draft). Returns how many went live. */
export async function publishSiteText(db: Database, keys: string[] | "all", email: string) {
  const rows = keys === "all"
    ? await db.select().from(siteText).where(isNotNull(siteText.draft))
    : keys.length ? await db.select().from(siteText).where(inArray(siteText.key, keys)) : [];
  const ready = rows.filter((row) => row.draft !== null && SITE_TEXT_BY_KEY.has(row.key));
  if (!ready.length) return { published: 0 };
  const now = new Date();
  const statements = ready.flatMap((row) => {
    const value = check(row.key, row.draft as string);
    const isOriginal = value === SITE_TEXT_BY_KEY.get(row.key)!.original;
    return [
      db.update(siteText).set({ published: isOriginal ? null : value, draft: null, draftBy: null, publishedBy: email, publishedAt: now }).where(eq(siteText.key, row.key)),
      db.insert(siteTextHistory).values({ key: row.key, text: isOriginal ? "" : value, publishedBy: email }),
    ];
  });
  // D1 runs a batch as one transaction, so a publish is all or nothing.
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return { published: ready.length };
}
