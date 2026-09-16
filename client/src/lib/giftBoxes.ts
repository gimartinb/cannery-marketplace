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
    slug: "made-in-gilroy-box",
    name: "Made in Gilroy Box",
    price: "$68",
    description: "A welcoming mix of small-batch goods from local makers.",
    details: "Sample box · 3–4 maker-made items",
    tone: "clay",
    initials: "MG",
    checkoutUrl: null,
  },
  {
    slug: "slow-morning-box",
    name: "Slow Morning Box",
    price: "$54",
    description: "A thoughtful collection for a quiet morning at home.",
    details: "Sample box · ceramics, paper, and pantry goods",
    tone: "sun",
    initials: "SM",
    checkoutUrl: null,
  },
  {
    slug: "thank-you-box",
    name: "Thank You Box",
    price: "$82",
    description: "A warm, gift-ready way to celebrate someone special.",
    details: "Sample box · gift note included",
    tone: "sage",
    initials: "TY",
    checkoutUrl: null,
  },
];
