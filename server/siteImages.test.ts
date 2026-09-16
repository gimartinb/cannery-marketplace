import { describe, expect, it } from "vitest";
import { defaultSiteImages } from "../client/src/lib/siteImages";

describe("site image library", () => {
  it("ships named image slots with accessibility metadata", () => {
    expect(defaultSiteImages.map((image) => image.id)).toEqual(expect.arrayContaining(["home-hero", "marketplace-interior", "about-display", "social-sharing"]));
    expect(defaultSiteImages.every((image) => image.url && image.alt && image.recommended)).toBe(true);
  });
});
