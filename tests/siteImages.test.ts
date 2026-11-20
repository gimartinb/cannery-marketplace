import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defaultSiteImages } from "../client/src/lib/siteImages";
import { SITE_IMAGE_SLOT_IDS, isSiteImageSlot } from "../shared/siteImageSlots";

describe("site image library", () => {
  it("ships named image slots with accessibility metadata", () => {
    expect(defaultSiteImages.map((image) => image.id)).toEqual(expect.arrayContaining(["home-hero", "marketplace-interior", "about-display", "social-sharing"]));
    expect(defaultSiteImages.every((image) => image.url && image.alt && image.recommended)).toBe(true);
  });
  it("has a default for every editable spot, and every default file exists", () => {
    expect(defaultSiteImages.map((image) => image.id).sort()).toEqual([...SITE_IMAGE_SLOT_IDS].sort());
    for (const image of defaultSiteImages) expect(existsSync(resolve(import.meta.dirname, "../client/public", image.defaultUrl.slice(1)))).toBe(true);
  });
  it("only accepts known image spots", () => {
    expect(isSiteImageSlot("logo")).toBe(true);
    expect(isSiteImageSlot("../../etc")).toBe(false);
  });
});
