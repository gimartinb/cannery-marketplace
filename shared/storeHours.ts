import { z } from "zod";

// Store hours: the regular week, plus holidays and special hours for set dates.
// Times are 24 hour "HH:MM" in Gilroy (Pacific) time; the site shows them as "11 AM".

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABEL: Record<Weekday, string> = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
export const STORE_TIME_ZONE = "America/Los_Angeles";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

export const dayHoursSchema = z.object({ open: z.boolean(), from: time, to: time }).refine((value) => !value.open || value.to > value.from, { message: "The closing time must be after the opening time.", path: ["to"] });
export type DayHours = z.infer<typeof dayHoursSchema>;

export const specialHoursSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(2, "Give it a name, like Thanksgiving.").max(60),
  start: day,
  end: day,
  open: z.boolean(),
  from: time,
  to: time,
  note: z.string().trim().max(160).default(""),
}).refine((value) => value.end >= value.start, { message: "The end date must be on or after the start date.", path: ["end"] })
  .refine((value) => !value.open || value.to > value.from, { message: "The closing time must be after the opening time.", path: ["to"] });
export type SpecialHours = z.infer<typeof specialHoursSchema>;

export const storeHoursSchema = z.object({
  week: z.object(Object.fromEntries(WEEKDAYS.map((name) => [name, dayHoursSchema])) as Record<Weekday, typeof dayHoursSchema>),
  specials: z.array(specialHoursSchema).max(60),
  // How many days ahead a holiday notice appears on the site.
  noticeDays: z.number().int().min(1).max(60).default(21),
});
export type StoreHours = z.infer<typeof storeHoursSchema>;

export const DEFAULT_STORE_HOURS: StoreHours = {
  week: {
    monday: { open: false, from: "11:00", to: "18:00" },
    tuesday: { open: false, from: "11:00", to: "18:00" },
    wednesday: { open: true, from: "11:00", to: "18:00" },
    thursday: { open: true, from: "11:00", to: "19:00" },
    friday: { open: true, from: "11:00", to: "19:00" },
    saturday: { open: true, from: "11:00", to: "19:00" },
    sunday: { open: true, from: "11:00", to: "18:00" },
  },
  specials: [],
  noticeDays: 21,
};

/** "11:00" to "11 AM", "18:30" to "6:30 PM". */
export function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function formatHours(hours: { open: boolean; from: string; to: string }) {
  return hours.open ? `${formatTime(hours.from)} to ${formatTime(hours.to)}` : "Closed";
}

/** Today's date in Gilroy as "YYYY-MM-DD". */
export function storeToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const addDays = (isoDay: string, days: number) => { const date = new Date(`${isoDay}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const weekdayOf = (isoDay: string): Weekday => WEEKDAYS[(new Date(`${isoDay}T12:00:00Z`).getUTCDay() + 6) % 7];

/** "Thu, Nov 26" (or "Nov 24 to Nov 26" for a range). */
export function formatDateRange(start: string, end: string) {
  const fmt = (value: string, withDay: boolean) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...(withDay ? { weekday: "short" } : {}), month: "short", day: "numeric" });
  return start === end ? fmt(start, true) : `${fmt(start, false)} to ${fmt(end, false)}`;
}

/** The hours that apply on a date: a special entry if one covers it, otherwise the regular day. */
export function hoursOn(hours: StoreHours, isoDay: string) {
  const special = hours.specials.find((item) => item.start <= isoDay && isoDay <= item.end);
  const weekday = weekdayOf(isoDay);
  return special ? { ...special, special: true as const, weekday } : { ...hours.week[weekday], label: "", note: "", special: false as const, weekday };
}

/** Holidays and special hours that have not ended, soonest first. */
export function upcomingSpecials(hours: StoreHours, today = storeToday(), withinDays?: number) {
  const until = withinDays === undefined ? "9999-12-31" : addDays(today, withinDays);
  return hours.specials.filter((item) => item.end >= today && item.start <= until).sort((a, b) => a.start.localeCompare(b.start));
}

/** Weekly rows grouped for display, with today marked. */
export function weekRows(hours: StoreHours, today = storeToday()) {
  const todayName = weekdayOf(today);
  return WEEKDAYS.map((name) => ({ day: WEEKDAY_LABEL[name], text: formatHours(hours.week[name]), isToday: name === todayName }));
}

/** Reads saved hours, falling back to the defaults for anything missing or broken. */
export function parseStoreHours(raw: string | null | undefined): StoreHours {
  try {
    const parsed = storeHoursSchema.safeParse(JSON.parse(raw || "null"));
    return parsed.success ? parsed.data : DEFAULT_STORE_HOURS;
  } catch { return DEFAULT_STORE_HOURS; }
}

/** schema.org opening hours for search engines (regular week plus upcoming special dates). */
export function openingHoursForSearch(hours: StoreHours, today = storeToday()) {
  const regular = WEEKDAYS.filter((name) => hours.week[name].open).map((name) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${WEEKDAY_LABEL[name]}`, opens: hours.week[name].from, closes: hours.week[name].to }));
  const special = upcomingSpecials(hours, today).map((item) => ({ "@type": "OpeningHoursSpecification", validFrom: item.start, validThrough: item.end, opens: item.open ? item.from : "00:00", closes: item.open ? item.to : "00:00" }));
  return [...regular, ...special];
}
