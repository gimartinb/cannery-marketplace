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
});
