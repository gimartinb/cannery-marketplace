import { z } from "zod";
import { normalizeLink } from "./socialLinks";

// The marketplace's own social accounts, shown in the "Follow us" band and the footer.
// Owners edit them in Edit pages, under "Every page". Blank hides that button.
export const MARKETPLACE_SOCIALS = ["instagram", "facebook", "tiktok"] as const;
export type MarketplaceSocial = (typeof MARKETPLACE_SOCIALS)[number];
export type MarketplaceSocialLinks = Record<MarketplaceSocial, string>;
export const SOCIAL_LABEL: Record<MarketplaceSocial, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

export const DEFAULT_MARKETPLACE_SOCIALS: MarketplaceSocialLinks = {
  instagram: "https://www.instagram.com/the_cannery_marketplace_/",
  facebook: "https://www.facebook.com/events/downtown-gilroy/cannery-marketplace/188143524348078/",
  tiktok: "",
};

const HOSTS: Record<MarketplaceSocial, string[]> = { instagram: ["instagram.com"], facebook: ["facebook.com", "fb.com"], tiktok: ["tiktok.com"] };

const socialField = (kind: MarketplaceSocial) => z.string().trim().max(400).transform((value) => normalizeLink(kind, value)).refine((value) => {
  if (!value) return true;
  try { const host = new URL(value).hostname.toLowerCase().replace(/^(www|m)\./, ""); return HOSTS[kind].some((allowed) => host === allowed || host.endsWith(`.${allowed}`)); } catch { return false; }
}, `Enter the ${SOCIAL_LABEL[kind]} link or @handle, or leave it blank.`);

export const marketplaceSocialSchema = z.object({ instagram: socialField("instagram"), facebook: socialField("facebook"), tiktok: socialField("tiktok") });

/** Reads the saved setting; anything missing or broken falls back to the defaults. */
export function parseMarketplaceSocials(raw: string): MarketplaceSocialLinks {
  if (!raw) return { ...DEFAULT_MARKETPLACE_SOCIALS };
  try { const parsed = marketplaceSocialSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data : { ...DEFAULT_MARKETPLACE_SOCIALS }; } catch { return { ...DEFAULT_MARKETPLACE_SOCIALS }; }
}
