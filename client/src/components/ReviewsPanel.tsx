import { Check, ExternalLink, Loader2, Mail, Pencil, Plus, RotateCcw, Save, Star, StarOff, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Stars } from "@/components/Reviews";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { FEATURED_REVIEW_LIMIT, REVIEW_SOURCE_LABEL, REVIEW_SOURCES, type ReviewSource } from "@shared/reviews";

type Filter = "pending" | "approved" | "featured" | "rejected" | "all";
const FILTERS: Array<{ id: Filter; label: string }> = [{ id: "pending", label: "Waiting" }, { id: "approved", label: "Approved" }, { id: "featured", label: "On the home page" }, { id: "rejected", label: "Removed" }, { id: "all", label: "All" }];
const when = (date: Date | string) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
type Vendor = { id: number; name: string; slug: string };

function AddReviewForm({ vendors, onDone }: { vendors: Vendor[]; onDone: () => Promise<unknown> }) {
  const [form, setForm] = useState({ profileId: "", rating: 5, body: "", reviewerName: "", reviewerCity: "", source: "google" as ReviewSource, confirmed: false });
  const add = trpc.adminPortal.addReview.useMutation({ onSuccess: async () => { notifySuccess("Review added", { description: "It is approved and shows on the maker's page." }); setForm({ ...form, body: "", reviewerName: "", reviewerCity: "", confirmed: false }); await onDone(); }, onError: (error) => notifyError(error, "Review not added") });
  return <form className="secure-admin-card add-review-card" onSubmit={(event) => { event.preventDefault(); add.mutate({ profileId: form.profileId ? Number(form.profileId) : null, rating: form.rating, body: form.body, reviewerName: form.reviewerName, reviewerCity: form.reviewerCity, source: form.source, confirmed: form.confirmed as true }); }}>
    <h3>Add a review you received</h3>
    <p className="form-hint">For real reviews shoppers gave elsewhere, like Google, Instagram, or a thank you card. Copy their words exactly.</p>
    <div className="form-grid">
      <label>Maker<select value={form.profileId} onChange={(event) => setForm({ ...form, profileId: event.target.value })}><option value="">The marketplace in general</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
      <label>Where it came from<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value as ReviewSource })}>{REVIEW_SOURCES.filter((source) => source !== "website").map((source) => <option key={source} value={source}>{REVIEW_SOURCE_LABEL[source]}</option>)}</select></label>
      <label>Stars<select value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}</select></label>
      <label>Reviewer's name (private)<input value={form.reviewerName} maxLength={40} onChange={(event) => setForm({ ...form, reviewerName: event.target.value })} placeholder="Maria G." /></label>
      <label>City (optional)<input value={form.reviewerCity} maxLength={60} onChange={(event) => setForm({ ...form, reviewerCity: event.target.value })} placeholder="Morgan Hill" /></label>
    </div>
    <label>The review<textarea rows={3} value={form.body} maxLength={1500} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
    <label className="checkbox-label"><input type="checkbox" checked={form.confirmed} onChange={(event) => setForm({ ...form, confirmed: event.target.checked })} /> This is a real review, in the shopper's own words, and we may share it.</label>
    <div className="review-actions"><button className="button-primary" type="submit" disabled={add.isPending || !form.confirmed}>{add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add review</button></div>
  </form>;
}

type ReviewRow = { id: number; profileId: number | null; rating: number; body: string; reviewerName: string; reviewerCity: string | null; source: ReviewSource; photoUrl: string | null; originalBody: string | null };

