import { useMemo } from "react";
import type { SiteImageSlotId } from "@shared/siteImageSlots";
import { trpc } from "@/lib/trpc";
import { useOwnerPreview } from "@/lib/siteText";

export type SiteImage = { id: SiteImageSlotId; label: string; description: string; url: string; alt: string; caption: string; recommended: string; defaultUrl: string; customized: boolean };

type SiteImageDefault = Omit<SiteImage, "url" | "customized">;

// Built-in images that ship with the site (client/public/images). Owners can
// replace any of them from the dashboard; "Reset to original" brings these back.
const defaults: SiteImageDefault[] = [
  { id: "logo", label: "Marketplace logo", description: "The primary logo used in the header and footer.", defaultUrl: "/images/cannery-marketplace-logo.png", alt: "The Cannery Marketplace, Gilroy, California", caption: "The Cannery Marketplace", recommended: "Transparent PNG, about 1200 px wide" },
  { id: "home-hero", label: "Home hero", description: "The large opening image behind the homepage headline.", defaultUrl: "/images/cannery-pottery-hero.jpg", alt: "Hands shaping a handmade clay vessel at a pottery wheel", caption: "Made for discovery", recommended: "Wide landscape, 16:9 or wider, at least 1600 px wide" },
  { id: "marketplace-interior", label: "Marketplace interior", description: "The homepage story image showing the in-store experience.", defaultUrl: "/images/cannery-interior.jpg", alt: "Handcrafted goods displayed inside The Cannery Marketplace", caption: "Made for discovery", recommended: "Landscape, 4:3 or 3:2" },
  { id: "about-display", label: "About page display", description: "The image used in the About page story section.", defaultUrl: "/images/cannery-gilroy-products.jpg", alt: "A display of locally made Gilroy keepsakes and art", caption: "Local work, thoughtfully displayed", recommended: "Landscape, 4:3 or 3:2" },
  { id: "social-sharing", label: "Social sharing image", description: "The image used when pages are shared on social networks.", defaultUrl: "/images/cannery-interior.jpg", alt: "The Cannery Marketplace interior in Gilroy, California", caption: "The Cannery Marketplace, Gilroy, California", recommended: "Landscape, 1.91:1 (1200 x 630 px)" },
];

/** Built-in image details (label, default file, shape), for the owner portal. */
export const siteImageDefaults = defaults;

/** The built-in images only, with no owner replacements applied. */
export const defaultSiteImages: SiteImage[] = defaults.map((image) => ({ ...image, url: image.defaultUrl, customized: false }));

/** Every image spot, with the owner's replacement applied where one exists. Shows defaults while loading. */
export function useSiteImages(): SiteImage[] {
  const { data } = trpc.siteImages.list.useQuery(undefined, { staleTime: 5 * 60_000 });
  // While an owner previews drafts, show the draft images too.
  const preview = useOwnerPreview();
  const drafts = trpc.adminPortal.siteImagesPreview.useQuery(undefined, { enabled: preview, retry: false });
  const rows = preview && drafts.data ? drafts.data : data;
  return useMemo(() => {
    const overrides = new Map((rows || []).map((row) => [row.id, row]));
    return defaults.map((image) => {
      const override = overrides.get(image.id);
      return override ? { ...image, url: override.url, alt: override.alt || image.alt, customized: true } : { ...image, url: image.defaultUrl, customized: false };
    });
  }, [rows]);
}

/** One image spot, with the owner's replacement applied. */
export function useSiteImage(id: SiteImageSlotId): SiteImage {
  return useSiteImages().find((image) => image.id === id)!;
}
