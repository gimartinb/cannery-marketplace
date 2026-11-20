import { TRPCError } from "@trpc/server";
import { desc, eq, gt, sql } from "drizzle-orm";
import { emailLog, emailTemplates } from "../drizzle/schema";
import { AUTO_SEND_TEMPLATES, DEFAULT_AUTO_SEND, type AutoSendTemplate, DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_IDS, fillTemplate, templateDefault, type EmailTemplateId } from "../shared/emailTemplates";
import { getSiteSetting, setSiteSetting, type Database } from "./db";
import type { Env } from "./env";

// Sends email through Resend (free plan: 3,000 a month, 100 a day). The site stops at
// 90 a day so it never runs into the limit; the owners see the count in the Emails tab.
export const EMAIL_DAILY_LIMIT = 90;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailReady(env: Env) {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/** Every template with the owners' edits applied. */
export async function listEmailTemplates(db: Database) {
  const rows = new Map((await db.select().from(emailTemplates)).map((row) => [row.id, row]));
  return DEFAULT_EMAIL_TEMPLATES.map((template) => {
    const edited = rows.get(template.id);
    return { ...template, subject: edited?.subject ?? template.subject, body: edited?.body ?? template.body, edited: Boolean(edited), updatedBy: edited?.updatedBy ?? null, updatedAt: edited?.updatedAt ?? null, original: { subject: template.subject, body: template.body } };
  });
}

export async function getEmailTemplate(db: Database, id: EmailTemplateId) {
  const row = (await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1))[0];
  const base = templateDefault(id);
  return { subject: row?.subject ?? base.subject, body: row?.body ?? base.body };
}

export async function saveEmailTemplate(db: Database, id: EmailTemplateId, subject: string, body: string, email: string) {
  const base = templateDefault(id);
  if (subject === base.subject && body === base.body) { await db.delete(emailTemplates).where(eq(emailTemplates.id, id)); return; }
  await db.insert(emailTemplates).values({ id, subject, body, updatedBy: email }).onConflictDoUpdate({ target: emailTemplates.id, set: { subject, body, updatedBy: email } });
}

export async function resetEmailTemplate(db: Database, id: EmailTemplateId) {
  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
}

export async function sentToday(db: Database) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db.select({ total: sql<number>`count(*)` }).from(emailLog).where(gt(emailLog.createdAt, since));
  return Number(row?.total ?? 0);
}

export async function listEmailLog(db: Database) {
  return db.select().from(emailLog).orderBy(desc(emailLog.id)).limit(100);
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A simple, readable HTML version of the plain text message (paragraphs and clickable links). */
export function textToHtml(text: string) {
  const paragraphs = text.trim().split(/\n{2,}/).map((block) => {
    const html = escapeHtml(block).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#8a6110">$1</a>').replace(/\n/g, "<br>");
    return `<p style="margin:0 0 16px">${html}</p>`;
  }).join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f0e6"><div style="max-width:560px;margin:0 auto;background:#fffdf8;border-top:3px solid #8a6110;padding:28px 28px 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#20241d">${paragraphs}</div></body></html>`;
}

/**
 * Sends one email and records it. Throws a friendly error when sending is not set up,
 * the daily limit is reached, or the email service refuses.
 */
export async function sendEmail(env: Env, db: Database, message: { template: EmailTemplateId; to: string; subject: string; body: string; about?: string; sentBy: string }) {
  if (!emailReady(env)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Sending email from the site is not set up yet. Use Open in Gmail for now." });
  if ((await sentToday(db)) >= EMAIL_DAILY_LIMIT) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The site has sent ${EMAIL_DAILY_LIMIT} emails in the last day, the free plan's safe limit. Use Open in Gmail, or try again tomorrow.` });
  const log = { template: message.template, to: message.to, subject: message.subject, about: message.about || null, sentBy: message.sentBy };
  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], reply_to: env.EMAIL_REPLY_TO || undefined, subject: message.subject, text: message.body, html: textToHtml(message.body) }),
    });
  } catch {
    await db.insert(emailLog).values({ ...log, status: "failed", error: "Could not reach the email service" });
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The email service did not answer. Please try again in a minute." });
  }
  const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) {
    await db.insert(emailLog).values({ ...log, status: "failed", error: (result.message || `Error ${response.status}`).slice(0, 300) });
    throw new TRPCError({ code: "BAD_GATEWAY", message: `The email was not sent: ${result.message || "the email service refused it"}.` });
  }
  await db.insert(emailLog).values({ ...log, status: "sent", providerId: result.id ?? null });
  return { id: result.id ?? null };
}

/** Automatic thank you emails. Never blocks or fails the form the visitor sent. */
export async function sendAutomaticEmail(env: Env, db: Database, template: "applicationReceived" | "giftRequestReceived", to: string, values: Record<string, string | number>) {
  if (!emailReady(env)) return;
  try {
    const { subject, body } = await getEmailTemplate(db, template);
    await sendEmail(env, db, { template, to, subject: fillTemplate(subject, values), body: fillTemplate(body, values), about: "automatic", sentBy: "website" });
  } catch (error) {
    console.error("Automatic email not sent", error instanceof Error ? error.message : error);
  }
}

export const isTemplateId = (value: string): value is EmailTemplateId => (EMAIL_TEMPLATE_IDS as readonly string[]).includes(value);

/** Which emails go out on their own instead of opening a preview. */
export async function getAutoSend(db: Database): Promise<Record<AutoSendTemplate, boolean>> {
  try {
    const saved = JSON.parse(await getSiteSetting(db, "email_auto_send", "{}")) as Partial<Record<AutoSendTemplate, boolean>>;
    return Object.fromEntries(AUTO_SEND_TEMPLATES.map((id) => [id, typeof saved[id] === "boolean" ? saved[id] : DEFAULT_AUTO_SEND[id]])) as Record<AutoSendTemplate, boolean>;
  } catch { return { ...DEFAULT_AUTO_SEND }; }
}

export async function setAutoSend(db: Database, id: AutoSendTemplate, on: boolean) {
  const current = await getAutoSend(db);
  await setSiteSetting(db, "email_auto_send", JSON.stringify({ ...current, [id]: on }));
}
