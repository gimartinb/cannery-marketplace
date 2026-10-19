import { ExternalLink, Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { describeRequirement } from "@shared/imageRequirements";

const SHOWN = 3;
type Vendor = { slug: string; name: string; active: boolean; category: string; shortBio: string; coverImageUrl: string | null };
type Draft = { id?: number; title: string; description: string; category: string; makerSlug: string; imageUrl: string; displayOrder: number; startDate: string; endDate: string };
const EMPTY: Draft = { title: "", description: "", category: "", makerSlug: "", imageUrl: "", displayOrder: 1, startDate: "", endDate: "" };
type Row = { id: number; title: string; description: string; category: string; makerSlug: string | null; makerName: string | null; imageUrl: string | null; displayOrder: number; startsAt: Date | null; endsAt: Date | null; createdAt: Date };

// Dates are picked as calendar days in the owner's time zone. A highlight starts at
// the beginning of its start day and stays up through the whole end day.
const toDay = (date: Date | null) => (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "");
const startOfDay = (day: string) => (day ? new Date(`${day}T00:00:00`) : null);
const afterDay = (day: string) => { if (!day) return null; const date = new Date(`${day}T00:00:00`); date.setDate(date.getDate() + 1); return date; };
const showDay = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Status for each saved highlight, using the same rule as the home page: the 3 newest live ones show. */
function statuses(rows: Row[], now = new Date()) {
  const live = rows.filter((row) => (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt > now));
  const shown = new Set([...live].sort((a, b) => (b.startsAt ?? b.createdAt).getTime() - (a.startsAt ?? a.createdAt).getTime() || b.id - a.id).slice(0, SHOWN).map((row) => row.id));
  return new Map(rows.map((row) => {
    if (row.endsAt && row.endsAt <= now) return [row.id, { label: "Expired", tone: "muted" }];
    if (row.startsAt && row.startsAt > now) return [row.id, { label: `Starts ${showDay(row.startsAt)}`, tone: "scheduled" }];
    if (shown.has(row.id)) return [row.id, { label: "On the home page", tone: "live" }];
    return [row.id, { label: "Waiting (3 newer are showing)", tone: "muted" }];
  }));
}

/** Owner dashboard tab: the "Find something with a story" cards on the home page. */
export default function HighlightsPanel({ vendors }: { vendors: Vendor[] }) {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.highlights.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const refresh = async () => { await Promise.all([utils.adminPortal.highlights.invalidate(), utils.home.highlights.invalidate()]); };
  const save = trpc.adminPortal.saveHighlight.useMutation({
    onSuccess: async () => { notifySuccess("Highlight saved", { description: draft?.startDate && startOfDay(draft.startDate)! > new Date() ? "It appears on its start date." : "Check the home page to see it.", link: { label: "View home page", href: "/" } }); setDraft(null); await refresh(); },
    onError: (error) => notifyError(error, "Highlight not saved"),
  });
  const remove = trpc.adminPortal.deleteHighlight.useMutation({ onSuccess: async () => { notifySuccess("Highlight removed"); await refresh(); }, onError: (error) => notifyError(error, "Highlight not removed") });
  const rows = (list.data || []) as Row[];
  const status = statuses(rows);
  const activeVendors = vendors.filter((vendor) => vendor.active);

  function promote(slug: string) {
    const vendor = activeVendors.find((item) => item.slug === slug);
    if (!vendor) return;
    const description = vendor.shortBio.length > 220 ? `${vendor.shortBio.slice(0, 217).replace(/\s+\S*$/, "")}…` : vendor.shortBio;
    setDraft({ ...EMPTY, displayOrder: rows.length + 1, title: vendor.name, category: vendor.category, description, makerSlug: vendor.slug, imageUrl: vendor.coverImageUrl || "" });
  }

  async function upload(files: File[]) {
    const file = files[0];
    if (!file || !draft) return;
    setUploading(true);
    try {
      const response = await fetch("/api/admin/upload?purpose=highlight", { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "The photo did not upload. Your sign in may have expired. Reload the page and try again.");
      setDraft((current) => (current ? { ...current, imageUrl: body.url! } : current));
      notifySuccess("Photo ready", { description: "Save the highlight to publish it." });
    } catch (error) { notifyError(error, "Photo not uploaded"); }
    finally { setUploading(false); }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) { notifyError("The end date must be on or after the start date.", "Check the dates"); return; }
    save.mutate({ id: draft.id, title: draft.title, description: draft.description, category: draft.category, makerSlug: draft.makerSlug || null, imageUrl: draft.imageUrl || null, displayOrder: draft.displayOrder, startsAt: startOfDay(draft.startDate), endsAt: afterDay(draft.endDate) });
  }

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Home page</p><h2>Home highlights</h2><p>The "Find something with a story" section shows up to {SHOWN} cards. Promote a maker from your list or write your own card. Give a card start and end dates and it appears and disappears on its own. When more than {SHOWN} are live, the {SHOWN} newest show.</p></div>{!draft && <button className="button-primary" type="button" onClick={() => setDraft({ ...EMPTY, displayOrder: rows.length + 1 })}><Plus size={14} /> Write a custom card</button>}</div>
    {!draft && activeVendors.length > 0 && <div className="secure-admin-card promote-card"><Sparkles size={18} /><label>Promote a maker<select value="" onChange={(event) => promote(event.target.value)}><option value="">Choose a maker to fill in a card…</option>{activeVendors.map((vendor) => <option key={vendor.slug} value={vendor.slug}>{vendor.name} · {vendor.category}</option>)}</select></label><small className="form-hint">Uses the maker's name, category, description, and cover photo. You can change any of it before saving.</small></div>}
    {draft && <form className="secure-admin-card" onSubmit={submit}>
      <div className="secure-card-heading"><div><h3>{draft.id ? "Edit highlight" : draft.makerSlug ? "Promote a maker" : "New custom card"}</h3></div><button className="button-plain compact-button" type="button" onClick={() => setDraft(null)}><X size={13} /> Close</button></div>
      <label>Title<input required minLength={2} maxLength={80} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Hand thrown pottery" /></label>
      <label>Category or tag<input required minLength={2} maxLength={60} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Ceramics, or Seasonal" /></label>
      <label>Short description<textarea required minLength={10} maxLength={220} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Small batch vessels shaped for everyday rituals." /><small className="form-hint">{draft.description.trim().length} / 220</small></label>
      <label>Links to maker (optional)<select value={draft.makerSlug} onChange={(event) => setDraft({ ...draft, makerSlug: event.target.value })}><option value="">No maker link</option>{activeVendors.map((vendor) => <option key={vendor.slug} value={vendor.slug}>{vendor.name}</option>)}</select></label>
      <div className="highlight-dates"><label>Start date (optional)<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label>End date (optional)<input type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div>
      <small className="form-hint">Blank start means it shows right away. Blank end means it stays until you remove it. The card stays up through the whole end date.</small>
      <label>Position among the cards (1 shows first)<input type="number" min={1} max={99} value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) || 1 })} /></label>
      <div className="maker-media-editor"><p className="media-help">Photo (optional), {describeRequirement("highlight")}. Without one, the card uses a warm color background.</p>
        {draft.imageUrl && <img className="secure-review-cover" src={draft.imageUrl} alt="Highlight preview" />}
        <div className="review-actions"><ImageUploadButton spot="highlight" busy={uploading} onFiles={upload}>{draft.imageUrl ? "Change photo" : "Add photo"}</ImageUploadButton>{draft.imageUrl && <button className="button-plain" type="button" onClick={() => setDraft({ ...draft, imageUrl: "" })}><X size={14} /> Remove photo</button>}</div>
      </div>
      <div className="review-actions"><button className="button-primary" type="submit" disabled={save.isPending || uploading}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save highlight</button><button className="button-plain" type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="secure-vendor-table">{list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : rows.length ? rows.map((row) => { const state = status.get(row.id)!; return <div key={row.id}><span>{row.imageUrl ? <img src={row.imageUrl} alt="" /> : row.title.slice(0, 2).toUpperCase()}</span><div><strong>{row.title}</strong><small><span className={`listing-status listing-status-${state.tone}`}>{state.label}</span> {row.category}{row.makerName ? ` · links to ${row.makerName}` : " · custom card"} · position {row.displayOrder}{row.startsAt ? ` · from ${showDay(row.startsAt)}` : ""}{row.endsAt ? ` · through ${showDay(new Date(row.endsAt.getTime() - 1))}` : ""}</small></div><div className="review-actions"><button className="button-plain" type="button" onClick={() => setDraft({ id: row.id, title: row.title, description: row.description, category: row.category, makerSlug: row.makerSlug || "", imageUrl: row.imageUrl || "", displayOrder: row.displayOrder, startDate: toDay(row.startsAt), endDate: row.endsAt ? toDay(new Date(row.endsAt.getTime() - 1)) : "" })}><Pencil size={14} /> Edit</button>{state.tone === "live" && <a className="button-plain" href="/" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View</a>}<button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove the "${row.title}" highlight?`)) remove.mutate({ id: row.id }); }}><Trash2 size={14} /> Remove</button></div></div>; }) : <div className="admin-empty"><h3>No highlights yet</h3><p>Promote a maker or write a custom card to show the "Find something with a story" section on the home page.</p></div>}</div>
  </section>;
}