/** Edit a published review. Shopper reviews keep their stars; reviews owners added can be fully corrected. */
function EditReviewForm({ row, vendors, onDone }: { row: ReviewRow; vendors: Vendor[]; onDone: () => void }) {
  const utils = trpc.useUtils();
  const fromWebsite = row.source === "website";
  const [form, setForm] = useState({ profileId: row.profileId ? String(row.profileId) : "", rating: row.rating, body: row.body, reviewerName: row.reviewerName, reviewerCity: row.reviewerCity ?? "", source: row.source, removePhoto: false });
  const save = trpc.adminPortal.editReview.useMutation({ onSuccess: async () => { notifySuccess("Review updated", { description: "The change shows on the site right away." }); await Promise.all([utils.adminPortal.reviews.invalidate(), utils.reviews.invalidate()]); onDone(); }, onError: (error) => notifyError(error, "Review not updated") });
  return <form className="edit-review-form" onSubmit={(event) => { event.preventDefault(); save.mutate({ id: row.id, profileId: form.profileId ? Number(form.profileId) : null, rating: form.rating, body: form.body, reviewerName: form.reviewerName, reviewerCity: form.reviewerCity, source: form.source, removePhoto: form.removePhoto }); }}>
    {fromWebsite && <p className="form-hint">A shopper wrote this on our website. Fix typos or remove personal information, but keep their meaning. Their star rating cannot be changed.</p>}
    <div className="form-grid">
      <label>Maker<select value={form.profileId} onChange={(event) => setForm({ ...form, profileId: event.target.value })}><option value="">The marketplace in general</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
      <label>Stars<select value={form.rating} disabled={fromWebsite} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}</select></label>
      {!fromWebsite && <label>Where it came from<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value as ReviewSource })}>{REVIEW_SOURCES.filter((source) => source !== "website").map((source) => <option key={source} value={source}>{REVIEW_SOURCE_LABEL[source]}</option>)}</select></label>}
      <label>Reviewer's name (private)<input value={form.reviewerName} maxLength={40} onChange={(event) => setForm({ ...form, reviewerName: event.target.value })} /></label>
      <label>City<input value={form.reviewerCity} maxLength={60} onChange={(event) => setForm({ ...form, reviewerCity: event.target.value })} /></label>
    </div>
    <label>The review<textarea rows={4} maxLength={1500} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
    {row.photoUrl && <label className="checkbox-label"><input type="checkbox" checked={form.removePhoto} onChange={(event) => setForm({ ...form, removePhoto: event.target.checked })} /> Remove the photo</label>}
    {row.originalBody && <details className="review-original"><summary>Shopper's original words</summary><p>“{row.originalBody}”</p></details>}
    <div className="review-actions"><button className="button-primary compact-button" type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes</button><button className="button-plain compact-button" type="button" onClick={onDone}><X size={13} /> Cancel</button></div>
  </form>;
}

