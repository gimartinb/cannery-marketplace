import { z } from "zod";

// Gift boxes and corporate gift requests. Hidden until the owners turn gift boxes on.
//
// Checkout is provider neutral. Phase 1 (now): each box links to a checkout page made
// in the store's point of sale (a Square Payment Link, a Square Online item page, or any
// other provider's link). Phase 2: the same boxes connect to the point of sale by catalog
// id (externalItemId), and corporate requests can become invoices (externalOrderId).

export const CHECKOUT_PROVIDERS = [
  { id: "none", label: "Not set up yet", help: "Box buttons ask shoppers to contact the marketplace." },
  { id: "square_payment_links", label: "Square Payment Links", help: "In Square, open Payment Links, create one link per box, and paste each link into its box below." },
  { id: "square_online", label: "Square Online store", help: "Paste each box's item page from your Square Online site. Shoppers check out there." },
  { id: "other", label: "Another provider", help: "Any point of sale or checkout that gives you a link per item (for example Shopify, Clover, Toast, or Stripe)." },
] as const;
export type CheckoutProvider = (typeof CHECKOUT_PROVIDERS)[number]["id"];

export const commerceSettingsSchema = z.object({
  provider: z.enum(["none", "square_payment_links", "square_online", "other"]).default("none"),
  // Shown to shoppers, for example "Square".
  providerName: z.string().trim().max(40).default(""),
  // Square Online site address, or the other provider's store page.
  storeUrl: z.union([z.literal(""), z.string().trim().url().max(300)]).default(""),
  // Phase 2 (Square API): which Square location sells the boxes, and test or live mode.
  // The Square access token is never stored here. It goes in Cloudflare as the secret SQUARE_ACCESS_TOKEN.
  squareLocationId: z.string().trim().max(64).regex(/^[A-Za-z0-9]*$/, "Use the location id from Square (letters and numbers only).").default(""),
  squareEnvironment: z.enum(["sandbox", "production"]).default("sandbox"),
  pickupNote: z.string().trim().max(300).default(""),
});
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;
export const DEFAULT_COMMERCE: CommerceSettings = { provider: "none", providerName: "", storeUrl: "", squareLocationId: "", squareEnvironment: "sandbox", pickupNote: "" };

