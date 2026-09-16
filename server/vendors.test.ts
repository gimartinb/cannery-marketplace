import { describe, expect, it } from "vitest";
import { defaultVendors } from "../client/src/lib/vendors";

describe("preview vendor directory", () => {
  it("includes Viva Café with public profile attribution", () => {
    const vivra = defaultVendors.find((vendor) => vendor.slug === "vivra-cafe");
    expect(vivra?.active).toBe(true);
    expect(vivra?.category).toBe("Coffee & Bakery");
    expect(vivra?.socialUrl).toContain("instagram.com/vivracafe");
    expect(vivra?.bio).toContain("Mexican-inspired");
  });

  it("keeps searchable content broad enough for name, category, and bio", () => {
    const vivra = defaultVendors.find((vendor) => vendor.slug === "vivra-cafe");
    expect([vivra?.name, vivra?.category, vivra?.bio].join(" ").toLowerCase()).toContain("coffee");
    expect(vivra?.bio.toLowerCase()).toContain("marranitos");
  });

  it("supports ordered editorial and popular spotlight labels", () => {
    const spotlighted = defaultVendors.filter((vendor) => vendor.featured).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    expect(spotlighted).toHaveLength(3);
    expect(spotlighted[0]?.spotlight).toBe("editorial");
    expect(spotlighted[2]?.spotlight).toBe("popular");
  });
});