/** Owner dashboard tab: approve new reviews, choose home page reviews, add reviews from elsewhere, and set the Google link. */
export default function ReviewsPanel({ vendors }: { vendors: Vendor[] }) {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.reviews.useQuery();
  const [filter, setFilter] = useState<Filter>("pending");
  const [adding, setAdding] = useState(false);
  const [google, setGoogle] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const refresh = () => Promise.all([utils.adminPortal.reviews.invalidate(), utils.adminPortal.pendingReviews.invalidate(), utils.reviews.invalidate()]);
  const status = trpc.adminPortal.setReviewStatus.useMutation({ onSuccess: async (_r, input) => { notifySuccess(input.status === "approved" ? "Review approved" : input.status === "rejected" ? "Review removed" : "Moved back to Waiting", { description: input.status === "approved" ? "It shows on the maker's page now." : undefined }); await refresh(); }, onError: (error) => notifyError(error, "Review not updated") });
  const feature = trpc.adminPortal.setReviewFeatured.useMutation({ onSuccess: async (_r, input) => { notifySuccess(input.featured ? "Added to the home page" : "Removed from the home page"); await refresh(); }, onError: (error) => notifyError(error, "Not changed") });
  const remove = trpc.adminPortal.deleteReview.useMutation({ onSuccess: async () => { notifySuccess("Review deleted"); await refresh(); }, onError: (error) => notifyError(error, "Review not deleted") });
  const saveGoogle = trpc.adminPortal.setGoogleReviewUrl.useMutation({ onSuccess: async () => { notifySuccess("Google review link saved", { description: "The Review us on Google button shows on the Contact page." }); setGoogle(null); await refresh(); }, onError: (error) => notifyError(error, "Link not saved") });
  const rows = list.data?.reviews ?? [];
  const featuredCount = rows.filter((row) => row.featured && row.status === "approved").length;
  const counts: Record<Filter, number> = { pending: rows.filter((row) => row.status === "pending").length, approved: rows.filter((row) => row.status === "approved").length, featured: featuredCount, rejected: rows.filter((row) => row.status === "rejected").length, all: rows.length };
  const shown = rows.filter((row) => filter === "all" || (filter === "featured" ? row.featured && row.status === "approved" : row.status === filter));
  const slugFor = (id: number | null) => vendors.find((vendor) => vendor.id === id)?.slug;
  const googleValue = google ?? list.data?.googleUrl ?? "";
  const busy = status.isPending || feature.isPending || remove.isPending;

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Shopper reviews</p><h2>Reviews</h2><p>Reviews shoppers leave on a maker's page wait here for a quick look. Approve every honest review, good or bad; remove only spam, profanity, personal information, or anything off topic. Choose up to {FEATURED_REVIEW_LIMIT} for the home page. Reviews show on the site as "A verified shopper" (with the city, if given); names and emails stay private here.</p></div>{!adding && <button className="button-primary" type="button" onClick={() => setAdding(true)}><Plus size={15} /> Add a review you received</button>}</div>
    {adding && <><AddReviewForm vendors={vendors} onDone={refresh} /><button className="button-plain compact-button" type="button" onClick={() => setAdding(false)}><X size={13} /> Close</button></>}
    <form className="secure-admin-card google-link-card" onSubmit={(event) => { event.preventDefault(); saveGoogle.mutate({ url: googleValue.trim() }); }}>
      <label>Google review link (from your Google Business Profile, under "Ask for reviews")<input value={googleValue} maxLength={400} inputMode="url" onChange={(event) => setGoogle(event.target.value)} placeholder="https://g.page/r/..." /></label>
      <button className="button-plain" type="submit" disabled={saveGoogle.isPending || google === null}><Save size={14} /> Save link</button>
      {list.data?.googleUrl && <a className="button-plain" href={list.data.googleUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Test it</a>}
    </form>
    <div className="application-filters" role="tablist" aria-label="Filter reviews">{FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label} <span>{item.id === "featured" ? `${counts.featured} of ${FEATURED_REVIEW_LIMIT}` : counts[item.id]}</span></button>)}</div>
    {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : shown.length ? <div className="secure-review-list">{shown.map((row) => <article className="secure-admin-card review-admin-card" key={row.id}>
      <div className="secure-card-heading"><div>
        <span className={`listing-status listing-status-${row.status === "pending" ? "pending" : row.status === "approved" ? "published" : "muted"}`}>{row.status === "pending" ? "Waiting" : row.status === "approved" ? (row.featured ? "Approved, on the home page" : "Approved") : "Removed"}</span>
        <h3>{row.makerName || "The marketplace"} <Stars value={row.rating} size={14} /></h3>
        <p>{row.reviewerName}{row.reviewerCity ? `, ${row.reviewerCity}` : ""} · {when(row.createdAt)} · {REVIEW_SOURCE_LABEL[row.source]}{row.email ? <> · <a href={`mailto:${row.email}`}><Mail size={12} /> {row.email}</a></> : ""}</p>
      </div>{row.photoUrl && <img className="secure-review-cover" src={row.photoUrl} alt="" />}</div>
      {editingId === row.id ? <EditReviewForm row={row as ReviewRow} vendors={vendors} onDone={() => setEditingId(null)} /> : <>
      <p className="review-admin-body">“{row.body}”</p>
      {row.editedAt && <p className="form-hint">Edited by {row.editedBy} on {when(row.editedAt)}{row.originalBody ? " (original words kept)" : ""}.</p>}
      <div className="review-actions">
        {row.status !== "approved" && <button className="button-primary compact-button" type="button" disabled={busy} onClick={() => status.mutate({ id: row.id, status: "approved" })}><Check size={13} /> Approve</button>}
        <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => setEditingId(row.id)}><Pencil size={13} /> Edit</button>
        {row.status === "approved" && (row.featured
          ? <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => feature.mutate({ id: row.id, featured: false })}><StarOff size={13} /> Remove from home page</button>
          : <button className="button-plain compact-button" type="button" disabled={busy || featuredCount >= FEATURED_REVIEW_LIMIT} title={featuredCount >= FEATURED_REVIEW_LIMIT ? `Up to ${FEATURED_REVIEW_LIMIT} on the home page` : undefined} onClick={() => feature.mutate({ id: row.id, featured: true })}><Star size={13} /> Show on home page</button>)}
        {row.status !== "rejected" && <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => { if (window.confirm("Remove this review from the site? Only remove spam, profanity, personal information, or off topic reviews.")) status.mutate({ id: row.id, status: "rejected" }); }}><X size={13} /> Remove</button>}
        {row.status !== "pending" && <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => status.mutate({ id: row.id, status: "pending" })}><RotateCcw size={13} /> Back to waiting</button>}
        {slugFor(row.profileId) && <a className="button-plain compact-button" href={`/vendors/${slugFor(row.profileId)}#reviews`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> View page</a>}
        <button className="danger-button compact-button" type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this review for good?")) remove.mutate({ id: row.id }); }}><Trash2 size={13} /> Delete</button>
      </div></>}
    </article>)}</div> : <div className="admin-empty"><Star size={20} /><h3>{filter === "pending" ? "No reviews waiting" : "Nothing here yet"}</h3><p>{filter === "pending" ? "New reviews from maker pages show up here, and you get an email for each one." : "Try another filter."}</p></div>}
  </section>;
}
