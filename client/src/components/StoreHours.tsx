import { CalendarDays, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Txt } from "@/lib/siteText";
import { DEFAULT_STORE_HOURS, formatDateRange, formatHours, hoursOn, storeToday, upcomingSpecials, weekRows, type StoreHours } from "@shared/storeHours";

/** The store hours the owners set (falls back to the usual hours while loading). */
export function useStoreHours(): StoreHours {
  const { data } = trpc.settings.storeHours.useQuery(undefined, { staleTime: 5 * 60_000 });
  return data ?? DEFAULT_STORE_HOURS;
}

function specialText(item: { open: boolean; from: string; to: string; note: string }) {
  return [item.open ? formatHours(item) : "Closed", item.note].filter(Boolean).join(". ");
}

/** Weekly hours, with today highlighted and upcoming holidays and special hours listed under them. */
export function StoreHoursList({ className = "compact-hours" }: { className?: string }) {
  const hours = useStoreHours();
  const today = storeToday();
  const rows = useMemo(() => weekRows(hours, today), [hours, today]);
  const todayHours = hoursOn(hours, today);
  const specials = upcomingSpecials(hours, today, 60);
  return <div className={className} aria-label="Business hours">
    <div><Clock3 size={16} /><strong><Txt k="home.visit.hoursTitle" /></strong></div>
    <p className="hours-today"><span>Today</span><strong>{todayHours.special ? `${todayHours.label}: ${specialText(todayHours)}` : formatHours(todayHours)}</strong></p>
    {rows.map((row) => <p key={row.day} className={row.isToday ? "is-today" : undefined}><span>{row.day}</span><strong>{row.text}</strong></p>)}
    {specials.length > 0 && <div className="hours-specials"><CalendarDays size={14} /><span>Holidays and special hours</span></div>}
    {specials.map((item) => <p key={item.id} className="hours-special"><span>{item.label}<small>{formatDateRange(item.start, item.end)}</small></span><strong>{specialText(item)}</strong></p>)}
  </div>;
}

/** A thin notice at the top of every page when a holiday or special hours are coming up soon. */
export function HoursNotice() {
  const hours = useStoreHours();
  const soon = upcomingSpecials(hours, storeToday(), hours.noticeDays)[0];
  if (!soon) return null;
  return <div className="hours-notice" role="status"><CalendarDays size={14} /> <strong>{soon.label}</strong> <span>({formatDateRange(soon.start, soon.end)}):</span> <span>{specialText(soon)}</span> <a href="/contact#hours">See hours</a></div>;
}
