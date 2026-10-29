import { describe, expect, it } from "vitest";
import { resizeImageForPreview } from "../client/src/lib/imageProcessing";

describe("image upload processing", () => {
  it("rejects non-image files before attempting browser decoding", async () => {
    await expect(resizeImageForPreview({ type: "text/plain", size: 10 } as File)).rejects.toThrow("image file");
  });

});
