import { CalendarPlus, Clock3, Copy, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { DEFAULT_STORE_HOURS, formatDateRange, formatHours, storeHoursSchema, storeToday, WEEKDAY_LABEL, WEEKDAYS, type SpecialHours, type StoreHours, type Weekday } from "@shared/storeHours";

// Common holidays to start from (dates for the coming year are filled in by the owner).
const HOLIDAY_IDEAS = ["New Year's Day", "Easter", "Memorial Day", "Independence Day", "Labor Day", "Thanksgiving", "Black Friday", "Small Business Saturday", "Christmas Eve", "Christmas Day", "New Year's Eve", "Garlic Festival weekend"];
const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Owner dashboard tab: regular weekly hours, plus holidays and special hours shown across the site. */
export default function StoreHoursPanel() {
  const utils = trpc.useUtils();
  const saved = trpc.settings.storeHours.useQuery();
  const [hours, setHours] = useState<StoreHours>(DEFAULT_STORE_HOURS);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (saved.data && !dirty) setHours(saved.data); }, [saved.data, dirty]);
  const save = trpc.adminPortal.saveStoreHours.useMutation({ onSuccess: async () => { notifySuccess("Store hours saved", { description: "The home page, Contact page, and search listings show them now.", link: { label: "View on the site", href: "/contact#hours" } }); setDirty(false); await utils.settings.storeHours.invalidate(); }, onError: (error) => notifyError(error, "Hours not saved") });
  const update = (next: StoreHours) => { setHours(next); setDirty(true); };
  const setDay = (day: Weekday, change: Partial<StoreHours["week"][Weekday]>) => update({ ...hours, week: { ...hours.week, [day]: { ...hours.week[day], ...change } } });
  const setSpecial = (id: string, change: Partial<SpecialHours>) => update({ ...hours, specials: hours.specials.map((item) => (item.id === id ? { ...item, ...change, ...(change.start && item.end < change.start ? { end: change.start } : {}) } : item)) });
  const today = storeToday();
  const addSpecial = (label = "") => update({ ...hours, specials: [...hours.specials, { id: newId(), label, start: today, end: today, open: false, from: "11:00", to: "16:00", note: "" }] });
  const upcoming = hours.specials.filter((item) => item.end >= today);
  const past = hours.specials.filter((item) => item.end < today);
  const check = storeHoursSchema.safeParse(hours);
  const problem = check.success ? null : check.error.issues[0];

  function copyToOpenDays(day: Weekday) {
    const source = hours.week[day];
    update({ ...hours, week: Object.fromEntries(WEEKDAYS.map((name) => [name, hours.week[name].open ? { ...hours.week[name], from: source.from, to: source.to } : hours.week[name]])) as StoreHours["week"] });
  }

  const specialRow = (item: SpecialHours) => <div className="special-row" key={item.id}>
    <label>Name<input value={item.label} maxLength={60} onChange={(event) => setSpecial(item.id, { label: event.target.value })} placeholder="Thanksgiving" /></label>
    <label>From<input type="date" value={item.start} onChange={(event) => setSpecial(item.id, { start: event.target.value })} /></label>
    <label>To<input type="date" value={item.end} min={item.start} onChange={(event) => setSpecial(item.id, { end: event.target.value })} /></label>
    <label className="toggle-label"><input type="checkbox" checked={item.open} onChange={(event) => setSpecial(item.id, { open: event.target.checked })} /><span className="fake-toggle" /> {item.open ? "Open" : "Closed"}</label>
    {item.open && <><label>Opens<input type="time" value={item.from} onChange={(event) => setSpecial(item.id, { from: event.target.value })} /></label><label>Closes<input type="time" value={item.to} onChange={(event) => setSpecial(item.id, { to: event.target.value })} /></label></>}
    <label className="special-note">Note for shoppers (optional)<input value={item.note} maxLength={160} onChange={(event) => setSpecial(item.id, { note: event.target.value })} placeholder="Happy holidays! We reopen Friday at 10 AM." /></label>
    <button className="danger-button compact-button" type="button" onClick={() => update({ ...hours, specials: hours.specials.filter((other) => other.id !== item.id) })}><Trash2 size={13} /> Remove</button>
    <small className="form-hint special-preview">Shoppers see: {item.label || "(name)"} ({formatDateRange(item.start, item.end)}): {item.open ? formatHours(item) : "Closed"}{item.note ? `. ${item.note}` : ""}</small>
  </div>;

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Hours</p><h2>Store hours</h2><p>Set the regular hours for each day, and add holidays or special hours for set dates. They show on the home page, the Contact page, and in Google search results. A holiday also shows as a notice at the top of every page shortly before it.</p></div>
      <button className="button-primary" type="button" disabled={!dirty || Boolean(problem) || save.isPending} onClick={() => save.mutate(hours)}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save hours</button>
    </div>
    {problem && dirty && <p className="form-error">{problem.message}</p>}
    {saved.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : <>
      <div className="secure-admin-card hours-card">
        <h3><Clock3 size={17} /> Regular hours</h3>
        {WEEKDAYS.map((day) => <div className="hours-row" key={day}>
          <strong>{WEEKDAY_LABEL[day]}</strong>
          <label className="toggle-label"><input type="checkbox" checked={hours.week[day].open} onChange={(event) => setDay(day, { open: event.target.checked })} /><span className="fake-toggle" /> {hours.week[day].open ? "Open" : "Closed"}</label>
          {hours.week[day].open ? <>
            <label>Opens<input type="time" value={hours.week[day].from} onChange={(event) => setDay(day, { from: event.target.value })} /></label>
            <label>Closes<input type="time" value={hours.week[day].to} onChange={(event) => setDay(day, { to: event.target.value })} /></label>
            <button className="button-plain compact-button" type="button" title="Use these times on every open day" onClick={() => copyToOpenDays(day)}><Copy size={13} /> Use for all open days</button>
          </> : <span className="hours-closed">Closed all day</span>}
        </div>)}
      </div>
      <div className="secure-admin-card hours-card">
        <div className="hours-card-head"><h3><CalendarPlus size={17} /> Holidays and special hours</h3><button className="button-primary compact-button" type="button" onClick={() => addSpecial()}><CalendarPlus size={13} /> Add holiday or special hours</button></div>
        <p className="form-hint">Use this for days you are closed, or open different hours, like Thanksgiving or extended holiday shopping hours. Pick one day or a range. These replace the regular hours on those dates.</p>
        <div className="holiday-ideas"><span>Quick add:</span>{HOLIDAY_IDEAS.map((name) => <button key={name} type="button" className="ai-chip" onClick={() => addSpecial(name)}>{name}</button>)}</div>
        {upcoming.length ? upcoming.map(specialRow) : <p className="admin-empty-inline">No upcoming holidays or special hours.</p>}
        <label className="notice-days">Show the notice at the top of the site this many days before<input type="number" min={1} max={60} value={hours.noticeDays} onChange={(event) => update({ ...hours, noticeDays: Math.min(60, Math.max(1, Number(event.target.value) || 21)) })} /></label>
        {past.length > 0 && <details className="past-specials"><summary>Past dates ({past.length})</summary>{past.map(specialRow)}</details>}
      </div>
      <div className="hours-save-bar"><button className="button-primary" type="button" disabled={!dirty || Boolean(problem) || save.isPending} onClick={() => save.mutate(hours)}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save hours</button>{dirty && <small className="form-hint">You have changes that are not saved yet.</small>}</div>
    </>}
  </section>;
}
