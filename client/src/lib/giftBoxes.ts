export type GiftBox = {
  slug: string;
  name: string;
  price: string;
  description: string;
  details: string;
  tone: string;
  initials: string;
  checkoutUrl: string | null;
  photoUrl?: string;
  active: boolean;
};

export const defaultGiftBoxes: GiftBox[] = [
  { slug: "new-baby-reveal-box", name: "New Baby Reveal", price: "$72", description: "A joyful little welcome for the newest person in the family—and the people learning to love a whole new life.", details: "Sample box · keepsake, cozy good, and sweet treat", tone: "sage", initials: "NB", checkoutUrl: null, active: true },
  { slug: "wedding-gift-box", name: "Wedding Gift Box", price: "$88", description: "A thoughtful way to toast the couple, honor their new chapter, and give them something beautiful to enjoy together.", details: "Sample box · celebratory maker-made gifts", tone: "sun", initials: "WG", checkoutUrl: null, active: true },
  { slug: "thank-you-box", name: "Thank You Box", price: "$68", description: "For the person who showed up, went the extra mile, or made a hard day feel lighter. A warm thank-you, ready to send.", details: "Sample box · gift note included", tone: "clay", initials: "TY", checkoutUrl: null, active: true },
  { slug: "with-sympathy-box", name: "With Sympathy", price: "$74", description: "A gentle gesture for a difficult season—quiet comforts chosen to say, ‘I’m thinking of you,’ when words are hard to find.", details: "Sample box · comforting goods and handwritten note", tone: "moss", initials: "WS", checkoutUrl: null, active: true },
  { slug: "made-in-gilroy-box", name: "Made in Gilroy Box", price: "$78", description: "A warm introduction to the makers of The Cannery—perfect for a new neighbor, a host, or someone you want to bring a little Gilroy to.", details: "Sample box · 3–4 maker-made items", tone: "cafe", initials: "MG", checkoutUrl: null, active: true },
];

export const giftBoxesStorageKey = "cannery-preview-gift-boxes";

export function readGiftBoxes(): GiftBox[] {
  if (typeof window === "undefined") return defaultGiftBoxes;
  try {
    const saved = window.localStorage.getItem(giftBoxesStorageKey);
    return saved ? JSON.parse(saved) as GiftBox[] : defaultGiftBoxes;
  } catch {
    return defaultGiftBoxes;
  }
}

export function saveGiftBoxes(next: GiftBox[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(giftBoxesStorageKey, JSON.stringify(next));
}

export function resetGiftBoxes() {
  if (typeof window !== "undefined") window.localStorage.removeItem(giftBoxesStorageKey);
}

export const giftBoxes = defaultGiftBoxes;
