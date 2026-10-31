import { describe, expect, it } from "vitest";
import { estimateNeurons, pickUnused } from "../worker/usage";

describe("free tier guardrails", () => {
  it("estimates Workers AI neurons from token counts", () => {
    // About 400 tokens in and 150 out costs roughly 7 neurons on the model we use.
    expect(estimateNeurons(400, 150)).toBe(7);
    expect(estimateNeurons(0, 0)).toBe(1);
  });

  it("only removes our own photos that nothing uses and that are over a week old", () => {
    const now = Date.parse("2026-11-01T00:00:00Z");
    const old = new Date(now - 10 * 86_400_000);
    const recent = new Date(now - 2 * 86_400_000);
    const objects = [
      { key: "vendor-3/cover_a.jpg", size: 100, uploaded: old },        // used by a listing: keep
      { key: "vendor-3/replaced_b.jpg", size: 200, uploaded: old },     // replaced long ago: remove
      { key: "vendor-owner/draft_c.jpg", size: 300, uploaded: recent }, // uploaded this week: keep
      { key: "site/home-hero_d.jpg", size: 400, uploaded: old },        // unused site image: remove
      { key: "legacy-upload.jpg", size: 500, uploaded: old },           // not one of our folders: never touch
    ];
    const referenced = new Set(["vendor-3/cover_a.jpg"]);
    expect(pickUnused(objects, referenced, now).map((object) => object.key)).toEqual(["vendor-3/replaced_b.jpg", "site/home-hero_d.jpg"]);
  });

  it("removes nothing if the reference lookup came back empty", () => {
    const old = new Date(Date.now() - 30 * 86_400_000);
    expect(pickUnused([{ key: "vendor-1/a.jpg", size: 1, uploaded: old }], new Set())).toEqual([]);
  });
});
