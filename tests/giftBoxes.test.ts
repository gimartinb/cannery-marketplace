import { describe, expect, it } from "vitest";
import { giftBoxes } from "../client/src/lib/giftBoxes";

describe("sample gift-box catalog", () => {
  it("contains emotionally clear preview occasions", () => {
    expect(giftBoxes).toHaveLength(5);
    expect(giftBoxes.every((box) => box.checkoutUrl === null)).toBe(true);
    expect(giftBoxes.every((box) => box.price.startsWith("$"))).toBe(true);
    expect(giftBoxes.every((box) => box.active)).toBe(true);
    expect(giftBoxes.map((box) => box.name)).toEqual(expect.arrayContaining([
      "New Baby Reveal",
      "Wedding Gift Box",
      "Thank You Box",
      "With Sympathy",
    ]));
  });

  it("uses unique slugs for future hosted checkout links", () => {
    const slugs = giftBoxes.map((box) => box.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
