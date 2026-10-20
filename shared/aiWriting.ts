import { z } from "zod";

// What the AI writing helper can work on, shared by the browser and the Worker.
export const AI_FIELDS = ["shortBio", "ownerBio", "highlight"] as const;
export type AiField = (typeof AI_FIELDS)[number];

export const aiWriteSchema = z.object({
  field: z.enum(AI_FIELDS),
  // improve: polish what they wrote. draft: write it for them from the listing details and a few notes.
  mode: z.enum(["improve", "draft"]),
  text: z.string().max(1800).default(""),
  notes: z.string().max(600).default(""),
  context: z.object({
    name: z.string().max(140).default(""),
    ownerName: z.string().max(120).default(""),
    category: z.string().max(100).default(""),
    shortBio: z.string().max(800).default(""),
    ownerBio: z.string().max(1800).default(""),
    title: z.string().max(80).default(""),
  }).default({ name: "", ownerName: "", category: "", shortBio: "", ownerBio: "", title: "" }),
});
export type AiWriteInput = z.infer<typeof aiWriteSchema>;
export type AiWriteRequest = z.input<typeof aiWriteSchema>;
