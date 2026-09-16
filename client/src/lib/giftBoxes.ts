export type GiftBox = {
  slug: string;
  name: string;
  price: string;
  description: string;
  details: string;
  tone: string;
  initials: string;
  checkoutUrl: string | null;
};

// Sample catalog only. Replace with live Stripe Payment Links after account setup.
export const giftBoxes: GiftBox[] = [
  {
    slug: "new-baby-reveal-box",
    name: "New Baby Reveal",
    price: "$72",
    description: "A joyful little welcome for the newest person in the family—and the people learning to love a whole new life.",
    details: "Sample box · keepsake, cozy good, and sweet treat",
    tone: "sage",
    initials: "NB",
    checkoutUrl: null,
  },
  {
    slug: "wedding-gift-box",
    name: "Wedding Gift Box",
    price: "$88",
    description: "A thoughtful way to toast the couple, honor their new chapter, and give them something beautiful to enjoy together.",
    details: "Sample box · celebratory maker-made gifts",
    tone: "sun",
    initials: "WG",
    checkoutUrl: null,
  },
  {
    slug: "thank-you-box",
    name: "Thank You Box",
    price: "$68",
    description: "For the person who showed up, went the extra mile, or made a hard day feel lighter. A warm thank-you, ready to send.",
    details: "Sample box · gift note included",
    tone: "clay",
    initials: "TY",
    checkoutUrl: null,
  },
  {
    slug: "with-sympathy-box",
    name: "With Sympathy",
    price: "$74",
    description: "A gentle gesture for a difficult season—quiet comforts chosen to say, ‘I’m thinking of you,’ when words are hard to find.",
    details: "Sample box · comforting goods and handwritten note",
    tone: "moss",
    initials: "WS",
    checkoutUrl: null,
  },
  {
    slug: "made-in-gilroy-box",
    name: "Made in Gilroy Box",
    price: "$78",
    description: "A warm introduction to the makers of The Cannery—perfect for a new neighbor, a host, or someone you want to bring a little Gilroy to.",
    details: "Sample box · 3–4 maker-made items",
    tone: "cafe",
    initials: "MG",
    checkoutUrl: null,
  },
];
