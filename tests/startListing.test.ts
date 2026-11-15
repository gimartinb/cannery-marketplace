import { describe, expect, it } from "vitest";
import { startListingSchema } from "../shared/vendorProfile";

describe("starting a listing for a maker", () => {
  it("needs only the business name and the maker's email", () => {
    const parsed = startListingSchema.parse({ email: "Maker@Example.com", name: "HGC" });
    expect(parsed).toMatchObject({ email: "maker@example.com", name: "HGC", category: "", shortBio: "", contactEmail: "" });
  });
  it("turns social handles into links", () => {
    expect(startListingSchema.parse({ email: "a@b.co", name: "HGC", instagramUrl: "@hgc" }).instagramUrl).toBe("https://instagram.com/hgc");
  });
  it("rejects a missing name or a bad email", () => {
    expect(startListingSchema.safeParse({ email: "a@b.co", name: "" }).success).toBe(false);
    expect(startListingSchema.safeParse({ email: "not an email", name: "HGC" }).success).toBe(false);
  });
});
