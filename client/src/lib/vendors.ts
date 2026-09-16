export type Vendor = {
  slug: string;
  name: string;
  category: string;
  bio: string;
  socialLabel: string;
  socialUrl: string;
  initials: string;
  tone: string;
  photoUrl?: string;
  active: boolean;
  featured?: boolean;
};

export const defaultVendors: Vendor[] = [
  { slug: "juniper-clay-studio", name: "Juniper Clay Studio", category: "Ceramics", bio: "Hand-thrown pottery made in small batches, with soft desert colors and everyday shapes designed to be used.", socialLabel: "@juniperclaystudio", socialUrl: "https://instagram.com/", initials: "JC", tone: "clay", active: true, featured: true },
  { slug: "golden-hour-goods", name: "Golden Hour Goods", category: "Home & Gifts", bio: "Thoughtful home goods and small gifts inspired by California light, slow mornings, and the little rituals that make a house a home.", socialLabel: "@goldenhourgoods", socialUrl: "https://instagram.com/", initials: "GH", tone: "sun", active: true, featured: true },
  { slug: "wildflower-paper-co", name: "Wildflower Paper Co.", category: "Paper & Art", bio: "Illustrated cards, prints, and paper goods that celebrate local landscapes, seasonal details, and sending a thoughtful note.", socialLabel: "@wildflowerpaperco", socialUrl: "https://instagram.com/", initials: "WP", tone: "sage", active: true },
  { slug: "moss-and-marrow", name: "Moss & Marrow", category: "Wearables", bio: "Small-run accessories with natural textures, tactile materials, and a quietly considered point of view.", socialLabel: "@mossandmarrow", socialUrl: "https://instagram.com/", initials: "MM", tone: "moss", active: true },
  { slug: "vivra-cafe", name: "VIVRA CAFÉ", category: "Coffee & Bakery", bio: "Café para vivir. A Mexican-inspired mobile coffee cart serving artisan espresso drinks, matcha lattes, and handcrafted Mexican pastries, with everything made from scratch. Recent public posts highlight hot matcha lattes, marranitos, and community pop-ups.", socialLabel: "@vivracafe", socialUrl: "https://www.instagram.com/vivracafe/", initials: "VC", tone: "cafe", active: true, featured: true },
];

export const vendorsStorageKey = "cannery-preview-vendors";

export function readVendors(): Vendor[] {
  if (typeof window === "undefined") return defaultVendors;
  try {
    const saved = window.localStorage.getItem(vendorsStorageKey);
    return saved ? JSON.parse(saved) as Vendor[] : defaultVendors;
  } catch {
    return defaultVendors;
  }
}

export function saveVendors(next: Vendor[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(vendorsStorageKey, JSON.stringify(next));
}

export function resetPreviewData() {
  if (typeof window !== "undefined") window.localStorage.removeItem(vendorsStorageKey);
}

export function getVendor(slug: string) {
  return readVendors().find((vendor) => vendor.slug === slug && vendor.active);
}

export function getCategories() {
  return ["All makers", ...Array.from(new Set(readVendors().filter((vendor) => vendor.active).map((vendor) => vendor.category)))];
}
