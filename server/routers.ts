import { COOKIE_NAME } from "@shared/const";
import { reviewDecisionSchema, vendorProfileSchema } from "@shared/vendorProfile";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  bulkImportVendorProfiles, createAdminCredential, createVendorAccount, createVendorSubmission,
  getAdminByUsername, getAdminCount, getLatestVendorSubmission, getPublicVendorProfile,
  getSiteSetting, getVendorAccountByEmail, listAllVendorProfiles, listPublicVendorProfiles,
  listVendorSubmissions, recordAdminLogin, recordVendorLogin, reviewVendorSubmission,
  setSiteSetting, setVendorActive,
} from "./db";
import { clearCredentialSession, createCredentialSession, hashPassword, readCredentialSession, verifyPassword, verifySetupToken } from "./credentialAuth";
import { storagePut } from "./storage";

const strongPassword = z.string().min(12).max(128).refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), "Use at least 12 characters with uppercase, lowercase, and a number");
const loginInput = z.object({ username: z.string().trim().min(3).max(320), password: z.string().min(1).max(128) });
const attemptWindow = new Map<string, { count: number; until: number }>();
function checkRateLimit(key: string) { const entry = attemptWindow.get(key); if (entry && entry.until > Date.now() && entry.count >= 8) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again in 15 minutes." }); }
function recordAttempt(key: string, success: boolean) { if (success) { attemptWindow.delete(key); return; } const entry = attemptWindow.get(key); attemptWindow.set(key, { count: (entry?.count || 0) + 1, until: Date.now() + 15 * 60 * 1000 }); }
async function requireCredential(req: Parameters<typeof readCredentialSession>[0], type: "admin" | "vendor") { const session = await readCredentialSession(req); if (!session || session.accountType !== type) throw new TRPCError({ code: "UNAUTHORIZED", message: `Please sign in as ${type === "admin" ? "an administrator" : "a vendor"}.` }); return session; }

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  credentials: router({
    setupStatus: publicProcedure.query(async () => ({ setupRequired: (await getAdminCount()) === 0 })),
    setupAdmin: publicProcedure.input(z.object({ setupToken: z.string().min(16), username: z.string().trim().min(3).max(80), password: strongPassword })).mutation(async ({ ctx, input }) => {
      if (await getAdminCount()) throw new TRPCError({ code: "CONFLICT", message: "Administrator setup is already complete." });
      if (!verifySetupToken(input.setupToken)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid one-time setup token." });
      const id = await createAdminCredential(input.username, hashPassword(input.password)); await createCredentialSession(ctx.res, ctx.req, "admin", id); return { success: true };
    }),
    loginAdmin: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
      const key = `admin:${ctx.req.ip || "unknown"}`; checkRateLimit(key); const account = await getAdminByUsername(input.username);
      if (!account || (account.lockedUntil && account.lockedUntil > new Date()) || !verifyPassword(input.password, account.passwordHash)) { if (account) await recordAdminLogin(account.id, false, account.failedAttempts); recordAttempt(key, false); throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials or temporarily locked account." }); }
      recordAttempt(key, true); await recordAdminLogin(account.id, true); await createCredentialSession(ctx.res, ctx.req, "admin", account.id); return { success: true };
    }),
    registerVendor: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: strongPassword })).mutation(async ({ ctx, input }) => {
      if (await getVendorAccountByEmail(input.email)) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email." });
      const id = await createVendorAccount(input.email, hashPassword(input.password)); await createCredentialSession(ctx.res, ctx.req, "vendor", id); return { success: true };
    }),
    loginVendor: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const key = `vendor:${ctx.req.ip || "unknown"}`; checkRateLimit(key); const account = await getVendorAccountByEmail(input.email);
      if (!account || !verifyPassword(input.password, account.passwordHash)) { recordAttempt(key, false); throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." }); }
      recordAttempt(key, true); await recordVendorLogin(account.id); await createCredentialSession(ctx.res, ctx.req, "vendor", account.id); return { success: true };
    }),
    me: publicProcedure.query(async ({ ctx }) => { const session = await readCredentialSession(ctx.req); return session ? { authenticated: true as const, accountType: session.accountType, accountId: session.accountId } : { authenticated: false as const }; }),
    logout: publicProcedure.mutation(async ({ ctx }) => { await clearCredentialSession(ctx.req, ctx.res); return { success: true }; }),
  }),
  settings: router({ public: publicProcedure.query(async () => ({ giftBoxesEnabled: (await getSiteSetting("gift_boxes_enabled", "false")) === "true" })) }),
  directory: router({
    list: publicProcedure.query(listPublicVendorProfiles),
    bySlug: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(160) })).query(({ input }) => getPublicVendorProfile(input.slug)),
  }),
  vendorPortal: router({
    latest: publicProcedure.query(async ({ ctx }) => { const session = await requireCredential(ctx.req, "vendor"); return getLatestVendorSubmission(session.accountId); }),
    submit: publicProcedure.input(vendorProfileSchema).mutation(async ({ ctx, input }) => { const session = await requireCredential(ctx.req, "vendor"); return { id: await createVendorSubmission(session.accountId, input), status: "pending" as const }; }),
    uploadImage: publicProcedure.input(z.object({ fileName: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().max(8_000_000) })).mutation(async ({ ctx, input }) => { const session = await requireCredential(ctx.req, "vendor"); const bytes = Buffer.from(input.dataBase64, "base64"); if (bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Image exceeds 5 MB." }); const safe = input.fileName.replace(/[^a-z0-9._-]+/gi, "-"); return storagePut(`vendor-${session.accountId}/${safe}`, bytes, input.mimeType); }),
  }),
  adminPortal: router({
    dashboard: publicProcedure.query(async ({ ctx }) => { await requireCredential(ctx.req, "admin"); return { submissions: await listVendorSubmissions(), vendors: await listAllVendorProfiles(), giftBoxesEnabled: (await getSiteSetting("gift_boxes_enabled", "false")) === "true" }; }),
    review: publicProcedure.input(reviewDecisionSchema).mutation(async ({ ctx, input }) => { const session = await requireCredential(ctx.req, "admin"); await reviewVendorSubmission(input.submissionId, input.decision, input.note, session.accountId); return { success: true }; }),
    setGiftBoxesEnabled: publicProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => { await requireCredential(ctx.req, "admin"); await setSiteSetting("gift_boxes_enabled", String(input.enabled)); return { success: true }; }),
    setVendorActive: publicProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => { await requireCredential(ctx.req, "admin"); await setVendorActive(input.id, input.active); return { success: true }; }),
    bulkImport: publicProcedure.input(z.object({ vendors: z.array(vendorProfileSchema).min(1).max(500) })).mutation(async ({ ctx, input }) => { await requireCredential(ctx.req, "admin"); return { imported: await bulkImportVendorProfiles(input.vendors) }; }),
  }),
});

export type AppRouter = typeof appRouter;
