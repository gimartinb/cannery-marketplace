// The named image spots on the public site. Owners can replace any of these
// from the dashboard; the built-in defaults live in client/src/lib/siteImages.ts.
export const SITE_IMAGE_SLOT_IDS = ["logo", "home-hero", "marketplace-interior", "about-display", "social-sharing"] as const;
export type SiteImageSlotId = (typeof SITE_IMAGE_SLOT_IDS)[number];
export function isSiteImageSlot(value: string): value is SiteImageSlotId {
  return (SITE_IMAGE_SLOT_IDS as readonly string[]).includes(value);
}
