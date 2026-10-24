import { z } from "zod";
import { normalizeLink, type LinkKind } from "./socialLinks";

// The vendor interest form (replaces the Google Form). The questions and
// answer choices match the marketplace's original form.

export const APPLICATION_CATEGORIES = [
  "Art",
  "Apparel & Accessories",
  "Baked Goods & Sweets",
  "Bath & Body",
  "Candles & Wax Melts",
  "Children & Kids",
  "Floral Products",
  "Food Products",
  "Home Decor",
  "Jewelry",
  "Pet Treats & Accessories",
  "Self Care",
  "Stationery & Books",
  "Other",
] as const;

export const SALES_CHANNELS = ["Craft Shows", "E-Commerce", "Etsy", "Other stores", "Pop-Ups", "Other"] as const;

export const APPLICATION_STATUSES = ["new", "invited", "declined", "archived"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicationValues = {
  businessName: string;
  city: string;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  otherSocial: string;
  tagline: string;
  productDescription: string;
  fullName: string;
  email: string;
  areaCode: string;
  localNumber: string;
  referredBy: string;
  categories: string[];
  categoryOther: string;
  salesChannels: string[];
  salesOther: string;
};

export const EMPTY_APPLICATION: ApplicationValues = {
  businessName: "", city: "", websiteUrl: "", facebookUrl: "", instagramUrl: "", otherSocial: "", tagline: "", productDescription: "",
  fullName: "", email: "", areaCode: "", localNumber: "", referredBy: "", categories: [], categoryOther: "", salesChannels: [], salesOther: "",
};

export type ApplicationField = keyof ApplicationValues | "social" | "phone";
export type ApplicationProblems = Partial<Record<ApplicationField, string>>;

const digits = (value: string) => value.replace(/\D/g, "");
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function linkProblem(value: string, label: string, kind: LinkKind, hosts?: string[]) {
  const text = normalizeLink(kind, value);
  if (!text) return undefined;
  if (!/^https?:\/\//i.test(text)) return kind === "website" ? "Enter a web address, like yourshop.com" : `Enter your ${label} @handle or link.`;
  try {
    const host = new URL(text).hostname.toLowerCase().replace(/^www\./, "");
    if (hosts && !hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return `Enter your ${label} @handle or a ${hosts[0]} link.`;
  } catch { return `Enter a valid ${label} link.`; }
  if (text.length > 300) return "Keep the link under 300 characters.";
  return undefined;
}

/**
 * Every answer is required except the website and social media links, which can be
 * full links or @handles. Runs in the browser
 * for instant feedback and on the server so it cannot be skipped.
 */
export function applicationProblems(values: ApplicationValues): ApplicationProblems {
  const problems: ApplicationProblems = {};
  const text = (value: string) => value.trim().replace(/\s+/g, " ");

  const business = text(values.businessName);
  if (business.length < 2) problems.businessName = "Enter the name of your business.";
  else if (business.length > 140) problems.businessName = "Keep the business name under 140 characters.";

  const city = text(values.city);
  if (city.length < 2) problems.city = "Enter the city where you make your products.";
  else if (city.length > 80) problems.city = "Keep the city under 80 characters.";

  const website = linkProblem(values.websiteUrl, "website", "website");
  if (website) problems.websiteUrl = website;
  const facebook = linkProblem(values.facebookUrl, "Facebook", "facebook", ["facebook.com", "fb.com"]);
  if (facebook) problems.facebookUrl = facebook;
  const instagram = linkProblem(values.instagramUrl, "Instagram", "instagram", ["instagram.com"]);
  if (instagram) problems.instagramUrl = instagram;
  if (text(values.otherSocial).length > 300) problems.otherSocial = "Keep this under 300 characters.";

  const tagline = text(values.tagline);
  if (!tagline) problems.tagline = "Describe your business in one short sentence.";
  else if (tagline.length < 10) problems.tagline = "Add a little more (at least 10 characters).";
  else if (tagline.length > 160) problems.tagline = "Keep it to one short sentence (160 characters or less).";

  const product = text(values.productDescription);
  if (!product) problems.productDescription = "Tell us about your product.";
  else if (product.length < 20) problems.productDescription = `Add a little more detail (at least 20 characters, you have ${product.length}).`;
  else if (product.length > 1500) problems.productDescription = "Keep this under 1,500 characters.";

  const name = text(values.fullName);
  if (!name) problems.fullName = "Enter your full name.";
  else if (name.split(" ").length < 2) problems.fullName = "Enter your first and last name.";
  else if (!/^[\p{L}][\p{L}' .-]*[\p{L}.]$/u.test(name) || name.length > 100) problems.fullName = "Use letters, spaces, apostrophes, periods, or hyphens.";

  const email = values.email.trim();
  if (!email) problems.email = "Enter your email address.";
  else if (email.length > 254 || !EMAIL.test(email) || /\.\./.test(email)) problems.email = "Enter a valid email address, like name@example.com.";

  const area = digits(values.areaCode);
  const local = digits(values.localNumber);
  if (!area && !local) problems.phone = "Enter your phone number.";
  else {
    if (!/^[2-9]\d{2}$/.test(area)) problems.areaCode = "Enter a 3 digit area code (it cannot start with 0 or 1).";
    if (!/^[2-9]\d{6}$/.test(local)) problems.localNumber = "Enter the 7 digit number (it cannot start with 0 or 1).";
  }

  const referred = text(values.referredBy);
  if (!referred) problems.referredBy = "Tell us who referred you, or how you found us (for example, a QR code at the store).";
  else if (referred.length > 200) problems.referredBy = "Keep this under 200 characters.";

  const categories = values.categories.filter((item) => (APPLICATION_CATEGORIES as readonly string[]).includes(item));
  if (!categories.length) problems.categories = "Choose at least one category.";
  else if (categories.includes("Other") && text(values.categoryOther).length < 2) problems.categoryOther = "Tell us your other category.";
  else if (text(values.categoryOther).length > 80) problems.categoryOther = "Keep this under 80 characters.";

  const channels = values.salesChannels.filter((item) => (SALES_CHANNELS as readonly string[]).includes(item));
  if (!channels.length) problems.salesChannels = "Choose at least one place you sell today.";
  else if (channels.includes("Other") && text(values.salesOther).length < 2) problems.salesOther = "Tell us where else you sell.";
  else if (text(values.salesOther).length > 120) problems.salesOther = "Keep this under 120 characters.";

  return problems;
}

export const APPLICATION_FIELD_ORDER: ApplicationField[] = ["businessName", "city", "websiteUrl", "facebookUrl", "instagramUrl", "otherSocial", "social", "tagline", "productDescription", "fullName", "email", "phone", "areaCode", "localNumber", "referredBy", "categories", "categoryOther", "salesChannels", "salesOther"];

export function formatApplicationPhone(values: Pick<ApplicationValues, "areaCode" | "localNumber">) {
  const area = digits(values.areaCode);
  const local = digits(values.localNumber);
  return area && local ? `(${area}) ${local.slice(0, 3)}-${local.slice(3)}` : "";
}

/** Server side: the same rules, plus size limits on every field. */
export const applicationSchema = z.object({
  businessName: z.string().max(140), city: z.string().max(80), websiteUrl: z.string().max(300), facebookUrl: z.string().max(300), instagramUrl: z.string().max(300),
  otherSocial: z.string().max(300), tagline: z.string().max(160), productDescription: z.string().max(1500), fullName: z.string().max(100), email: z.string().max(254),
  areaCode: z.string().max(5), localNumber: z.string().max(10), referredBy: z.string().max(200),
  categories: z.array(z.string().max(40)).max(APPLICATION_CATEGORIES.length), categoryOther: z.string().max(80),
  salesChannels: z.array(z.string().max(40)).max(SALES_CHANNELS.length), salesOther: z.string().max(120),
  // Hidden field people never see. Bots fill it in.
  website2: z.string().max(200).optional(),
}).superRefine((values, context) => {
  const problems = applicationProblems(values);
  for (const field of APPLICATION_FIELD_ORDER) {
    const message = problems[field];
    if (message) context.addIssue({ code: "custom", path: [field], message });
  }
});
