import { describe, expect, it } from "vitest";
import { formatLocalNumber, formatPhone, validateContact, type ContactValues } from "../client/src/components/ContactForm";

const valid: ContactValues = { fullName: "Nancy Smith", email: "nancy@example.com", areaCode: "", localNumber: "", message: "Do you carry local honey?" };

describe("contact form validation", () => {
  it("accepts a complete message with no phone", () => {
    expect(validateContact(valid)).toEqual({});
  });
  it("requires a first and last name", () => {
    expect(validateContact({ ...valid, fullName: "" }).fullName).toBeTruthy();
    expect(validateContact({ ...valid, fullName: "Nancy" }).fullName).toContain("first and last");
    expect(validateContact({ ...valid, fullName: "Mary-Jo O'Neil" }).fullName).toBeUndefined();
    expect(validateContact({ ...valid, fullName: "José García" }).fullName).toBeUndefined();
    expect(validateContact({ ...valid, fullName: "Bob <script>" }).fullName).toBeTruthy();
  });
  it("requires a valid email address", () => {
    for (const bad of ["", "nancy", "nancy@", "nancy@example", "nancy@@example.com", "nancy@example..com", "nancy smith@example.com"]) expect(validateContact({ ...valid, email: bad }).email).toBeTruthy();
    expect(validateContact({ ...valid, email: "nancy.smith+shop@example.co.uk" }).email).toBeUndefined();
  });
  it("validates a US phone number only when one is started", () => {
    expect(validateContact({ ...valid, areaCode: "408", localNumber: "555-1234" })).toEqual({});
    expect(validateContact({ ...valid, areaCode: "408" }).localNumber).toBeTruthy();
    expect(validateContact({ ...valid, areaCode: "108", localNumber: "555-1234" }).areaCode).toBeTruthy();
    expect(validateContact({ ...valid, areaCode: "408", localNumber: "155-1234" }).localNumber).toBeTruthy();
    expect(validateContact({ ...valid, areaCode: "40", localNumber: "555-123" }).areaCode).toBeTruthy();
  });
  it("formats the phone number as the visitor types", () => {
    expect(formatLocalNumber("5551234")).toBe("555-1234");
    expect(formatLocalNumber("555-12345678")).toBe("555-1234");
    expect(formatLocalNumber("55")).toBe("55");
    expect(formatPhone({ ...valid, areaCode: "408", localNumber: "555-1234" })).toBe("+1 (408) 555-1234");
  });
  it("requires a meaningful message", () => {
    expect(validateContact({ ...valid, message: "hi" }).message).toBeTruthy();
    expect(validateContact({ ...valid, message: "x".repeat(2001) }).message).toBeTruthy();
  });
});
