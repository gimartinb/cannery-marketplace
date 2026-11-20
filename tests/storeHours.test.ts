import { describe, expect, it } from "vitest";
import { DEFAULT_STORE_HOURS, formatHours, formatTime, hoursOn, openingHoursForSearch, parseStoreHours, storeHoursSchema, upcomingSpecials } from "../shared/storeHours";

const withThanksgiving = { ...DEFAULT_STORE_HOURS, specials: [{ id: "a", label: "Thanksgiving", start: "2026-11-26", end: "2026-11-26", open: false, from: "11:00", to: "16:00", note: "" }, { id: "b", label: "Holiday hours", start: "2026-12-18", end: "2026-12-23", open: true, from: "10:00", to: "20:00", note: "Extended for gift shopping" }] };

describe("store hours", () => {
  it("formats times", () => {
    expect(formatTime("11:00")).toBe("11 AM");
    expect(formatTime("18:30")).toBe("6:30 PM");
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatHours({ open: true, from: "11:00", to: "19:00" })).toBe("11 AM to 7 PM");
    expect(formatHours({ open: false, from: "11:00", to: "19:00" })).toBe("Closed");
  });
  it("uses holiday hours on those dates and regular hours otherwise", () => {
    expect(hoursOn(withThanksgiving, "2026-11-26")).toMatchObject({ special: true, open: false, label: "Thanksgiving" });
    expect(hoursOn(withThanksgiving, "2026-11-27")).toMatchObject({ special: false, open: true, weekday: "friday" });
    expect(hoursOn(withThanksgiving, "2026-12-20")).toMatchObject({ special: true, from: "10:00" });
  });
  it("lists upcoming specials within the notice window", () => {
    expect(upcomingSpecials(withThanksgiving, "2026-11-20", 21).map((item) => item.label)).toEqual(["Thanksgiving"]);
    expect(upcomingSpecials(withThanksgiving, "2026-11-27").map((item) => item.label)).toEqual(["Holiday hours"]);
  });
  it("checks times and dates", () => {
    expect(storeHoursSchema.safeParse({ ...DEFAULT_STORE_HOURS, week: { ...DEFAULT_STORE_HOURS.week, monday: { open: true, from: "18:00", to: "11:00" } } }).success).toBe(false);
    expect(storeHoursSchema.safeParse({ ...withThanksgiving, specials: [{ ...withThanksgiving.specials[0], end: "2026-11-01" }] }).success).toBe(false);
    expect(parseStoreHours("not json")).toEqual(DEFAULT_STORE_HOURS);
  });
  it("tells search engines about regular and special hours", () => {
    const data = openingHoursForSearch(withThanksgiving, "2026-11-01");
    expect(data.filter((item) => "dayOfWeek" in item)).toHaveLength(5);
    expect(data.find((item) => "validFrom" in item && item.validFrom === "2026-11-26")).toMatchObject({ opens: "00:00", closes: "00:00" });
  });
});
