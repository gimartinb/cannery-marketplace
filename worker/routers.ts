import { reviewDecisionSchema, vendorProfileSchema } from "../shared/vendorProfile";
import { z } from "zod";
import {
  bulkImportVendorProfiles, createVendorSubmission, getLatestVendorSubmission, getPublicVendorProfile,
  getSiteSetting, listAllVendorProfiles, listPublicVendorProfiles, listVendorSubmissions,
  reviewVendorSubmission, setSiteSetting, setVendorActive,
} from "./db";
import { adminProcedure, mergeRouters, publicProcedure, router, vendorProcedure } from "./trpc";

const giftBoxesEnabled = async (db: Parameters<typeof getSiteSetting>[0]) => (await getSiteSetting(db, "gift_boxes_enabled", "false")) === "true";

// Mounted at /api/trpc. Open to everyone.
export const publicRouter = router({
  settings: router({ public: publicProcedure.query(async ({ ctx }) => ({ giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })) }),
  directory: router({
    list: publicProcedure.query(({ ctx }) => listPublicVendorProfiles(ctx.db)),
    bySlug: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(160) })).query(({ ctx, input }) => getPublicVendorProfile(ctx.db, input.slug)),
  }),
});

// Mounted at /api/vendor/trpc, behind the vendor Cloudflare Access app.
// Image uploads use the raw POST /api/vendor/upload route instead (see media.ts).
export const vendorRouter = router({
  vendorPortal: router({
    me: vendorProcedure.query(({ ctx }) => ({ email: ctx.email })),
    latest: vendorProcedure.query(({ ctx }) => getLatestVendorSubmission(ctx.db, ctx.vendorAccount.id)),
    submit: vendorProcedure.input(vendorProfileSchema).mutation(async ({ ctx, input }) => ({ id: await createVendorSubmission(ctx.db, ctx.vendorAccount.id, input), status: "pending" as const })),
  }),
});

// Mounted at /api/admin/trpc, behind the admin Cloudflare Access app.
export const adminRouter = router({
  adminPortal: router({
    me: adminProcedure.query(({ ctx }) => ({ email: ctx.email })),
    dashboard: adminProcedure.query(async ({ ctx }) => ({ submissions: await listVendorSubmissions(ctx.db), vendors: await listAllVendorProfiles(ctx.db), giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })),
    review: adminProcedure.input(reviewDecisionSchema).mutation(async ({ ctx, input }) => { await reviewVendorSubmission(ctx.db, input.submissionId, input.decision, input.note); return { success: true }; }),
    setGiftBoxesEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => { await setSiteSetting(ctx.db, "gift_boxes_enabled", String(input.enabled)); return { success: true }; }),
    setVendorActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => { await setVendorActive(ctx.db, input.id, input.active); return { success: true }; }),
    bulkImport: adminProcedure.input(z.object({ vendors: z.array(vendorProfileSchema).min(1).max(500) })).mutation(async ({ ctx, input }) => ({ imported: await bulkImportVendorProfiles(ctx.db, input.vendors) })),
  }),
});

// Type only: lets the React client call all three endpoints through one typed client.
// Each sub router is still served from its own URL, so the public endpoint has no admin procedures.
export const appRouter = mergeRouters(publicRouter, vendorRouter, adminRouter);
export type AppRouter = typeof appRouter;
