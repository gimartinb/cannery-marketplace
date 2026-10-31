import { describe, expect, it } from "vitest";
import { compareListing, findLiveListing, wordDiff } from "../shared/changeDiff";
import { parseSiteText, plainSiteText, SITE_TEXT, SITE_TEXT_BY_KEY, siteTextProblem } from "../shared/siteText";
import { EMPTY_GIFT_REQUEST, giftBoxSchema, giftRequestProblems, priceToCents } from "../shared/gifts";
import { aiWriteSchema } from "../shared/aiWriting";
import { aiWrite, ruleFor } from "../worker/aiWriting";
import { checkoutLinkFor } from "../worker/gifts";

describe("review change highlights", () => {
  it("marks added and removed words", () => {
    const parts = wordDiff("Hand thrown mugs from Gilroy.", "Hand thrown mugs and bowls from Gilroy.");
    expect(parts.filter((part) => part.type === "added").map((part) => part.text).join("")).toContain("and bowls");
    expect(parts.some((part) => part.type === "removed")).toBe(false);
    expect(parts.map((part) => (part.type === "removed" ? "" : part.text)).join("")).toBe("Hand thrown mugs and bowls from Gilroy.");
  });

  it("lists only the fields that changed, including photos", () => {
    const live = { name: "Clay Co", category: "Ceramics", shortBio: "Mugs.", contactEmail: "a@b.com", instagramUrl: "https://instagram.com/clay", coverImageUrl: "/media/a.jpg", galleryImageUrls: ["/media/1.jpg", "/media/2.jpg"] };
    const next = { ...live, shortBio: "Mugs and bowls.", instagramUrl: "", galleryImageUrls: ["/media/2.jpg", "/media/3.jpg"] };
    const { isNew, changes } = compareListing(live, next);
    expect(isNew).toBe(false);
    expect(changes.map((change) => change.label)).toEqual(["Short description", "Instagram", "Gallery photos"]);
    const gallery = changes.find((change) => change.kind === "gallery");
    expect(gallery && gallery.kind === "gallery" ? [gallery.added, gallery.removed] : null).toEqual([["/media/3.jpg"], ["/media/1.jpg"]]);
  });

  it("treats a submission without a live listing as new, and finds the live one by id or address", () => {
    expect(compareListing(null, { name: "X", category: "Y", shortBio: "Z", contactEmail: "a@b.com" }).isNew).toBe(true);
    const listings = [{ id: 1, slug: "a" }, { id: 2, slug: "b" }];
    expect(findLiveListing(listings, { profileId: 2, slug: "zzz" })?.slug).toBe("b");
    expect(findLiveListing(listings, { profileId: null, slug: "a" })?.id).toBe(1);
    expect(findLiveListing(listings, { slug: "new" })).toBeNull();
  });
});

describe("site text", () => {
  it("has unique ids and originals within their limits", () => {
    expect(SITE_TEXT_BY_KEY.size).toBe(SITE_TEXT.length);
    for (const block of SITE_TEXT) expect(block.original.length, block.key).toBeLessThanOrEqual(block.maxChars);
  });

  it("never uses dashes in the original wording", () => {
    for (const block of SITE_TEXT) expect(/[–—]/.test(block.original), block.key).toBe(false);
  });

  it("formats accents, line breaks, and names", () => {
    expect(parseSiteText("Made here. *Found by you.*")).toEqual([{ text: "Made here. ", em: false }, { text: "Found by you.", em: true }]);
    expect(parseSiteText("Local makers.\nDistinctive work.").some((piece) => piece.br)).toBe(true);
    expect(plainSiteText("Meet *{maker}.*", { maker: "Maria" })).toBe("Meet Maria.");
  });

  it("rejects empty, too long, unknown, or tagged text", () => {
    expect(siteTextProblem("home.hero.title", "  ")).toMatch(/empty/);
    expect(siteTextProblem("home.hero.title", "x".repeat(500))).toMatch(/under 140/);
    expect(siteTextProblem("nope.key", "Hello")).toMatch(/not on the site/);
    expect(siteTextProblem("home.hero.title", "<script>bad</script>")).toMatch(/tags/);
    expect(siteTextProblem("home.hero.title", "Made *here*.")).toBeNull();
  });
});

