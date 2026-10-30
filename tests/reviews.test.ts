import { describe, expect, it } from "vitest";
import { EMPTY_REVIEW, ownerReviewSchema, reviewProblems, reviewSubmitSchema, summarize } from "../shared/reviews";

const good = { ...EMPTY_REVIEW, rating: 5, body: "Beautiful candle, smells like a Gilroy summer.", reviewerName: "Maria", reviewerCity: "Gilroy" };

describe("reviews", () => {
  it("checks the review form", () => {
    expect(reviewProblems(good)).toEqual({});
    expect(Object.keys(reviewProblems(EMPTY_REVIEW)).sort()).toEqual(["body", "rating", "reviewerName"]);
    expect(reviewProblems({ ...good, body: "Great, see www.spam.example for deals!!" }).body).toMatch(/links/);
    expect(reviewProblems({ ...good, email: "nope" }).email).toBeTruthy();
    expect(reviewProblems({ ...good, rating: 6 }).rating).toBeTruthy();
  });
  it("only accepts photos uploaded through the form", () => {
    expect(reviewSubmitSchema.safeParse({ slug: "maker", ...good, photoUrl: "/media/review/abc123.jpg" }).success).toBe(true);
    expect(reviewSubmitSchema.safeParse({ slug: "maker", ...good, photoUrl: "https://evil.example/x.jpg" }).success).toBe(false);
  });
  it("requires owners to confirm a review is real", () => {
    const base = { profileId: null, rating: 5, body: "Lovely shop, great makers.", reviewerName: "Ana R.", source: "google" as const };
    expect(ownerReviewSchema.safeParse({ ...base, confirmed: false }).success).toBe(false);
    expect(ownerReviewSchema.safeParse({ ...base, confirmed: true }).success).toBe(true);
  });
  it("averages ratings", () => {
    expect(summarize([])).toEqual({ count: 0, average: 0 });
    expect(summarize([5, 4, 4])).toEqual({ count: 3, average: 4.3 });
  });
});
