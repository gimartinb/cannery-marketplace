import { vendorProfileSchema, type VendorProfileInput } from "./vendorProfile";

// Categories makers pick from in the maker portal. Owners can still type any
// category when they edit a listing, and existing categories stay valid there.
export const MAKER_CATEGORIES = [
  "Ceramics",
  "Coffee & Bakery",
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

export type ListingField = "name" | "category" | "shortBio" | "ownerBio" | "contactEmail" | "websiteUrl" | "instagramUrl" | "facebookUrl" | "tiktokUrl" | "social" | "coverImageUrl" | "galleryImageUrls";
export type ListingProblems = Partial<Record<ListingField, string>>;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Everything a maker must fill in before sending a listing for review: every field
 * except the website is required, and at least one social link. The same rules run
 * in the browser (instant feedback) and on the server (so they cannot be skipped).
 */
export function listingProblems(values: VendorProfileInput): ListingProblems {
  const problems: ListingProblems = {};
  const name = values.name.trim();
  if (name.length < 2) problems.name = "Enter your business or maker name.";
  else if (name.length > 140) problems.name = "Keep the name under 140 characters.";

  if (!values.category.trim()) problems.category = "Choose a category.";
  else if (!(MAKER_CATEGORIES as readonly string[]).includes(values.category)) problems.category = "Choose a category from the list.";

  const short = values.shortBio.trim();
  if (!short) problems.shortBio = "Write a short description of what you make.";
  else if (short.length < 20) problems.shortBio = `Add a little more detail (at least 20 characters, you have ${short.length}).`;
  else if (short.length > 800) problems.shortBio = "Keep the short description under 800 characters.";

  const about = (values.ownerBio || "").trim();
  if (!about) problems.ownerBio = "Tell shoppers about the maker behind the work.";
  else if (about.length < 40) problems.ownerBio = `Add a little more detail (at least 40 characters, you have ${about.length}).`;
  else if (about.length > 1800) problems.ownerBio = "Keep this under 1,800 characters.";

  const email = values.contactEmail.trim();
  if (!email) problems.contactEmail = "Enter the email shoppers can contact you at.";
  else if (!EMAIL.test(email) || email.length > 320) problems.contactEmail = "Enter a valid email address, like name@example.com.";

  // Format checks for links come from the shared profile rules.
  const parsed = vendorProfileSchema.safeParse(values);
  if (!parsed.success) for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === "websiteUrl" || field === "instagramUrl" || field === "facebookUrl" || field === "tiktokUrl") problems[field] ??= issue.message.endsWith(".") ? issue.message : `${issue.message}.`;
  }
  if (![values.instagramUrl, values.facebookUrl, values.tiktokUrl].some((link) => (link || "").trim())) problems.social = "Add at least one social link: Instagram, Facebook, or TikTok.";

  if (!values.coverImageUrl) problems.coverImageUrl = "Add a cover photo.";
  if (!values.galleryImageUrls.length) problems.galleryImageUrls = "Add at least one photo of your work.";
  return problems;
}

export const LISTING_FIELD_ORDER: ListingField[] = ["name", "category", "shortBio", "ownerBio", "contactEmail", "websiteUrl", "instagramUrl", "facebookUrl", "tiktokUrl", "social", "coverImageUrl", "galleryImageUrls"];

/** What makers send from the portal: the profile rules plus the required fields above. */
export const makerSubmissionSchema = vendorProfileSchema.superRefine((values, context) => {
  const problems = listingProblems(values);
  for (const field of LISTING_FIELD_ORDER) {
    const message = problems[field];
    if (message) context.addIssue({ code: "custom", path: [field === "social" ? "instagramUrl" : field], message });
  }
});

export const REVIEW_TIME_NOTE = "Every submission is reviewed by the marketplace administrator. Review and approval can take up to 72 hours. If anything needs to change, we will let you know here and by email.";
