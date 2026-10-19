import { ownerVendorSchema, reviewDecisionSchema } from "../shared/vendorProfile";
import { z } from "zod";
import { SITE_IMAGE_SLOT_IDS } from "../shared/siteImageSlots";
import { makerSubmissionSchema } from "../shared/makerListing";
import { TRPCError } from "@trpc/server";
import { deleteSiteImageObject } from "./media";
import {
  bulkImportVendorProfiles, deleteSiteImage, getSiteImage, listSiteImages, setSiteImageAlt, createVendorSubmission, getPublicVendorProfile, listMakerListings, makerOwnsProfile, freeSlugFor, updateVendorProfileAsOwner, assignListingLogin, bulkUpdateVendorProfiles,
  DIRECTORY_PAGE_SIZES, getSiteSetting, listAllVendorProfiles, listFeaturedVendorProfiles, listPublicVendorCategories, listPublicVendorPage, listVendorSubmissions,
  reviewVendorSubmission, setSiteSetting, setVendorActive, addMakerInvites, listMakerInvites, removeMakerInvite,
  createHighlight, deleteGalleryPhoto, deleteHighlight, getGalleryPhoto, getHighlight, listGalleryPhotos, listHighlights,
  listPublicHighlights, reorderGalleryPhotos, updateGalleryPhoto, updateHighlight,
} from "./db";
import { improveDescription } from "./aiWriting";
import { adminProcedure, mergeRouters, publicProcedure, router, vendorProcedure } from "./trpc";

// A photo uploaded through the dashboard, or a maker's existing photo when a maker is promoted.
const ownerImagePath = z.string().trim().max(700).refine((value) => /^\/(media|manus-storage)\/[A-Za-z0-9._\/-]+$/.test(value) || /^https:\/\/[^\s"'<>]+$/i.test(value), "Upload the photo through the dashboard");
const highlightInput = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(220),
  category: z.string().trim().min(2).max(60),
  makerSlug: z.string().trim().max(160).nullish(),
  imageUrl: ownerImagePath.nullish(),
  displayOrder: z.number().int().min(0).max(99).default(1),
  startsAt: z.date().nullish(),
  endsAt: z.date().nullish(),
}).refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, { message: "must be after the start date", path: ["endsAt"] });

const giftBoxesEnabled = async (db: Parameters<typeof getSiteSetting>[0]) => (await getSiteSetting(db, "gift_boxes_enabled", "false")) === "true";

// Mounted at /api/trpc. Open to everyone.
export const publicRouter = router({
  settings: router({ public: publicProcedure.query(async ({ ctx }) => ({ giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })) }),
  // Owner managed content: home page highlights and the About page gallery.
  home: router({ highlights: publicProcedure.query(({ ctx }) => listPublicHighlights(ctx.db)) }),
  gallery: router({ list: publicProcedure.query(({ ctx }) => listGalleryPhotos(ctx.db)) }),
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
    // Every listing tied to this login email, plus new listings still waiting for approval.
    listings: vendorProcedure.query(({ ctx }) => listMakerListings(ctx.db, ctx.email, ctx.vendorAccount.id)),
    // "Help me improve this": a suggested short description the maker can use or ignore.
    improveDescription: vendorProcedure.input(z.object({ text: z.string().trim().min(20, "Write at least 20 characters first").max(800), name: z.string().trim().max(140).default(""), category: z.string().trim().max(100).default("") })).mutation(({ ctx, input }) => improveDescription(ctx.env, ctx.db, ctx.email, input)),
    submit: vendorProcedure.input(makerSubmissionSchema).mutation(async ({ ctx, input }) => {
      // Makers can only change listings tied to their own email. A new listing gets a web address no one else uses.
      // Featured, order, and visibility stay under owner control, whatever the browser sends.
      let owner: { slug: string; featured: boolean; displayOrder: number; active: boolean };
      if (input.profileId) {
        const owned = await makerOwnsProfile(ctx.db, input.profileId, ctx.email);
        if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "This listing is not tied to your login email. Ask The Cannery Marketplace to connect it to you." });
        owner = owned;
      } else {
        owner = { slug: await freeSlugFor(ctx.db, input.name), featured: false, displayOrder: 100, active: true };
      }
      const { slug, featured, displayOrder, active } = owner;
      return { id: await createVendorSubmission(ctx.db, ctx.vendorAccount.id, { ...input, slug, featured, displayOrder, active }), status: "pending" as const };
    }),
  }),
});