const httpsLink = z.union([z.literal(""), z.string().trim().max(500).refine((value) => /^https:\/\/[^\s"'<>]+$/i.test(value), "Paste the full checkout link, starting with https://")]);
const ownerImage = z.union([z.literal(""), z.string().trim().max(700).refine((value) => /^\/(media|manus-storage)\/[A-Za-z0-9._\/-]+$/.test(value) || /^https:\/\/[^\s"'<>]+$/i.test(value), "Upload the photo through the dashboard")]);

/** Turns "$72", "72", or "72.50" into cents, or null. */
export function priceToCents(price: string): number | null {
  const match = price.replace(/[,\s]/g, "").match(/^\$?(\d{1,5})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || "0").padEnd(2, "0"));
}

export const giftBoxSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, "Give the box a name.").max(80),
  price: z.string().trim().min(1, "Enter a price, like $72.").max(20).refine((value) => priceToCents(value) !== null || /^(from|starting at)\s/i.test(value) || /^call/i.test(value), "Enter a price like $72 or $72.50."),
  description: z.string().trim().min(10, "Describe the box in a sentence or two.").max(400),
  details: z.string().trim().max(160).default(""),
  imageUrl: ownerImage.default(""),
  checkoutUrl: httpsLink.default(""),
  externalItemId: z.string().trim().max(64).default(""),
  externalVariationId: z.string().trim().max(64).default(""),
  corporateOnly: z.boolean().default(false),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(999).default(100),
});
export type GiftBoxInput = z.infer<typeof giftBoxSchema>;

// Corporate and custom gift request form.
export const GIFT_BUDGETS = ["Under $25", "$25 to $50", "$50 to $75", "$75 to $100", "$100 to $150", "Over $150", "Not sure yet"] as const;
export const DELIVERY_METHODS = ["Pickup at the marketplace", "Local delivery in Gilroy", "Shipping", "Not sure yet"] as const;
export const BRANDING_OPTIONS = ["Company logo on the box or tag", "Custom ribbon or colors", "Custom card message", "No branding needed"] as const;
export const GIFT_CATEGORIES = ["Art", "Bath & Body", "Baked Goods & Sweets", "Candles", "Coffee & Tea", "Food & Pantry", "Home Decor", "Jewelry", "Kids", "Paper & Stationery", "Plants & Floral", "Self Care", "Woodworking"] as const;
export const GIFT_REQUEST_STATUSES = ["new", "quoted", "won", "lost", "archived"] as const;

export type GiftRequestValues = {
  company: string; contactName: string; email: string; phone: string; quantity: string; budgetPerGift: string; neededBy: string;
  deliveryMethod: string; destinations: string; branding: string[]; cardMessage: string; logoLink: string;
  startingBox: string; customBox: boolean; preferredCategories: string[]; preferredMakers: string; message: string;
};
export const EMPTY_GIFT_REQUEST: GiftRequestValues = { company: "", contactName: "", email: "", phone: "", quantity: "", budgetPerGift: "", neededBy: "", deliveryMethod: "", destinations: "", branding: [], cardMessage: "", logoLink: "", startingBox: "", customBox: false, preferredCategories: [], preferredMakers: "", message: "" };
export type GiftRequestField = keyof GiftRequestValues;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Problems with a request, keyed by field. Runs in the browser and on the server. */
export function giftRequestProblems(values: GiftRequestValues, today = new Date()): Partial<Record<GiftRequestField, string>> {
  const problems: Partial<Record<GiftRequestField, string>> = {};
  const text = (value: string) => value.trim();
  if (text(values.company).length < 2) problems.company = "Enter your company or organization.";
  if (text(values.contactName).length < 2) problems.contactName = "Enter your name.";
  if (!EMAIL.test(text(values.email))) problems.email = "Enter a valid email address, like name@example.com.";
  const digits = values.phone.replace(/\D/g, "");
  if (values.phone.trim() && !(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) problems.phone = "Enter a 10 digit US phone number, or leave it blank.";
  const quantity = Number(values.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) problems.quantity = "Enter about how many gifts you need.";
  else if (quantity > 10000) problems.quantity = "For more than 10,000 gifts, tell us in the message and enter 10000 here.";
  if (!(GIFT_BUDGETS as readonly string[]).includes(values.budgetPerGift)) problems.budgetPerGift = "Choose a budget per gift.";
  if (values.neededBy) {
    const date = new Date(`${values.neededBy}T12:00:00`);
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime())) problems.neededBy = "Choose a date.";
    else if (date < start) problems.neededBy = "Choose a date in the future.";
  }
  if (!(DELIVERY_METHODS as readonly string[]).includes(values.deliveryMethod)) problems.deliveryMethod = "Choose how the gifts should arrive.";
  if (values.deliveryMethod === "Shipping" && text(values.destinations).length < 2) problems.destinations = "Tell us where the gifts are going (cities, states, or how many addresses).";
  if (!values.branding.length) problems.branding = "Choose at least one, or No branding needed.";
  if (values.branding.includes("Custom card message") && text(values.cardMessage).length > 500) problems.cardMessage = "Keep the card message under 500 characters.";
  if (values.logoLink.trim() && !/^https?:\/\/\S+$/i.test(values.logoLink.trim())) problems.logoLink = "Paste a link that starts with https://, or email the logo to us later.";
  if (values.customBox && !values.preferredCategories.length && text(values.preferredMakers).length < 2) problems.preferredCategories = "Pick a few kinds of goods, or name makers you would like included.";
  if (text(values.message).length < 10) problems.message = "Tell us a little about the occasion (at least 10 characters).";
  else if (text(values.message).length > 2000) problems.message = "Keep the message under 2,000 characters.";
  return problems;
}

export const GIFT_REQUEST_FIELD_ORDER: GiftRequestField[] = ["company", "contactName", "email", "phone", "quantity", "budgetPerGift", "neededBy", "deliveryMethod", "destinations", "branding", "cardMessage", "logoLink", "startingBox", "customBox", "preferredCategories", "preferredMakers", "message"];

export const giftRequestSchema = z.object({
  company: z.string().max(140), contactName: z.string().max(120), email: z.string().max(254), phone: z.string().max(30),
  quantity: z.string().max(10), budgetPerGift: z.string().max(40), neededBy: z.string().max(10), deliveryMethod: z.string().max(40),
  destinations: z.string().max(400), branding: z.array(z.string().max(60)).max(6), cardMessage: z.string().max(600), logoLink: z.string().max(500),
  startingBox: z.string().max(160), customBox: z.boolean(), preferredCategories: z.array(z.string().max(60)).max(20), preferredMakers: z.string().max(400),
  message: z.string().max(2100),
  // Hidden field only bots fill in.
  website2: z.string().max(200).default(""),
}).superRefine((values, context) => {
  const problems = giftRequestProblems(values);
  for (const field of GIFT_REQUEST_FIELD_ORDER) if (problems[field]) context.addIssue({ code: "custom", path: [field], message: problems[field]! });
});
