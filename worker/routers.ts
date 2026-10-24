import { ownerVendorSchema, reviewDecisionSchema } from "../shared/vendorProfile";
import { z } from "zod";
import { SITE_IMAGE_SLOT_IDS } from "../shared/siteImageSlots";
import { makerSubmissionSchema } from "../shared/makerListing";
import { APPLICATION_CATEGORIES, applicationSchema, formatApplicationPhone, SALES_CHANNELS } from "../shared/application";
import { TRPCError } from "@trpc/server";
import { deleteSiteImageObject } from "./media";
import {
  bulkImportVendorProfiles, listSiteImages, createVendorSubmission, getPublicVendorProfile, listMakerListings, makerOwnsProfile, freeSlugFor, updateVendorProfileAsOwner, assignListingLogin, bulkUpdateVendorProfiles, deleteVendorProfiles,
  APPLICATION_LIMIT_PER_SOURCE_PER_DAY, countRecentApplications, createApplication, getApplication, listApplications, setApplicationStatus, startListingFromApplication,
  DIRECTORY_PAGE_SIZES, getSiteSetting, listAllVendorProfiles, listFeaturedVendorProfiles, listPublicVendorCategories, listPublicVendorPage, listVendorSubmissions,
  reviewVendorSubmission, setSiteSetting, setVendorActive, addMakerInvites, listMakerInvites, removeMakerInvite,
  createHighlight, deleteGalleryPhoto, deleteHighlight, getGalleryPhoto, getHighlight, listGalleryPhotos, listHighlights,
  listPublicHighlights, reorderGalleryPhotos, updateGalleryPhoto, updateHighlight,
} from "./db";
import { aiWrite } from "./aiWriting";
import { discardImageDraft, draftOriginalImage, listImageDrafts, previewSiteImages, publishSiteImages, saveImageDraftAlt } from "./siteImages";
import { discardSiteTextDraft, listSiteTextForOwners, previewSiteText, publishedSiteText, publishSiteText, restoreOriginalSiteText, saveSiteTextDraft } from "./siteText";
import { countRecentGiftRequests, createGiftRequest, deleteGiftBox, getCommerceSettings, GIFT_REQUEST_LIMIT_PER_SOURCE_PER_DAY, listGiftBoxChoices, listGiftBoxes, listGiftRequests, listPublicGiftBoxes, saveGiftBox, setCommerceSettings, squareApiReady, updateGiftRequest } from "./gifts";
import { BRANDING_OPTIONS, commerceSettingsSchema, GIFT_CATEGORIES, GIFT_REQUEST_STATUSES, giftBoxSchema, giftRequestSchema } from "../shared/gifts";
import { runStorageMaintenance, usageSummary } from "./usage";
import { aiWriteSchema } from "../shared/aiWriting";
import { normalizeLink } from "../shared/socialLinks";
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

