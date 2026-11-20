import { currentCategory } from "./categoryNames";
import { z } from "zod";
import { normalizeLink, type LinkKind } from "./socialLinks";

// Uploaded images live at /media/<key>. /manus-storage/<key> is kept for images saved on the old site.
const storedImagePath = z.string().trim().max(700).regex(/^\/(media|manus-storage)\/[A-Za-z0-9._\/-]+$/, "Invalid image path");
const optionalHttpUrl = z.string().trim().max(500).refine((value) => !value || /^https?:\/\//i.test(value), "Enter a full web address, like the45workshop.com");
/** Accepts a full link, a bare domain, or a social handle like @shopname, and stores a full link. */
function linkField(kind: LinkKind) {
  return z.string().trim().max(500).transform((value) => normalizeLink(kind, value));
}
function socialUrl(label: string, hosts: string[], kind: LinkKind) {
  return linkField(kind).pipe(optionalHttpUrl).refine((value) => {
    if (!value) return true;
    try { const host = new URL(value).hostname.toLowerCase().replace(/^www\./, ""); return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)); } catch { return false; }
  }, `Enter your ${label} link or @handle`);
}

export const vendorProfileSchema = z.object({
  profileId: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(),
  category: z.string().trim().min(2).max(100).transform(currentCategory),
  shortBio: z.string().trim().max(800).default(""),
  ownerBio: z.string().trim().max(1800).optional().default(""),
  ownerName: z.string().trim().max(120).optional().default(""),
  contactEmail: z.string().trim().email().max(320),
  websiteUrl: linkField("website").pipe(optionalHttpUrl).optional().default(""),
  instagramUrl: socialUrl("Instagram", ["instagram.com"], "instagram").optional().default(""),
  facebookUrl: socialUrl("Facebook", ["facebook.com", "fb.com"], "facebook").optional().default(""),
  tiktokUrl: socialUrl("TikTok", ["tiktok.com"], "tiktok").optional().default(""),
  coverImageUrl: optionalHttpUrl.or(storedImagePath).optional().default(""),
  galleryImageUrls: z.array(optionalHttpUrl.or(storedImagePath)).max(5).default([]),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
});

/** Optional maker login email. Blank means no maker can edit the listing yet. */
export const loginEmailSchema = z.string().trim().toLowerCase().max(320).refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address, like name@example.com").optional().default("");

/** What owners send when importing or editing a listing: the profile plus who may edit it. */
export const ownerVendorSchema = vendorProfileSchema.extend({ loginEmail: loginEmailSchema });
export type OwnerVendorInput = z.infer<typeof ownerVendorSchema>;

export const reviewDecisionSchema = z.object({ submissionId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "changes_requested"]), note: z.string().trim().max(1200).optional().default(""), category: z.string().trim().min(2).max(100).optional() }).refine((value) => value.decision === "approved" || value.note.length >= 5, { message: "Add a short note when rejecting or requesting changes", path: ["note"] });
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;

/**
 * Owners starting a listing for a maker to finish. Only the business name and the maker's
 * email are needed; everything else is optional and the maker completes it. It stays a draft
 * (never public) until the maker sends it for review and an owner approves it.
 */
export const startListingSchema = vendorProfileSchema.pick({ ownerBio: true, ownerName: true, websiteUrl: true, instagramUrl: true, facebookUrl: true, tiktokUrl: true, coverImageUrl: true, galleryImageUrls: true }).extend({
  id: z.number().int().positive().optional(),
  email: z.string().trim().toLowerCase().email("Enter the maker's email address").max(320),
  name: z.string().trim().min(2, "Enter the business name").max(140),
  category: z.string().trim().max(100).default(""),
  shortBio: z.string().trim().max(800).default(""),
  contactEmail: z.string().trim().toLowerCase().max(320).refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid contact email, or leave it blank").default(""),
});
export type StartListingInput = z.infer<typeof startListingSchema>;

/** The note the maker sees on a listing the marketplace started for them. */
export const STARTED_LISTING_NOTE = "We started this listing for you. Check the details, add your photos and story, then click Send for review.";
/** Added to the welcome email when a listing was started for the maker. */
export const STARTED_LISTING_EMAIL_NOTE = "We already started your listing with the details we have. Sign in to check it, add anything missing, and click Send for review. It goes live once we approve it.";
