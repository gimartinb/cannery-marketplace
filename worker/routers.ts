import { reviewDecisionSchema, vendorProfileSchema } from "../shared/vendorProfile";
import { z } from "zod";
import { SITE_IMAGE_SLOT_IDS } from "../shared/siteImageSlots";
import { TRPCError } from "@trpc/server";
import { deleteSiteImageObject } from "./media";
import {
  bulkImportVendorProfiles, deleteSiteImage, getSiteImage, listSiteImages, setSiteImageAlt, createVendorSubmission, getLatestVendorSubmission, getPublicVendorProfile,
  DIRECTORY_PAGE_SIZES, getSiteSetting, listAllVendorProfiles, listFeaturedVendorProfiles, listPublicVendorCategories, listPublicVendorPage, listVendorSubmissions,
  reviewVendorSubmission, setSiteSetting, setVendorActive,
} from "./db";
import { adminProcedure, mergeRouters, publicProcedure, router, vendorProcedure } from "./trpc";

const giftBoxesEnabled = async (db: Parameters<typeof getSiteSetting>[0]) => (await getSiteSetting(db, "gift_boxes_enabled", "false")) === "true";

// Mounted at /api/trpc. Open to everyone.
export const publicRouter = router({
  settings: router({ public: publicProcedure.query(async ({ ctx }) => ({ giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })) }),
  // Owner replacements for the named image spots. Spots with no entry use the built-in default.
  siteImages: router({ list: publicProcedure.query(({ ctx }) => listSiteImages(ctx.db)) }),
  directory: router({
    // Paged: 10, 25, or 50 makers per request. "cursor" is how many have already been shown.
    page: publicProcedure.input(z.object({
      cursor: z.number().int().min(0).max(100_000).nullish(),
      limit: z.number().int().refine((value) => (DIRECTORY_PAGE_SIZES as readonly number[]).includes(value), "Choose 10, 25, or 50").default(10),
      category: z.string().trim().max(100).optional(),
      search: z.string().trim().max(80).optional(),
    })).query(({ ctx, input }) => listPublicVendorPage(ctx.db, { offset: input.cursor ?? 0, limit: input.limit, category: input.category || undefined, search: input.search || undefined })),
    categories: publicProcedure.query(({ ctx }) => listPublicVendorCategories(ctx.db)),
    featured: publicProcedure.query(({ ctx }) => listFeaturedVendorProfiles(ctx.db, 3)),
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
    // Uploads use POST /api/admin/upload?slot=... (raw bytes, see media.ts). These edit or undo them.
    setSiteImageAlt: adminProcedure.input(z.object({ id: z.enum(SITE_IMAGE_SLOT_IDS), alt: z.string().trim().max(300) })).mutation(async ({ ctx, input }) => {
      if (!(await setSiteImageAlt(ctx.db, input.id, input.alt))) throw new TRPCError({ code: "NOT_FOUND", message: "Upload a replacement image before editing its description." });
      return { success: true };
    }),
    resetSiteImage: adminProcedure.input(z.object({ id: z.enum(SITE_IMAGE_SLOT_IDS) })).mutation(async ({ ctx, input }) => {
      const current = await getSiteImage(ctx.db, input.id);
      await deleteSiteImage(ctx.db, input.id);
      await deleteSiteImageObject(ctx.env, current?.url);
      return { success: true };
    }),
    bulkImport: adminProcedure.input(z.object({ vendors: z.array(vendorProfileSchema).min(1).max(500) })).mutation(async ({ ctx, input }) => ({ imported: await bulkImportVendorProfiles(ctx.db, input.vendors) })),
  }),
});

// Type only: lets the React client call all three endpoints through one typed client.
// Each sub router is still served from its own URL, so the public endpoint has no admin procedures.
export const appRouter = mergeRouters(publicRouter, vendorRouter, adminRouter);
export type AppRouter = typeof appRouter;