/** A one way fingerprint of the sender's network address, used only to slow down spam. */
async function sourceHash(request: Request) {
  const address = request.headers.get("CF-Connecting-IP") || "local";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cannery-applications:${address}`));
  return Array.from(new Uint8Array(bytes)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

// Mounted at /api/trpc. Open to everyone.
export const publicRouter = router({
  // The maker application on /apply.
  applications: router({
    submit: publicProcedure.input(applicationSchema).mutation(async ({ ctx, input }) => {
      // Bots fill the hidden field; pretend it worked so they move on.
      if (input.website2) return { id: 0 };
      const hash = await sourceHash(ctx.request);
      if ((await countRecentApplications(ctx.db, hash)) >= APPLICATION_LIMIT_PER_SOURCE_PER_DAY) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "We received several applications from this connection today. Please try again tomorrow, or email thecannerymarketplace@gmail.com." });
      const categories = input.categories.filter((item) => (APPLICATION_CATEGORIES as readonly string[]).includes(item)).map((item) => (item === "Other" ? `Other: ${clean(input.categoryOther)}` : item));
      const salesChannels = input.salesChannels.filter((item) => (SALES_CHANNELS as readonly string[]).includes(item)).map((item) => (item === "Other" ? `Other: ${clean(input.salesOther)}` : item));
      const id = await createApplication(ctx.db, {
        businessName: clean(input.businessName), address: clean(input.address), websiteUrl: normalizeLink("website", input.websiteUrl) || null, facebookUrl: normalizeLink("facebook", input.facebookUrl) || null,
        instagramUrl: normalizeLink("instagram", input.instagramUrl) || null, otherSocial: clean(input.otherSocial) || null, tagline: clean(input.tagline), productDescription: input.productDescription.trim(),
        fullName: clean(input.fullName), email: input.email.trim().toLowerCase(), phone: formatApplicationPhone(input), referredBy: clean(input.referredBy),
        categories: JSON.stringify(categories), salesChannels: JSON.stringify(salesChannels), sourceHash: hash,
      });
      return { id };
    }),
  }),
  settings: router({
    public: publicProcedure.query(async ({ ctx }) => ({ giftBoxesEnabled: await giftBoxesEnabled(ctx.db) })),
    // Published site text (only wording the owners changed). Pages also get this in the HTML.
    siteText: publicProcedure.query(({ ctx }) => publishedSiteText(ctx.db)),
  }),
  // Gift boxes and corporate requests. Everything is hidden while gift boxes are turned off.
  gifts: router({
    catalog: publicProcedure.query(async ({ ctx }) => (await giftBoxesEnabled(ctx.db)) ? { enabled: true as const, ...(await listPublicGiftBoxes(ctx.db)) } : { enabled: false as const, providerName: "", pickupNote: "", boxes: [] }),
    boxChoices: publicProcedure.query(async ({ ctx }) => (await giftBoxesEnabled(ctx.db)) ? listGiftBoxChoices(ctx.db) : []),
    requestQuote: publicProcedure.input(giftRequestSchema).mutation(async ({ ctx, input }) => {
      if (input.website2) return { id: 0 };
      if (!(await giftBoxesEnabled(ctx.db))) throw new TRPCError({ code: "FORBIDDEN", message: "Gift requests are paused right now. Please email thecannerymarketplace@gmail.com." });
      const hash = await sourceHash(ctx.request);
      if ((await countRecentGiftRequests(ctx.db, hash)) >= GIFT_REQUEST_LIMIT_PER_SOURCE_PER_DAY) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "We received several requests from this connection today. Please email thecannerymarketplace@gmail.com." });
      const digits = input.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      const id = await createGiftRequest(ctx.db, {
        company: clean(input.company), contactName: clean(input.contactName), email: input.email.trim().toLowerCase(),
        phone: digits ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : null,
        quantity: Number(input.quantity), budgetPerGift: input.budgetPerGift, neededBy: input.neededBy || null, deliveryMethod: input.deliveryMethod,
        destinations: clean(input.destinations) || null,
        branding: JSON.stringify(input.branding.filter((item) => (BRANDING_OPTIONS as readonly string[]).includes(item))),
        cardMessage: input.branding.includes("Custom card message") ? input.cardMessage.trim() || null : null, logoLink: input.logoLink.trim() || null,
        startingBox: input.startingBox.trim() || null, customBox: input.customBox,
        preferredCategories: JSON.stringify(input.customBox ? input.preferredCategories.filter((item) => (GIFT_CATEGORIES as readonly string[]).includes(item)) : []),
        preferredMakers: input.customBox ? clean(input.preferredMakers) || null : null, message: input.message.trim(), sourceHash: hash,
      });
      return { id };
    }),
  }),
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
    // AI writing help on listing text: improve what the maker wrote, or write it for them.
    aiWrite: vendorProcedure.input(aiWriteSchema).mutation(({ ctx, input }) => aiWrite(ctx.env, ctx.db, { email: ctx.email, role: "maker" }, input)),
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
    // Free tier guardrails: today's AI use and photo storage, shown on the Overview.
    usage: adminProcedure.query(({ ctx }) => usageSummary(ctx.db)),
    // Recounts photo storage now and removes photos nothing uses (older than a week). Also runs nightly.
    runStorageCheck: adminProcedure.mutation(({ ctx }) => runStorageMaintenance(ctx.env, { removeUnused: true })),
    // The same writing help for owners (listing editor and home highlights), with a higher daily limit.
    aiWrite: adminProcedure.input(aiWriteSchema).mutation(({ ctx, input }) => aiWrite(ctx.env, ctx.db, { email: ctx.email, role: "owner" }, input)),
    // Maker application submissions. "invited" also adds the email to the maker portal guest list.
    applications: adminProcedure.query(({ ctx }) => listApplications(ctx.db)),
    setApplicationStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "invited", "declined", "archived"]), note: z.string().trim().max(1200).default("") })).mutation(async ({ ctx, input }) => {
      const application = await getApplication(ctx.db, input.id);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "That application no longer exists. Refresh the page." });
      // Inviting gives the applicant maker portal access and starts their listing for them.
      let listingStarted = false;
      if (input.status === "invited") {
        await addMakerInvites(ctx.db, [application.email], ctx.email);
        listingStarted = (await startListingFromApplication(ctx.db, application)).created;
      }
      await setApplicationStatus(ctx.db, input.id, input.status, input.note);
      return { success: true, email: application.email, listingStarted };
    }),
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
    // Permanent delete of one or many listings (the dashboard asks for confirmation first).
    deleteVendors: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1, "Select at least one listing").max(500) })).mutation(({ ctx, input }) => deleteVendorProfiles(ctx.db, input.ids)),
    setVendorActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => { await setVendorActive(ctx.db, input.id, input.active); return { success: true }; }),
    // Uploads use POST /api/admin/upload?slot=... (raw bytes, see media.ts). These edit or undo them.
    // Image spots use Draft then Publish, like site text. Uploads arrive as drafts (see media.ts).
    siteImageDrafts: adminProcedure.query(({ ctx }) => listImageDrafts(ctx.db)),
    siteImagesPreview: adminProcedure.query(({ ctx }) => previewSiteImages(ctx.db)),
    setSiteImageAlt: adminProcedure.input(z.object({ id: z.enum(SITE_IMAGE_SLOT_IDS), alt: z.string().trim().max(300) })).mutation(async ({ ctx, input }) => { await saveImageDraftAlt(ctx.db, input.id, input.alt, ctx.email); return { success: true }; }),
    resetSiteImage: adminProcedure.input(z.object({ id: z.enum(SITE_IMAGE_SLOT_IDS) })).mutation(async ({ ctx, input }) => { await draftOriginalImage(ctx.env, ctx.db, input.id, ctx.email); return { success: true }; }),
    discardSiteImageDraft: adminProcedure.input(z.object({ id: z.enum(SITE_IMAGE_SLOT_IDS) })).mutation(async ({ ctx, input }) => { await discardImageDraft(ctx.env, ctx.db, input.id); return { success: true }; }),
    publishSiteImages: adminProcedure.input(z.object({ ids: z.array(z.enum(SITE_IMAGE_SLOT_IDS)).max(20) })).mutation(({ ctx, input }) => publishSiteImages(ctx.env, ctx.db, input.ids)),
    // One button for every page: publishes all text and image drafts together.
    publishAllPageDrafts: adminProcedure.mutation(async ({ ctx }) => {
      const text = await publishSiteText(ctx.db, "all", ctx.email);
      const images = await publishSiteImages(ctx.env, ctx.db, "all");
      return { text: text.published, images: images.published };
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
    // Site text editor: drafts, preview, publish, history, restore original.
    siteText: adminProcedure.query(({ ctx }) => listSiteTextForOwners(ctx.db)),
    siteTextPreview: adminProcedure.query(({ ctx }) => previewSiteText(ctx.db)),
    saveSiteTextDraft: adminProcedure.input(z.object({ key: z.string().max(80), text: z.string().max(2400) })).mutation(({ ctx, input }) => saveSiteTextDraft(ctx.db, input.key, input.text, ctx.email)),
    discardSiteTextDraft: adminProcedure.input(z.object({ key: z.string().max(80) })).mutation(async ({ ctx, input }) => { await discardSiteTextDraft(ctx.db, input.key); return { success: true }; }),
    restoreOriginalSiteText: adminProcedure.input(z.object({ key: z.string().max(80) })).mutation(({ ctx, input }) => restoreOriginalSiteText(ctx.db, input.key, ctx.email)),
    publishSiteText: adminProcedure.input(z.object({ keys: z.union([z.literal("all"), z.array(z.string().max(80)).max(400)]) })).mutation(({ ctx, input }) => publishSiteText(ctx.db, input.keys, ctx.email)),
    // Gift boxes, checkout settings, and corporate requests (all hidden until gift boxes are on).
    giftBoxes: adminProcedure.query(async ({ ctx }) => {
      const settings = await getCommerceSettings(ctx.db);
      return { boxes: await listGiftBoxes(ctx.db), settings, squareApiReady: squareApiReady(ctx.env, settings), hasSquareToken: Boolean(ctx.env.SQUARE_ACCESS_TOKEN) };
    }),
    saveGiftBox: adminProcedure.input(giftBoxSchema).mutation(async ({ ctx, input }) => {
      const saved = await saveGiftBox(ctx.db, input);
      if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "That gift box no longer exists. Refresh the page." });
      if (saved.previousImage && saved.previousImage !== (input.imageUrl || null)) await deleteSiteImageObject(ctx.env, saved.previousImage);
      return { id: saved.id };
    }),
    deleteGiftBox: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const removed = await deleteGiftBox(ctx.db, input.id);
      await deleteSiteImageObject(ctx.env, removed?.imageUrl);
      return { success: true };
    }),
    saveCommerceSettings: adminProcedure.input(commerceSettingsSchema).mutation(async ({ ctx, input }) => { await setCommerceSettings(ctx.db, input); return { success: true }; }),
    giftRequests: adminProcedure.query(({ ctx }) => listGiftRequests(ctx.db)),
    updateGiftRequest: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(GIFT_REQUEST_STATUSES), adminNote: z.string().trim().max(1200).default(""), quoteAmount: z.string().trim().max(40).default(""), externalOrderId: z.string().trim().max(64).default("") })).mutation(async ({ ctx, input }) => { const { id, ...change } = input; await updateGiftRequest(ctx.db, id, change); return { success: true }; }),
    bulkImport: adminProcedure.input(z.object({ vendors: z.array(ownerVendorSchema).min(1).max(500) })).mutation(({ ctx, input }) => bulkImportVendorProfiles(ctx.db, input.vendors, ctx.email)),
  }),
});

// Type only: lets the React client call all three endpoints through one typed client.
// Each sub router is still served from its own URL, so the public endpoint has no admin procedures.
export const appRouter = mergeRouters(publicRouter, vendorRouter, adminRouter);
export type AppRouter = typeof appRouter;
