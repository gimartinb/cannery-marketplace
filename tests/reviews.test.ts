import { describe, expect, it } from "vitest";
import { EMPTY_REVIEW, ownerReviewSchema, reviewEditSchema, reviewProblems, reviewSubmitSchema, summarize } from "../shared/reviews";
import { editReview } from "../worker/reviews";

/** A tiny stand in for the database: one review row, records the last update. */
function fakeDb(row: Record<string, unknown>) {
  const state: { saved?: Record<string, unknown> } = {};
  const chain = { from: () => chain, where: () => chain, limit: async () => [row] };
  const db = { select: () => chain, update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { state.saved = values; } }) }) };
  return { db: db as never, state };
}
const shopperRow = { id: 1, profileId: null, rating: 2, body: "Slow line, nice candles thoo.", reviewerName: "Sam", reviewerCity: "Gilroy", source: "website", photoUrl: "/media/review/a.jpg", originalBody: null };
const edit = (changes: Record<string, unknown> = {}) => reviewEditSchema.parse({ id: 1, profileId: null, rating: 2, body: "Slow line, nice candles though.", reviewerName: "Sam", reviewerCity: "Gilroy", source: "website", ...changes });

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
  it("never lets owners change a shopper's stars", async () => {
    const { db } = fakeDb(shopperRow);
    await expect(editReview(db, edit({ rating: 5 }), "owner@x.com")).rejects.toThrow(/star rating/);
    await expect(editReview(db, edit({ source: "google" }), "owner@x.com")).rejects.toThrow(/our website/);
  });
  it("keeps the shopper's original words and can remove a photo", async () => {
    const { db, state } = fakeDb(shopperRow);
    const result = await editReview(db, edit({ removePhoto: true }), "owner@x.com");
    expect(state.saved).toMatchObject({ body: "Slow line, nice candles though.", originalBody: shopperRow.body, photoUrl: null, editedBy: "owner@x.com", rating: 2 });
    expect(result.removedPhoto).toBe("/media/review/a.jpg");
  });
  it("lets owners fully correct reviews they added", async () => {
    const { db, state } = fakeDb({ ...shopperRow, source: "google" });
    await editReview(db, edit({ rating: 5, source: "instagram" }), "owner@x.com");
    expect(state.saved).toMatchObject({ rating: 5, source: "instagram" });
    await expect(editReview(db, edit({ rating: 5, source: "website" }), "owner@x.com")).rejects.toThrow(/came from/);
  });
});
