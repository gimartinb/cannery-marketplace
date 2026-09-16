import { describe, expect, it } from "vitest";
import { giftBoxes } from "../client/src/lib/giftBoxes";

describe("sample gift-box catalog", () => {
  it("contains three clearly labeled preview products", () => {
    expect(giftBoxes).toHaveLength(3);
    expect(giftBoxes.every((box) => box.checkoutUrl === null)).toBe(true);
    expect(giftBoxes.every((box) => box.price.startsWith("$"))).toBe(true);
  });

  it("uses unique slugs for future hosted checkout links", () => {
    const slugs = giftBoxes.map((box) => box.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
