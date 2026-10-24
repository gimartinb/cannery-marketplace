import { describe, expect, it } from "vitest";
import { applicationProblems, applicationSchema, EMPTY_APPLICATION, formatApplicationPhone } from "../shared/application";

const complete = {
  ...EMPTY_APPLICATION,
  businessName: "The Forty-Five Workshop", address: "100 Main St, Gilroy, CA 95020", instagramUrl: "https://instagram.com/the45workshop",
  tagline: "Hand built walnut boards and boxes.", productDescription: "Cutting boards, serving trays, and keepsake boxes made from local walnut.",
  fullName: "Gilbert Martin", email: "maker@example.com", areaCode: "408", localNumber: "555-1234", referredBy: "QR code in the store",
  categories: ["Home Decor"], salesChannels: ["Craft Shows", "Etsy"],
};

describe("vendor interest form", () => {
  it("accepts a complete form without a website", () => {
    expect(applicationProblems(complete)).toEqual({});
    expect(applicationSchema.safeParse(complete).success).toBe(true);
    expect(formatApplicationPhone(complete)).toBe("(408) 555-1234");
  });
  it("requires every answer except the website and social links", () => {
    const problems = applicationProblems({ ...EMPTY_APPLICATION });
    expect(Object.keys(problems).sort()).toEqual(["businessName", "address", "categories", "email", "fullName", "phone", "productDescription", "referredBy", "salesChannels", "tagline"].sort());
  });
  it("asks for details when Other is chosen", () => {
    const problems = applicationProblems({ ...complete, categories: ["Other"], salesChannels: ["Other"] });
    expect(problems.categoryOther).toBeTruthy();
    expect(problems.salesOther).toBeTruthy();
  });
  it("checks link sites and US phone numbers", () => {
    expect(applicationProblems({ ...complete, instagramUrl: "https://example.com/me" }).instagramUrl).toMatch(/Instagram/);
    expect(applicationProblems({ ...complete, instagramUrl: "@the45workshop", facebookUrl: "the45workshop", websiteUrl: "the45workshop.com" })).toEqual({});
    expect(applicationProblems({ ...complete, areaCode: "108" }).areaCode).toMatch(/area code/);
  });
});
