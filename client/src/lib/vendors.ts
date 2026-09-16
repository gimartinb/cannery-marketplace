export type Vendor = {
  slug: string;
  name: string;
  category: string;
  bio: string;
  socialLabel: string;
  socialUrl: string;
  initials: string;
  tone: string;
  featured?: boolean;
};

// Stage 2 preview content. This shape maps directly to the future Airtable fields.
export const vendors: Vendor[] = [
  {
    slug: "juniper-clay-studio",
    name: "Juniper Clay Studio",
    category: "Ceramics",
    bio: "Hand-thrown pottery made in small batches, with soft desert colors and everyday shapes designed to be used.",
    socialLabel: "@juniperclaystudio",
    socialUrl: "https://instagram.com/",
    initials: "JC",
    tone: "clay",
    featured: true,
  },
  {
    slug: "golden-hour-goods",
    name: "Golden Hour Goods",
    category: "Home & Gifts",
    bio: "Thoughtful home goods and small gifts inspired by California light, slow mornings, and the little rituals that make a house a home.",
    socialLabel: "@goldenhourgoods",
    socialUrl: "https://instagram.com/",
    initials: "GH",
    tone: "sun",
    featured: true,
  },
  {
    slug: "wildflower-paper-co",
    name: "Wildflower Paper Co.",
    category: "Paper & Art",
    bio: "Illustrated cards, prints, and paper goods that celebrate local landscapes, seasonal details, and sending a thoughtful note.",
    socialLabel: "@wildflowerpaperco",
    socialUrl: "https://instagram.com/",
    initials: "WP",
    tone: "sage",
  },
  {
    slug: "moss-and-marrow",
    name: "Moss & Marrow",
    category: "Wearables",
    bio: "Small-run accessories with natural textures, tactile materials, and a quietly considered point of view.",
    socialLabel: "@mossandmarrow",
    socialUrl: "https://instagram.com/",
    initials: "MM",
    tone: "moss",
  },
];

export const categories = ["All makers", ...Array.from(new Set(vendors.map((vendor) => vendor.category)))];

export function getVendor(slug: string) {
  return vendors.find((vendor) => vendor.slug === slug);
}
