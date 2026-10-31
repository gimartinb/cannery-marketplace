// Minimum pixel sizes for every place an image appears. Pixel size is what decides
// how sharp a photo looks on screen, so it is required. 300 DPI only matters for
// printing, so it is recommended, not enforced.

export type ImageSpot =
  | "logo" | "home-hero" | "marketplace-interior" | "about-display" | "social-sharing"
  | "highlight" | "gallery" | "maker-cover" | "maker-gallery" | "gift-box";

export type ImageRequirement = {
  label: string;
  minWidth: number;
  minHeight: number;
  /** "landscape" means wider than tall; "any" accepts either way as long as the long and short sides meet the minimums. */
  orientation: "landscape" | "any";
  shape: string;
  /** When set, the person frames the photo in this exact shape before it uploads. */
  crop?: { aspect: number; outputWidth: number; allowWholeImage?: boolean };
};

export const IMAGE_REQUIREMENTS: Record<ImageSpot, ImageRequirement> = {
  logo: { label: "Marketplace logo", minWidth: 600, minHeight: 150, orientation: "landscape", shape: "Transparent PNG, wider than tall" },
  "home-hero": { label: "Home hero", minWidth: 1920, minHeight: 1080, orientation: "landscape", shape: "Wide landscape, 16:9" },
  "marketplace-interior": { label: "Marketplace interior", minWidth: 1600, minHeight: 1200, orientation: "landscape", shape: "Landscape, 4:3" },
  "about-display": { label: "About page display", minWidth: 1600, minHeight: 1200, orientation: "landscape", shape: "Landscape, 4:3" },
  "social-sharing": { label: "Social sharing image", minWidth: 1200, minHeight: 630, orientation: "landscape", shape: "Landscape, 1.91:1" },
  highlight: { label: "Home highlight", minWidth: 1200, minHeight: 900, orientation: "any", shape: "You frame it as a 4:3 landscape after choosing it", crop: { aspect: 4 / 3, outputWidth: 1600, allowWholeImage: true } },
  gallery: { label: "About page gallery", minWidth: 1200, minHeight: 900, orientation: "any", shape: "You frame it as a 4:3 landscape after choosing it", crop: { aspect: 4 / 3, outputWidth: 1600 } },
  "maker-cover": { label: "Maker cover photo", minWidth: 800, minHeight: 600, orientation: "any", shape: "You frame it as a 4:3 landscape after choosing it. Logos can be shown whole", crop: { aspect: 4 / 3, outputWidth: 1600, allowWholeImage: true } },
  "gift-box": { label: "Gift box photo", minWidth: 1200, minHeight: 900, orientation: "any", shape: "You frame it as a 4:3 landscape after choosing it", crop: { aspect: 4 / 3, outputWidth: 1600 } },
  "maker-gallery": { label: "Maker work photo", minWidth: 800, minHeight: 800, orientation: "any", shape: "You frame it as a square after choosing it", crop: { aspect: 1, outputWidth: 1200, allowWholeImage: true } },
};

export const RECOMMENDED_DPI = 300;
export const MAX_IMAGE_MB = 5;

/** Explains the minimum in words, for pop ups and help text. */
export function describeRequirement(spot: ImageSpot) {
  const rule = IMAGE_REQUIREMENTS[spot];
  return rule.orientation === "any"
    ? `at least ${rule.minWidth} x ${rule.minHeight} pixels (either direction)`
    : `at least ${rule.minWidth} x ${rule.minHeight} pixels`;
}

/** Returns a readable reason the image is too small, or null when it meets the minimum. */
export function checkImageSize(spot: ImageSpot, width: number, height: number): string | null {
  const rule = IMAGE_REQUIREMENTS[spot];
  if (rule.orientation === "landscape") {
    if (width >= rule.minWidth && height >= rule.minHeight) return null;
    return `This image is ${width} x ${height} pixels. The ${rule.label.toLowerCase()} needs ${describeRequirement(spot)}.`;
  }
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  if (long >= Math.max(rule.minWidth, rule.minHeight) && short >= Math.min(rule.minWidth, rule.minHeight)) return null;
  return `This image is ${width} x ${height} pixels. A ${rule.label.toLowerCase()} needs ${describeRequirement(spot)}.`;
}