describe("AI helper changes", () => {
  it("accepts a change request and keeps site text and gift boxes for owners", async () => {
    expect(aiWriteSchema.parse({ field: "shortBio", mode: "refine", text: "Some text here.", instruction: "Make it shorter" }).instruction).toBe("Make it shorter");
    const env = { AI: { run: async () => ({ response: "unused" }) } } as never;
    const request = aiWriteSchema.parse({ field: "siteText", mode: "draft", notes: "hours", context: { section: "Home", maxChars: 60, original: "Hi" } });
    await expect(aiWrite(env, {} as never, { email: "m@example.com", role: "maker" }, request)).rejects.toThrow(/owners/);
    await expect(aiWrite(env, {} as never, { email: "o@example.com", role: "owner" }, aiWriteSchema.parse({ field: "shortBio", mode: "refine", text: "A fine sentence about mugs." }))).rejects.toThrow(/what you would like changed/);
  });

  it("sizes site text suggestions to the spot", () => {
    const heading = ruleFor(aiWriteSchema.parse({ field: "siteText", mode: "improve", context: { section: "Home, headline", maxChars: 60 } }));
    expect(heading.maxChars).toBe(60);
    expect(heading.length).toMatch(/few words/);
    expect(ruleFor(aiWriteSchema.parse({ field: "siteText", mode: "improve", context: { maxChars: 900 } })).maxTokens).toBeLessThanOrEqual(450);
  });
});

describe("gift boxes and corporate requests", () => {
  it("reads prices", () => {
    expect(priceToCents("$72")).toBe(7200);
    expect(priceToCents("72.5")).toBe(7250);
    expect(priceToCents("$1,250.00")).toBe(125000);
    expect(priceToCents("about 70")).toBeNull();
  });

  it("only accepts https checkout links and uploaded photos", () => {
    const base = { name: "Thank You Box", price: "$68", description: "A warm thank you, ready to send." };
    expect(giftBoxSchema.safeParse({ ...base, checkoutUrl: "https://square.link/u/abc" }).success).toBe(true);
    expect(giftBoxSchema.safeParse({ ...base, checkoutUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(giftBoxSchema.safeParse({ ...base, imageUrl: "/media/site/gift/a.jpg" }).success).toBe(true);
    expect(giftBoxSchema.safeParse({ ...base, imageUrl: "data:image/png;base64,abc" }).success).toBe(false);
  });

  it("hides checkout links until a provider is chosen", () => {
    const settings = { provider: "none", providerName: "", storeUrl: "", squareLocationId: "", squareEnvironment: "sandbox", pickupNote: "" } as const;
    expect(checkoutLinkFor({ checkoutUrl: "https://square.link/u/abc" }, settings)).toBeNull();
    expect(checkoutLinkFor({ checkoutUrl: "https://square.link/u/abc" }, { ...settings, provider: "square_payment_links" })).toBe("https://square.link/u/abc");
    expect(checkoutLinkFor({ checkoutUrl: null }, { ...settings, provider: "other" })).toBeNull();
  });

  it("checks the corporate request form", () => {
    const today = new Date("2026-10-24T12:00:00");
    const empty = giftRequestProblems(EMPTY_GIFT_REQUEST, today);
    expect(Object.keys(empty).sort()).toEqual(["branding", "budgetPerGift", "company", "contactName", "deliveryMethod", "email", "message", "quantity"]);
    const good = { ...EMPTY_GIFT_REQUEST, company: "Acme", contactName: "Pat Lee", email: "pat@acme.com", quantity: "40", budgetPerGift: "$50 to $75", deliveryMethod: "Pickup at the marketplace", branding: ["No branding needed"], message: "Holiday gifts for our clients." };
    expect(giftRequestProblems(good, today)).toEqual({});
    expect(giftRequestProblems({ ...good, deliveryMethod: "Shipping" }, today).destinations).toBeTruthy();
    expect(giftRequestProblems({ ...good, neededBy: "2026-10-01" }, today).neededBy).toMatch(/future/);
    expect(giftRequestProblems({ ...good, customBox: true }, today).preferredCategories).toBeTruthy();
    expect(giftRequestProblems({ ...good, customBox: true, preferredCategories: ["Candles"] }, today)).toEqual({});
  });
});
