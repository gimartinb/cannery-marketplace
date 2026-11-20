import { z } from "zod";

// What the AI writing helper can work on, shared by the browser and the Worker.
// siteText and giftBox are for owners only (the site text editor and gift boxes).
export const AI_FIELDS = ["shortBio", "ownerBio", "highlight", "siteText", "giftBox"] as const;
export type AiField = (typeof AI_FIELDS)[number];
export const OWNER_ONLY_AI_FIELDS: AiField[] = ["siteText", "giftBox"];

/** Quick requests shown as buttons when changing a suggestion. */
export const AI_QUICK_CHANGES = ["Make it shorter", "Make it warmer", "Add a little more detail", "Use simpler words", "Make it more professional"] as const;

export const aiWriteSchema = z.object({
  field: z.enum(AI_FIELDS),
  // improve: polish what they wrote. draft: write it from the details and a few notes.
  // refine: change a suggestion the way the person asks ("make it shorter").
  mode: z.enum(["improve", "draft", "refine"]),
  text: z.string().max(2400).default(""),
  notes: z.string().max(600).default(""),
  instruction: z.string().max(300).default(""),
  context: z.object({
    name: z.string().max(140).default(""),
    ownerName: z.string().max(120).default(""),
    category: z.string().max(100).default(""),
    shortBio: z.string().max(800).default(""),
    ownerBio: z.string().max(1800).default(""),
    title: z.string().max(80).default(""),
    // Site text editor: where the text appears ("Home page, opening paragraph") and its length limit.
    section: z.string().max(160).default(""),
    maxChars: z.number().int().min(10).max(2400).default(0),
    // The text that was there originally, so a draft keeps the same purpose.
    original: z.string().max(2400).default(""),
  }).default({ name: "", ownerName: "", category: "", shortBio: "", ownerBio: "", title: "", section: "", maxChars: 0, original: "" }),
});
export type AiWriteInput = z.infer<typeof aiWriteSchema>;
export type AiWriteRequest = z.input<typeof aiWriteSchema>;
