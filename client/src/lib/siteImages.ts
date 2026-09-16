export type SiteImage = { id: string; label: string; description: string; url: string; alt: string; caption: string; recommended: string; defaultUrl: string };

export const defaultSiteImages: SiteImage[] = [
  { id: "logo", label: "Marketplace logo", description: "The primary logo used in the header and footer.", url: "/manus-storage/cannery-marketplace-logo_659f3936.png", alt: "The Cannery Marketplace — Gilroy, California", caption: "The Cannery Marketplace", recommended: "Transparent PNG or SVG", defaultUrl: "/manus-storage/cannery-marketplace-logo_659f3936.png" },
  { id: "home-hero", label: "Home hero", description: "The large opening image behind the homepage headline.", url: "/manus-storage/cannery-pottery-hero_00e4b0af.jpg", alt: "Hands shaping a handmade clay vessel at a pottery wheel", caption: "Made for discovery", recommended: "Wide landscape · 16:9 or wider", defaultUrl: "/manus-storage/cannery-pottery-hero_00e4b0af.jpg" },
  { id: "marketplace-interior", label: "Marketplace interior", description: "The homepage story image showing the in-store experience.", url: "/manus-storage/cannery-interior_1da69d7b.jpg", alt: "Handcrafted goods displayed inside The Cannery Marketplace", caption: "Made for discovery", recommended: "Landscape · 4:3 or 3:2", defaultUrl: "/manus-storage/cannery-interior_1da69d7b.jpg" },
  { id: "about-display", label: "About page display", description: "The image used in the About page story section.", url: "/manus-storage/cannery-gilroy-products_9830a398.jpg", alt: "A display of locally made Gilroy keepsakes and art", caption: "Local work, thoughtfully displayed", recommended: "Landscape · 4:3 or 3:2", defaultUrl: "/manus-storage/cannery-gilroy-products_9830a398.jpg" },
  { id: "social-sharing", label: "Social sharing image", description: "The image used when pages are shared on social networks.", url: "/manus-storage/cannery-interior_1da69d7b.jpg", alt: "The Cannery Marketplace interior in Gilroy, California", caption: "The Cannery Marketplace · Gilroy, California", recommended: "Landscape · 1.91:1", defaultUrl: "/manus-storage/cannery-interior_1da69d7b.jpg" },
];

export const siteImagesStorageKey = "cannery-preview-site-images";

export function readSiteImages(): SiteImage[] {
  if (typeof window === "undefined") return defaultSiteImages;
  try { const saved = window.localStorage.getItem(siteImagesStorageKey); return saved ? JSON.parse(saved) as SiteImage[] : defaultSiteImages; } catch { return defaultSiteImages; }
}

export function saveSiteImages(images: SiteImage[]) { if (typeof window !== "undefined") window.localStorage.setItem(siteImagesStorageKey, JSON.stringify(images)); }
export function resetSiteImages() { if (typeof window !== "undefined") window.localStorage.removeItem(siteImagesStorageKey); }
