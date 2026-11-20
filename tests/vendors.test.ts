import { describe, expect, it } from "vitest";
import { defaultVendors } from "../client/src/lib/vendors";

describe("preview vendor directory", () => {
  it("includes Viva Café with public profile attribution", () => {
    const vivra = defaultVendors.find((vendor) => vendor.slug === "vivra-cafe");
    expect(vivra?.active).toBe(true);
    expect(vivra?.category).toBe("Coffee, Matcha & Bakery");
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

  it("supports an owner bio and work gallery for the profile template", () => {
    const gilbert = defaultVendors.find((vendor) => vendor.slug === "gilberts-woodworking");
    expect(gilbert?.ownerBio).toContain("placeholder copy");
    expect(gilbert?.workSamples).toHaveLength(3);
  });
});

import { vendorProfileSchema } from "../shared/vendorProfile";
import { MAKER_CATEGORIES } from "../shared/makerListing";
describe("renamed categories", () => {
  it("maps the old Coffee & Bakery name to the new one", () => {
    expect(MAKER_CATEGORIES).toContain("Coffee, Matcha & Bakery");
    expect(MAKER_CATEGORIES).not.toContain("Coffee & Bakery");
    const parsed = vendorProfileSchema.safeParse({ name: "Vivra Cafe", category: "Coffee & Bakery", shortBio: "Espresso, matcha, and pastries made fresh.", contactEmail: "hi@example.com" });
    expect(parsed.success && parsed.data.category).toBe("Coffee, Matcha & Bakery");
  });
});

import { categoryNameProblem } from "../worker/categories";
import { isListedCategory } from "../shared/makerListing";
describe("owner managed categories", () => {
  it("checks new category names", () => {
    expect(categoryNameProblem("Leather Goods")).toBeNull();
    expect(categoryNameProblem("ab")).toMatch(/3 characters/);
    expect(categoryNameProblem("Other")).toMatch(/built in/);
    expect(categoryNameProblem("<b>x</b>")).toMatch(/letters/);
  });
  it("uses the owners' list when given", () => {
    expect(isListedCategory("Leather Goods", ["Leather Goods", "Other"])).toBe(true);
    expect(isListedCategory("Ceramics", ["Leather Goods", "Other"])).toBe(false);
    expect(isListedCategory("Other", ["Other"])).toBe(false);
  });
});

import { addressMatchesName, suggestedAddress } from "../shared/listingAddress";
describe("maker page addresses", () => {
  it("flags an address that belongs to another name", () => {
    expect(addressMatchesName("J&R Scentuals", "gilberts-woodworking")).toBe(false);
    expect(suggestedAddress("J&R Scentuals")).toBe("j-r-scentuals");
    expect(addressMatchesName("J&R Scentuals", "j-r-scentuals")).toBe(true);
    expect(addressMatchesName("J&R Scentuals", "j-r-scentuals-2")).toBe(true);
    expect(addressMatchesName("Gilbert’s Woodworking", "gilbert-s-woodworking")).toBe(true);
    expect(addressMatchesName("Gilbert’s Woodworking", "gilberts-woodworking")).toBe(true);
    expect(suggestedAddress("VIVRA CAFÉ")).toBe("vivra-cafe");
    expect(addressMatchesName("Moss & Marrow", "moss-and-marrow")).toBe(true);
  });
});
