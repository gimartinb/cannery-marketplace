import { z } from "zod";

// Emails the site sends for the owners. Each one starts from a template the owners
// can edit in the owner portal (Emails tab). Words in {curly brackets} are filled in
// for each person. A line that is only an empty {note} is left out.

export const EMAIL_TEMPLATE_IDS = [
  "makerWelcome", "applicationDeclined", "applicationReply",
  "listingApproved", "listingChanges", "listingRejected",
  "giftReply", "applicationReceived", "giftRequestReceived",
] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

export type EmailTemplate = { id: EmailTemplateId; label: string; when: string; automatic: boolean; placeholders: string[]; subject: string; body: string };

const SIGNATURE = "The Cannery Marketplace\n7488 Monterey Road, Gilroy, California\n(408) 337-1620";

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "makerWelcome", label: "Maker invite and welcome", when: "When a new maker is invited (sent automatically unless turned off below)", automatic: false,
    placeholders: ["firstName", "business", "email", "portalLink", "note"],
    subject: "Welcome to The Cannery Marketplace, {business}",
    body: `Hi {firstName},

Welcome to The Cannery Marketplace. We are excited to feature {business} on our website.

{note}

Your maker space is ready. To finish your listing:

1. Go to {portalLink}
2. Enter this email address: {email}
3. We will email you a one time code. Enter it to sign in. There is no password to remember.
4. Add your photos and story, then click Send for review.

Every listing is reviewed before it goes live, which can take up to 72 hours. Just reply to this email if you have any questions.

${SIGNATURE}`,
  },
  {
    id: "applicationDeclined", label: "Application declined", when: "When you decline a maker application", automatic: false,
    placeholders: ["firstName", "business", "note"],
    subject: "Your maker application: {business}",
    body: `Hi {firstName},

Thank you for sharing {business} with The Cannery Marketplace. We reviewed your maker application, and we are not able to offer a space right now.

{note}

We keep every application on file and may reach out if that changes. We truly appreciate your interest in our makers market.

${SIGNATURE}`,
  },
  {
    id: "applicationReply", label: "Reply to an applicant", when: "When you write to an applicant with a question", automatic: false,
    placeholders: ["firstName", "business", "note"],
    subject: "Your maker application: {business}",
    body: `Hi {firstName},

Thank you for your maker application for {business}.

{note}

${SIGNATURE}`,
  },
  {
    id: "listingApproved", label: "Listing approved", when: "When you approve a listing (automatic for a maker's first listing unless turned off below)", automatic: false,
    placeholders: ["firstName", "business", "listingLink", "note"],
    subject: "{business} is live on The Cannery Marketplace",
    body: `Hi {firstName},

Good news: your listing for {business} is approved and live on our website.

See it here: {listingLink}

{note}

You can update it any time from the maker portal. Changes are reviewed before they go live.

${SIGNATURE}`,
  },
  {
    id: "listingChanges", label: "Listing needs changes", when: "When you request changes to a listing", automatic: false,
    placeholders: ["firstName", "business", "portalLink", "note"],
    subject: "A few updates for your {business} listing",
    body: `Hi {firstName},

Thank you for sending your listing for {business}. Before we publish it, we have a few requests:

{note}

Sign in at {portalLink} to make the changes, then click Send for review again.

${SIGNATURE}`,
  },
  {
    id: "listingRejected", label: "Listing not approved", when: "When you reject a listing", automatic: false,
    placeholders: ["firstName", "business", "note"],
    subject: "About your {business} listing",
    body: `Hi {firstName},

Thank you for sending your listing for {business}. We are not able to publish it at this time.

{note}

Reply to this email if you have any questions.

${SIGNATURE}`,
  },
  {
    id: "giftReply", label: "Corporate gift reply", when: "When you reply to a corporate or custom gift request", automatic: false,
    placeholders: ["firstName", "company", "quantity", "quote", "note"],
    subject: "Your gift request with The Cannery Marketplace",
    body: `Hi {firstName},

Thank you for your request for {quantity} gifts for {company}.

{quote}

{note}

${SIGNATURE}`,
  },
  {
    id: "applicationReceived", label: "Thank you for applying", when: "Sent automatically when someone sends the maker application", automatic: true,
    placeholders: ["firstName", "business"],
    subject: "We received your maker application",
    body: `Hi {firstName},

Thank you for applying to The Cannery Marketplace with {business}. We received your application.

Our team reviews every application and will contact you by email if your work is a good fit for our store. Completing the application does not guarantee a space.

${SIGNATURE}`,
  },
  {
    id: "giftRequestReceived", label: "Thank you for your gift request", when: "Sent automatically when someone sends a corporate or custom gift request", automatic: true,
    placeholders: ["firstName", "company", "quantity"],
    subject: "We received your gift request",
    body: `Hi {firstName},

Thank you for reaching out about {quantity} gifts for {company}. We received your request and will reply by email with ideas, timing, and pricing.

${SIGNATURE}`,
  },
];

// Emails that can go out on their own (no preview), with the starting setting.
// makerWelcome: when a new maker is invited (their maker profile is created).
// listingApproved: when a maker's first listing is approved and published.
export const AUTO_SEND_TEMPLATES = ["makerWelcome", "listingApproved"] as const;
export type AutoSendTemplate = (typeof AUTO_SEND_TEMPLATES)[number];
export const DEFAULT_AUTO_SEND: Record<AutoSendTemplate, boolean> = { makerWelcome: true, listingApproved: true };

export const templateDefault = (id: EmailTemplateId) => DEFAULT_EMAIL_TEMPLATES.find((item) => item.id === id)!;

/** Fills in {placeholders}. Lines that end up empty because a placeholder was blank are removed. */
export function fillTemplate(text: string, values: Record<string, string | number | null | undefined>) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((line) => {
    const onlyPlaceholders = /^\s*(\{\w+\}\s*)+$/.test(line);
    const filled = line.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name] ?? "") : match));
    return onlyPlaceholders && !filled.trim() ? null : filled;
  }).filter((line): line is string => line !== null);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export const emailTemplateInput = z.object({
  id: z.enum(EMAIL_TEMPLATE_IDS),
  subject: z.string().trim().min(3, "Add a subject.").max(200),
  body: z.string().trim().min(20, "The message is too short.").max(6000),
});

export const sendEmailInput = z.object({
  template: z.enum(EMAIL_TEMPLATE_IDS),
  to: z.string().trim().toLowerCase().email("Check the email address.").max(320),
  subject: z.string().trim().min(3, "Add a subject.").max(200),
  body: z.string().trim().min(10, "The message is too short.").max(8000),
  // What the email is about, for the sent log (for example "application:12").
  about: z.string().max(80).default(""),
});
export type SendEmailInput = z.infer<typeof sendEmailInput>;
