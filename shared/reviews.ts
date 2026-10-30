import { z } from "zod";

// Shopper reviews. Website reviews wait for an owner's approval. Owners approve or
// remove reviews only for spam, profanity, or off topic content, never because a
// review is negative (federal rules prohibit hiding honest negative reviews).

export const REVIEW_SOURCES = ["website", "google", "instagram", "facebook", "in_store", "other"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];
export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = { website: "Our website", google: "Google", instagram: "Instagram", facebook: "Facebook", in_store: "In the store", other: "Other" };
export const FEATURED_REVIEW_LIMIT = 6;

export type ReviewValues = { rating: number; body: string; reviewerName: string; reviewerCity: string; email: string; photoUrl: string };
export const EMPTY_REVIEW: ReviewValues = { rating: 0, body: "", reviewerName: "", reviewerCity: "", email: "", photoUrl: "" };
export type ReviewField = keyof ReviewValues;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const LINK = /(https?:\/\/|www\.)/i;

/** Problems with a review, keyed by field. Runs in the browser and on the server. */
export function reviewProblems(values: ReviewValues): Partial<Record<ReviewField, string>> {
  const problems: Partial<Record<ReviewField, string>> = {};
  if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) problems.rating = "Choose 1 to 5 stars.";
  const body = values.body.trim();
  if (body.length < 15) problems.body = `Tell us a little more (at least 15 characters, you have ${body.length}).`;
  else if (body.length > 1000) problems.body = "Keep the review under 1,000 characters.";
  else if (LINK.test(body)) problems.body = "Please leave out web links.";
  const name = values.reviewerName.trim();
  if (name.length < 2) problems.reviewerName = "Enter your first name.";
  else if (name.length > 40) problems.reviewerName = "Keep your name under 40 characters.";
  if (values.reviewerCity.trim().length > 60) problems.reviewerCity = "Keep the city under 60 characters.";
  if (values.email.trim() && (!EMAIL.test(values.email.trim()) || values.email.length > 254)) problems.email = "Enter a valid email address, or leave it blank.";
  return problems;
}

const reviewPhoto = z.union([z.literal(""), z.string().max(300).regex(/^\/media\/review\/[A-Za-z0-9._-]+$/, "Upload the photo with the form.")]);

export const reviewSubmitSchema = z.object({
  // Empty means a review of the marketplace itself.
  slug: z.string().trim().max(160),
  rating: z.number().int(),
  body: z.string().max(1100),
  reviewerName: z.string().max(60),
  reviewerCity: z.string().max(80).default(""),
  email: z.string().max(260).default(""),
  photoUrl: reviewPhoto.default(""),
  // Hidden field only bots fill in.
  website2: z.string().max(200).default(""),
}).superRefine((values, context) => {
  const problems = reviewProblems(values);
  for (const [field, message] of Object.entries(problems)) context.addIssue({ code: "custom", path: [field], message });
});

/** Owners adding a real review they received elsewhere. */
export const ownerReviewSchema = z.object({
  profileId: z.number().int().positive().nullable(),
  rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5),
  body: z.string().trim().min(5, "Paste the review.").max(1500),
  reviewerName: z.string().trim().min(1, "Add the reviewer's name, or a first name and initial.").max(40),
  reviewerCity: z.string().trim().max(60).default(""),
  source: z.enum(REVIEW_SOURCES),
  // Owners confirm the review is real and they may share it.
  confirmed: z.literal(true, { message: "Confirm the review is real and you have permission to share it." }),
});

export type ReviewSummary = { count: number; average: number };
export function summarize(ratings: number[]): ReviewSummary {
  if (!ratings.length) return { count: 0, average: 0 };
  return { count: ratings.length, average: Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 };
}

/**
 * Owners editing a published review. For shopper reviews from the website, the star
 * rating cannot change and the words may only be corrected (typos, personal information);
 * reviews owners added from elsewhere can be fully corrected.
 */
export const reviewEditSchema = z.object({
  id: z.number().int().positive(),
  profileId: z.number().int().positive().nullable(),
  rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5),
  body: z.string().trim().min(5, "The review cannot be empty.").max(1500),
  reviewerName: z.string().trim().min(1, "Add the reviewer's name.").max(40),
  reviewerCity: z.string().trim().max(60).default(""),
  source: z.enum(REVIEW_SOURCES),
  removePhoto: z.boolean().default(false),
});
export type ReviewEdit = z.infer<typeof reviewEditSchema>;
