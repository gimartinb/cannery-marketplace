import { describe, expect, it } from "vitest";
import { listingProblems, makerSubmissionSchema } from "../shared/makerListing";
import { checkImageSize } from "../shared/imageRequirements";
import { describeIssues } from "../shared/friendlyErrors";
import { ownerVendorSchema } from "../shared/vendorProfile";
import { pickLiveHighlights } from "../worker/db";
import { cleanSuggestion } from "../worker/aiWriting";

describe("AI description helper", () => {
  it("strips labels and quotes from the model reply", () => {
    expect(cleanSuggestion('Here is the improved description: "Hand built walnut boards made one at a time in Gilroy."')).toBe("Hand built walnut boards made one at a time in Gilroy.");
    expect(cleanSuggestion("ok")).toBeNull();
    expect(cleanSuggestion(undefined)).toBeNull();
  });
});

const complete = {
  name: "The 45 Workshop", ownerName: "Gilbert Martin", category: "Woodworking", shortBio: "Hand built boards and boxes from local walnut.",
  ownerBio: "Gilbert builds every piece in a small Gilroy shop, one board at a time.", contactEmail: "maker@example.com",
  websiteUrl: "", instagramUrl: "https://instagram.com/the45workshop", facebookUrl: "", tiktokUrl: "",
  coverImageUrl: "/media/vendor-1/cover.jpg", galleryImageUrls: ["/media/vendor-1/work.jpg"], featured: false, displayOrder: 100, active: true,
};

describe("maker listing rules", () => {
  it("accepts a complete listing with no website", () => {
    expect(listingProblems(complete)).toEqual({});
    expect(makerSubmissionSchema.safeParse(complete).success).toBe(true);
  });
  it("requires every field except the website, and at least one social link", () => {
    const problems = listingProblems({ ...complete, ownerName: "Gilbert", category: "Other", ownerBio: "", instagramUrl: "", coverImageUrl: "", galleryImageUrls: [] });
    expect(Object.keys(problems).sort()).toEqual(["category", "coverImageUrl", "galleryImageUrls", "ownerBio", "ownerName", "social"]);
    expect(makerSubmissionSchema.safeParse({ ...complete, instagramUrl: "" }).success).toBe(false);
  });
  it("accepts a maker's own category typed after choosing Other", () => {
    expect(listingProblems({ ...complete, category: "Leather Goods" })).toEqual({});
    expect(listingProblems({ ...complete, category: "x" }).category).toMatch(/between 3 and 40/);
  });
  it("rejects a social link on the wrong site", () => {
    expect(listingProblems({ ...complete, instagramUrl: "https://example.com/me" }).instagramUrl).toMatch(/Instagram/);
  });
});

describe("owner listing login email", () => {
  it("lowercases a valid email and allows blank", () => {
    expect(ownerVendorSchema.parse({ ...complete, loginEmail: "Gilbert.Martin@Gmail.com" }).loginEmail).toBe("gilbert.martin@gmail.com");
    expect(ownerVendorSchema.parse({ ...complete, loginEmail: "" }).loginEmail).toBe("");
    expect(ownerVendorSchema.safeParse({ ...complete, loginEmail: "not an email" }).success).toBe(false);
  });
});

describe("image size requirements", () => {
  it("enforces pixel minimums per spot", () => {
    expect(checkImageSize("home-hero", 1920, 1080)).toBeNull();
    expect(checkImageSize("home-hero", 1280, 720)).toMatch(/1280 x 720/);
    expect(checkImageSize("gallery", 1200, 1600)).toBeNull();
    expect(checkImageSize("maker-cover", 800, 600)).toBeNull();
    expect(checkImageSize("maker-cover", 640, 480)).toMatch(/at least 800 x 600/);
    expect(checkImageSize("maker-gallery", 700, 1200)).toMatch(/at least 800 x 800/);
  });
});

describe("readable errors", () => {
  it("names fields in plain words", () => {
    expect(describeIssues([{ path: ["shortBio"], code: "too_small", type: "string", minimum: 20, message: "String must contain at least 20 character(s)" }])).toBe("Short description needs at least 20 characters.");
    expect(describeIssues([{ path: ["vendors", 0, "contactEmail"], code: "invalid_string", message: "Invalid email" }])).toBe("Row 2: Contact email must be a valid email address, like name@example.com.");
  });
});

describe("home highlight rotation", () => {
  const day = 86_400_000;
  const now = new Date("2026-11-01T12:00:00Z");
  const row = (id: number, created: number, extra: Partial<{ startsAt: Date; endsAt: Date; displayOrder: number }> = {}) => ({ id, createdAt: new Date(now.getTime() - created * day), startsAt: extra.startsAt ?? null, endsAt: extra.endsAt ?? null, displayOrder: extra.displayOrder ?? id });
  it("shows the 3 newest live cards and hides expired or future ones", () => {
    const rows = [row(1, 10), row(2, 5), row(3, 4), row(4, 3), row(5, 1, { endsAt: new Date(now.getTime() - day) }), row(6, 1, { startsAt: new Date(now.getTime() + day) })];
    expect(pickLiveHighlights(rows, now).map((item) => item.id)).toEqual([2, 3, 4]);
  });
  it("orders the shown cards by position", () => {
    const rows = [row(1, 3, { displayOrder: 3 }), row(2, 2, { displayOrder: 1 }), row(3, 1, { displayOrder: 2 })];
    expect(pickLiveHighlights(rows, now).map((item) => item.id)).toEqual([2, 3, 1]);
  });
});
