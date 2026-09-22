import { z } from "zod";

const optionalHttpUrl = z.string().trim().max(500).refine((value) => !value || /^https?:\/\//i.test(value), "Use a full http:// or https:// URL");
function socialUrl(label: string, hosts: string[]) {
  return optionalHttpUrl.refine((value) => {
    if (!value) return true;
    try { const host = new URL(value).hostname.toLowerCase().replace(/^www\./, ""); return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)); } catch { return false; }
  }, `Enter a valid ${label} URL`);
}

export const vendorProfileSchema = z.object({
  profileId: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(),
  category: z.string().trim().min(2).max(100),
  shortBio: z.string().trim().min(20).max(800),
  ownerBio: z.string().trim().max(1800).optional().default(""),
  contactEmail: z.string().trim().email().max(320),
  websiteUrl: optionalHttpUrl.optional().default(""),
  instagramUrl: socialUrl("Instagram", ["instagram.com"]).optional().default(""),
  facebookUrl: socialUrl("Facebook", ["facebook.com", "fb.com"]).optional().default(""),
  tiktokUrl: socialUrl("TikTok", ["tiktok.com"]).optional().default(""),
  coverImageUrl: optionalHttpUrl.or(z.string().startsWith("/manus-storage/")).optional().default(""),
  galleryImageUrls: z.array(optionalHttpUrl.or(z.string().startsWith("/manus-storage/"))).max(5).default([]),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
});

export const reviewDecisionSchema = z.object({ submissionId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "changes_requested"]), note: z.string().trim().max(1200).optional().default("") }).refine((value) => value.decision === "approved" || value.note.length >= 5, { message: "Add a short note when rejecting or requesting changes", path: ["note"] });
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;
