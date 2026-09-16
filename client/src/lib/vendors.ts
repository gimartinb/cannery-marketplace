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
  spotlight?: "editorial" | "popular";
  displayOrder?: number;
  ownerBio?: string;
  makerStory?: string;
  workSamples?: { title: string; description: string; tone: string }[];
};

export const defaultVendors: Vendor[] = [
  { slug: "juniper-clay-studio", name: "Juniper Clay Studio", category: "Ceramics", bio: "Hand-thrown pottery made in small batches, with soft desert colors and everyday shapes designed to be used.", socialLabel: "@juniperclaystudio", socialUrl: "https://instagram.com/", initials: "JC", tone: "clay", active: true, featured: true, spotlight: "editorial", displayOrder: 1 },
  { slug: "golden-hour-goods", name: "Golden Hour Goods", category: "Home & Gifts", bio: "Thoughtful home goods and small gifts inspired by California light, slow mornings, and the little rituals that make a house a home.", socialLabel: "@goldenhourgoods", socialUrl: "https://instagram.com/", initials: "GH", tone: "sun", active: true, featured: true, spotlight: "editorial", displayOrder: 2 },
  { slug: "wildflower-paper-co", name: "Wildflower Paper Co.", category: "Paper & Art", bio: "Illustrated cards, prints, and paper goods that celebrate local landscapes, seasonal details, and sending a thoughtful note.", socialLabel: "@wildflowerpaperco", socialUrl: "https://instagram.com/", initials: "WP", tone: "sage", active: true },
  { slug: "moss-and-marrow", name: "Moss & Marrow", category: "Wearables", bio: "Small-run accessories with natural textures, tactile materials, and a quietly considered point of view.", socialLabel: "@mossandmarrow", socialUrl: "https://instagram.com/", initials: "MM", tone: "moss", active: true },
  { slug: "vivra-cafe", name: "VIVRA CAFÉ", category: "Coffee & Bakery", bio: "Café para vivir. A Mexican-inspired mobile coffee cart serving artisan espresso drinks, matcha lattes, and handcrafted Mexican pastries, with everything made from scratch. Recent public posts highlight hot matcha lattes, marranitos, and community pop-ups.", socialLabel: "@vivracafe", socialUrl: "https://www.instagram.com/vivracafe/", initials: "VC", tone: "cafe", active: true, featured: true, spotlight: "popular", displayOrder: 3 },
  { slug: "gilberts-woodworking", name: "Gilbert’s Woodworking", category: "Woodworking", bio: "Thoughtful handmade wood pieces built with patience, character, and a respect for the material.", socialLabel: "Add Gilbert’s social link", socialUrl: "https://instagram.com/", initials: "GW", tone: "wood", active: true, featured: false, ownerBio: "Gilbert is a local woodworker who enjoys giving beautiful, useful objects a second life through careful making and finishing. This profile is a layout mockup using placeholder copy until Gilbert approves his story.", makerStory: "From a small workshop to a shelf at The Cannery, Gilbert’s work is made to feel at home: warm, useful, and meant to be lived with. Each piece highlights the grain, texture, and small details that make handmade woodworking different from something mass-produced.", workSamples: [{ title: "Serving boards", description: "Warm-grain boards for everyday gatherings and thoughtful gifts.", tone: "wood-light" }, { title: "Small home goods", description: "Simple, useful pieces designed to bring natural texture into a room.", tone: "wood-dark" }, { title: "Custom projects", description: "A preview space for larger one-of-a-kind commissions and seasonal work.", tone: "wood-sage" }] },
];

export const vendorsStorageKey = "cannery-preview-vendors";

export function readVendors(): Vendor[] {
  if (typeof window === "undefined") return defaultVendors;
  try {
    const saved = window.localStorage.getItem(vendorsStorageKey);
    if (!saved) return defaultVendors;
    const parsed = JSON.parse(saved) as Vendor[];
    const gilbert = defaultVendors.find((vendor) => vendor.slug === "gilberts-woodworking");
    return gilbert && !parsed.some((vendor) => vendor.slug === gilbert.slug) ? [...parsed, gilbert] : parsed;
  } catch {
    return defaultVendors;
  }
}

export function saveVendors(next: Vendor[]) {
  if (typeof window !== "undefined") { window.localStorage.setItem(vendorsStorageKey, JSON.stringify(next)); window.dispatchEvent(new CustomEvent("cannery-vendors-updated")); }
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
