import { History, Loader2, Repeat, Star, StarOff } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";

const showDate = (date: Date | string) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const daysAgo = (date: Date | string) => Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 86_400_000));

/**
 * The 3 makers featured on the home page and in the Makers spotlight, who is waiting
 * longest for a turn, and the history of past features.
 */
export default function FeaturedMakersCard({ onChanged }: { onChanged: () => Promise<unknown> }) {
  const utils = trpc.useUtils();
  const data = trpc.adminPortal.featuredMakers.useQuery();
  const [pick, setPick] = useState("");
  const [replace, setReplace] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const set = trpc.adminPortal.setFeatured.useMutation({
    onSuccess: async (_result, input) => {
      const name = (id: number) => [...(data.data?.current ?? []), ...(data.data?.waiting ?? [])].find((row) => row.id === id)?.name ?? "Maker";
      notifySuccess(input.on ? `${name(input.id)} is featured` : `${name(input.id)} is no longer featured`, { description: input.replaceId ? `${name(input.replaceId)} was swapped out. Their turn is saved in the history.` : "The home page and Makers spotlight update right away." });
      setPick(""); setReplace("");
      await Promise.all([utils.adminPortal.featuredMakers.invalidate(), utils.directory.invalidate(), onChanged()]);
    },
    onError: (error) => notifyError(error, "Featured makers not changed"),
  });
  if (data.isLoading) return <div className="secure-admin-card featured-card"><Loader2 className="animate-spin" /></div>;
  if (!data.data) return null;
  const { current, waiting, history, limit, neverFeatured } = data.data;
  const full = current.length >= limit;
  const chosen = waiting.find((row) => String(row.id) === pick);

  return <div className="secure-admin-card featured-card">
    <div className="featured-card-head">
      <div><h3><Star size={17} /> Featured makers ({current.length} of {limit})</h3><p>Shown on the home page and at the top of the Makers page. {neverFeatured > 0 ? `${neverFeatured} public maker${neverFeatured === 1 ? " has" : "s have"} never been featured.` : "Every public maker has had a turn."}</p></div>
      <button className="button-plain compact-button" type="button" aria-expanded={showHistory} onClick={() => setShowHistory((open) => !open)}><History size={13} /> {showHistory ? "Hide history" : `History (${history.length})`}</button>
    </div>
    {current.length > limit && <p className="form-error">{current.length} makers are marked as featured, but only {limit} show. Unfeature {current.length - limit}.</p>}
    <div className="featured-slots">
      {current.map((row) => <div className="featured-slot" key={row.id}>
        {row.coverImageUrl ? <img src={row.coverImageUrl} alt="" /> : <span>{row.name.slice(0, 2).toUpperCase()}</span>}
        <div><strong>{row.name}</strong><small>{row.featuredSince ? (daysAgo(row.featuredSince) === 0 ? `Featured since today` : `Featured ${daysAgo(row.featuredSince)} day${daysAgo(row.featuredSince) === 1 ? "" : "s"} (since ${showDate(row.featuredSince)})`) : "Featured"}{row.timesFeatured > 1 ? ` · turn ${row.timesFeatured}` : ""}{!row.active ? " · hidden, so not shown" : ""}</small></div>
        <button className="button-plain compact-button" type="button" disabled={set.isPending} onClick={() => set.mutate({ id: row.id, on: false })}><StarOff size={13} /> Unfeature</button>
      </div>)}
      {Array.from({ length: Math.max(0, limit - current.length) }).map((_, index) => <div className="featured-slot empty" key={`empty-${index}`}><span><Star size={14} /></span><div><strong>Open spot</strong><small>Choose a maker below</small></div></div>)}
    </div>
    <div className="featured-pick">
      <label>Feature a maker (waiting longest first)<select value={pick} onChange={(event) => setPick(event.target.value)}><option value="">Choose a maker…</option>{waiting.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.lastFeaturedAt ? `last featured ${showDate(row.lastFeaturedAt)}` : "never featured"}</option>)}</select></label>
      {full && pick && <label>Swap out<select value={replace} onChange={(event) => setReplace(event.target.value)}><option value="">Choose who to swap out…</option>{current.map((row) => <option key={row.id} value={row.id}>{row.name}{row.featuredSince ? ` (featured ${daysAgo(row.featuredSince)} days)` : ""}</option>)}</select></label>}
      <button className="button-primary" type="button" disabled={!pick || (full && !replace) || set.isPending} onClick={() => set.mutate({ id: Number(pick), on: true, replaceId: full ? Number(replace) : undefined })}>{set.isPending ? <Loader2 size={14} className="animate-spin" /> : full ? <Repeat size={14} /> : <Star size={14} />} {full ? "Swap" : "Feature"}{chosen ? ` ${chosen.name}` : ""}</button>
    </div>
    {showHistory && <div className="featured-history">{history.length ? <table><thead><tr><th>Maker</th><th>Featured</th><th>Days</th></tr></thead><tbody>{history.map((row) => <tr key={row.id}><td>{row.name}</td><td>{showDate(row.startedAt)} to {row.endedAt ? showDate(row.endedAt) : "now"}</td><td>{row.days}</td></tr>)}</tbody></table> : <p className="form-hint">No past features yet. When you unfeature or swap a maker, their turn is saved here.</p>}</div>}
  </div>;
}
