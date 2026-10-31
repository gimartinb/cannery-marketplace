import { describe, expect, it } from "vitest";
import { DEFAULT_MARKETPLACE_SOCIALS, marketplaceSocialSchema, parseMarketplaceSocials } from "../shared/marketplaceSocial";

describe("marketplace social links", () => {
  it("turns handles into links and allows blanks", () => {
    expect(marketplaceSocialSchema.parse({ instagram: "@the_cannery", facebook: "", tiktok: "@cannery" })).toEqual({ instagram: "https://instagram.com/the_cannery", facebook: "", tiktok: "https://tiktok.com/@cannery" });
  });
  it("rejects a link to the wrong site", () => {
    expect(marketplaceSocialSchema.safeParse({ instagram: "https://evil.example/x", facebook: "", tiktok: "" }).success).toBe(false);
  });
  it("falls back to the defaults when nothing is saved", () => {
    expect(parseMarketplaceSocials("")).toEqual(DEFAULT_MARKETPLACE_SOCIALS);
    expect(parseMarketplaceSocials("not json")).toEqual(DEFAULT_MARKETPLACE_SOCIALS);
  });
});
