import { describe, expect, it } from "vitest";
import { normalize } from "../client/src/components/BulkImageUploader";

describe("bulk image filename matching", () => {
  it("normalizes filenames to match maker and gift slugs", () => {
    expect(normalize("Viva Cafe.JPG")).toBe("viva-cafe");
    expect(normalize("new_baby_reveal-box.png")).toBe("new-baby-reveal-box");
  });
});