// Mounted at /api/admin/trpc, behind the admin Cloudflare Access app.
export const adminRouter = router({
  adminPortal: router({
    me: adminProcedure.query(({ ctx }) => ({ email: ctx.email })),
    dashboard: adminProcedure.query(async ({ ctx }) => ({ submissions: await listVendorSubmissions(ctx.db), vendors: await listAllVendorProfiles(ctx.db), giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })),
    review: adminProcedure.input(reviewDecisionSchema).mutation(async ({ ctx, input }) => { await reviewVendorSubmission(ctx.db, input.submissionId, input.decision, input.note, input.category); return { success: true }; }),
    setGiftBoxesEnabled: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => { await setSiteSetting(ctx.db, "gift_boxes_enabled", String(input.enabled)); return { success: true }; }),
    // Owner support: edit any listing directly. Setting a login email also invites that maker to the portal.
    updateVendor: adminProcedure.input(ownerVendorSchema.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      return updateVendorProfileAsOwner(ctx.db, id, values, ctx.email);
    }),
    // Same change to many listings at once: login email ("" clears it), visibility, or featured.
    bulkUpdateVendors: adminProcedure.input(z.object({
      ids: z.array(z.number().int().positive()).min(1, "Select at least one listing").max(500),
      loginEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(320)]).optional(),
      active: z.boolean().optional(),
      featured: z.boolean().optional(),
    })).mutation(({ ctx, input }) => {
      const { ids, ...change } = input;
      return bulkUpdateVendorProfiles(ctx.db, ids, change, ctx.email);
    }),
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
    // Maker portal guest list. Owners paste emails here; no Cloudflare dashboard needed.
    makerInvites: adminProcedure.query(({ ctx }) => listMakerInvites(ctx.db)),
    addMakerInvites: adminProcedure.input(z.object({ emails: z.array(z.string().trim().toLowerCase().email().max(320)).min(1).max(200) })).mutation(async ({ ctx, input }) => ({ added: await addMakerInvites(ctx.db, input.emails, ctx.email) })),
    // The mapping between a listing and the maker email that may edit it. "" disconnects.
    assignListing: adminProcedure.input(z.object({ profileId: z.number().int().positive(), email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(320)]) })).mutation(({ ctx, input }) => assignListingLogin(ctx.db, input.profileId, input.email, ctx.email)),
    removeMakerInvite: adminProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320) })).mutation(async ({ ctx, input }) => { await removeMakerInvite(ctx.db, input.email); return { success: true }; }),
    // Home page highlights. Images upload first via POST /api/admin/upload?purpose=highlight.
    highlights: adminProcedure.query(({ ctx }) => listHighlights(ctx.db)),
    saveHighlight: adminProcedure.input(highlightInput).mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      if (!id) return { id: await createHighlight(ctx.db, values) };
      const current = await getHighlight(ctx.db, id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Highlight not found." });
      await updateHighlight(ctx.db, id, values);
      if (current.imageUrl !== (values.imageUrl || null)) await deleteSiteImageObject(ctx.env, current.imageUrl);
      return { id };
    }),
    deleteHighlight: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const current = await getHighlight(ctx.db, input.id);
      await deleteHighlight(ctx.db, input.id);
      await deleteSiteImageObject(ctx.env, current?.imageUrl);
      return { success: true };
    }),
    // About page gallery. Photos are added via POST /api/admin/upload?purpose=gallery.
    updateGalleryPhoto: adminProcedure.input(z.object({ id: z.number().int().positive(), alt: z.string().trim().min(3).max(300), caption: z.string().trim().max(200) })).mutation(async ({ ctx, input }) => { await updateGalleryPhoto(ctx.db, input.id, input); return { success: true }; }),
    deleteGalleryPhoto: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const current = await getGalleryPhoto(ctx.db, input.id);
      await deleteGalleryPhoto(ctx.db, input.id);
      await deleteSiteImageObject(ctx.env, current?.url);
      return { success: true };
    }),
    reorderGallery: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).max(50) })).mutation(async ({ ctx, input }) => { await reorderGalleryPhotos(ctx.db, input.ids); return { success: true }; }),
    bulkImport: adminProcedure.input(z.object({ vendors: z.array(ownerVendorSchema).min(1).max(500) })).mutation(({ ctx, input }) => bulkImportVendorProfiles(ctx.db, input.vendors, ctx.email)),
  }),
});

// Type only: lets the React client call all three endpoints through one typed client.
// Each sub router is still served from its own URL, so the public endpoint has no admin procedures.
export const appRouter = mergeRouters(publicRouter, vendorRouter, adminRouter);
export type AppRouter = typeof appRouter;
