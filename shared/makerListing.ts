export { currentCategory, RENAMED_CATEGORIES } from "./categoryNames";
import { vendorProfileSchema, type VendorProfileInput } from "./vendorProfile";

// The starting category list. The live list is managed by the owners in the
// Categories tab (table maker_categories); this one is the fallback.
export const MAKER_CATEGORIES = [
  "Ceramics",
  "Coffee, Matcha & Bakery",
  "Candles & Bath",
  "Food & Pantry",
  "Home & Gifts",
  "Jewelry",
  "Kids & Baby",
  "Paper & Art",
  "Plants & Floral",
  "Textiles & Fiber",
  "Vintage",
  "Wearables",
  "Woodworking",
  "Other",
] as const;

/** True when the category is on the list (the owners' list when given, otherwise the built in one). */
export function isListedCategory(category: string, list: readonly string[] = MAKER_CATEGORIES) {
  return list.includes(category) && category !== "Other";
}

export type ListingField = "name" | "ownerName" | "category" | "shortBio" | "ownerBio" | "contactEmail" | "websiteUrl" | "instagramUrl" | "facebookUrl" | "tiktokUrl" | "social" | "coverImageUrl" | "galleryImageUrls";
export type ListingProblems = Partial<Record<ListingField, string>>;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Everything a maker must fill in before sending a listing for review: every field
 * except the website and social links is required. The same rules run
 * in the browser (instant feedback) and on the server (so they cannot be skipped).
 */
export function listingProblems(values: VendorProfileInput): ListingProblems {
  const problems: ListingProblems = {};
  const name = values.name.trim();
  if (name.length < 2) problems.name = "Enter the business name (or the name you sell under).";
  else if (name.length > 140) problems.name = "Keep the name under 140 characters.";

  const owner = (values.ownerName || "").trim().replace(/\s+/g, " ");
  if (!owner) problems.ownerName = "Enter the maker's full name.";
  else if (owner.split(" ").length < 2) problems.ownerName = "Enter a first and last name.";
  else if (!/^[\p{L}][\p{L}' .-]*[\p{L}.]$/u.test(owner)) problems.ownerName = "Use letters, spaces, apostrophes, periods, or hyphens.";

  // Any category works, including Other (with or without what they make typed in).
  // The owners settle the final category when they approve the listing.
  const category = values.category.trim();
  if (!category) problems.category = "Choose a category, or choose Other.";
  else if (category.length > 60) problems.category = "Keep what you make under 60 characters.";

  // Descriptions are recommended, not required: see listingWarnings. Only the length limit blocks.
  if (values.shortBio.trim().length > 800) problems.shortBio = "Keep the short description under 800 characters.";
  if ((values.ownerBio || "").trim().length > 1800) problems.ownerBio = "Keep this under 1,800 characters.";

  const email = values.contactEmail.trim();
  if (!email) problems.contactEmail = "Enter the email shoppers can contact you at.";
  else if (!EMAIL.test(email) || email.length > 320) problems.contactEmail = "Enter a valid email address, like name@example.com.";

  // Format checks for links come from the shared profile rules.
  const parsed = vendorProfileSchema.safeParse(values);
  if (!parsed.success) for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === "websiteUrl" || field === "instagramUrl" || field === "facebookUrl" || field === "tiktokUrl") problems[field] ??= issue.message.endsWith(".") ? issue.message : `${issue.message}.`;
  }

  if (!values.coverImageUrl) problems.coverImageUrl = "Add a cover photo.";
  if (!values.galleryImageUrls.length) problems.galleryImageUrls = "Add at least one photo of your work.";
  return problems;
}

/**
 * Recommended fields that are empty or thin. They never block sending; the maker is told
 * the listing will likely be sent back and is offered AI help to write them.
 */
export type ListingWarnings = Partial<Record<"shortBio" | "ownerBio", string>>;
export function listingWarnings(values: { shortBio: string; ownerBio?: string | null }): ListingWarnings {
  const warnings: ListingWarnings = {};
  // Only empty fields get a reminder; any length is fine.
  if (!values.shortBio.trim()) warnings.shortBio = "Add a short description. Listings without one most likely will not be approved.";
  if (!(values.ownerBio || "").trim()) warnings.ownerBio = "Tell shoppers about the maker. Listings without this most likely will not be approved.";
  return warnings;
}

export const LISTING_FIELD_ORDER: ListingField[] = ["name", "ownerName", "category", "shortBio", "ownerBio", "contactEmail", "websiteUrl", "instagramUrl", "facebookUrl", "tiktokUrl", "social", "coverImageUrl", "galleryImageUrls"];

/** What makers send from the portal: the profile rules plus the required fields above. */
export const makerSubmissionSchema = vendorProfileSchema.superRefine((values, context) => {
  const problems = listingProblems(values);
  for (const field of LISTING_FIELD_ORDER) {
    const message = problems[field];
    if (message) context.addIssue({ code: "custom", path: [field === "social" ? "instagramUrl" : field], message });
  }
});

export const REVIEW_TIME_NOTE = "Every submission is reviewed by the marketplace administrator. Review and approval can take up to 72 hours. If anything needs to change, we will let you know here and by email.";
