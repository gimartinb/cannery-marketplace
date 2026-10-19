import { ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const MAX = 3;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
type Draft = { id?: number; title: string; description: string; category: string; makerSlug: string; imageUrl: string; displayOrder: number };
const EMPTY: Draft = { title: "", description: "", category: "", makerSlug: "", imageUrl: "", displayOrder: 1 };

/** Uploads one owner image (raw bytes) and returns its URL. */
async function uploadOwnerImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image exceeds 5 MB. Please use a smaller file.");
  const response = await fetch("/api/admin/upload?purpose=highlight", { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || "Upload failed. Please sign in again and retry.");
  return body.url;
}

/** Owner dashboard tab: the up to 3 "Find something with a story" cards on the home page. */
export default function HighlightsPanel({ vendors }: { vendors: { slug: string; name: string; active: boolean }[] }) {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.highlights.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const refresh = async () => { await Promise.all([utils.adminPortal.highlights.invalidate(), utils.home.highlights.invalidate()]); };
  const save = trpc.adminPortal.saveHighlight.useMutation({ onSuccess: async () => { setDraft(null); setMessage("Highlight saved. It shows on the home page now."); await refresh(); }, onError: (error) => setMessage(error.message) });
  const remove = trpc.adminPortal.deleteHighlight.useMutation({ onSuccess: async () => { setMessage("Highlight removed."); await refresh(); }, onError: (error) => setMessage(error.message) });
  const rows = list.data || [];
  const activeVendors = vendors.filter((vendor) => vendor.active);

  async function pickImage(file: File | undefined) {
    if (!file || !draft) return;
    setUploading(true); setMessage("Uploading photo…");
    try { const url = await uploadOwnerImage(file); setDraft((current) => (current ? { ...current, imageUrl: url } : current)); setMessage("Photo ready. Save the highlight to publish it."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    save.mutate({ id: draft.id, title: draft.title, description: draft.description, category: draft.category, makerSlug: draft.makerSlug || null, imageUrl: draft.imageUrl || null, displayOrder: draft.displayOrder });
  }

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Home page</p><h2>Home highlights</h2><p>Up to {MAX} cards in the "Find something with a story" section. Each can show a photo and link to a maker's profile. The section is hidden when there are none.</p></div>{!draft && rows.length < MAX && <button className="button-primary" type="button" onClick={() => { setMessage(""); setDraft({ ...EMPTY, displayOrder: rows.length + 1 }); }}><Plus size={14} /> Add highlight</button>}</div>
    {message && <p className="admin-result">{message}</p>}
    {draft && <form className="secure-admin-card" onSubmit={submit}>
      <h3>{draft.id ? "Edit highlight" : "New highlight"}</h3>
      <label>Title<input required minLength={2} maxLength={80} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Hand thrown pottery" /></label>
      <label>Category<input required minLength={2} maxLength={60} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Ceramics" /></label>
      <label>Short description<textarea required minLength={10} maxLength={220} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Small batch vessels shaped for everyday rituals." /></label>
      <label>Links to maker (optional)<select value={draft.makerSlug} onChange={(event) => setDraft({ ...draft, makerSlug: event.target.value })}><option value="">No maker link</option>{activeVendors.map((vendor) => <option key={vendor.slug} value={vendor.slug}>{vendor.name}</option>)}</select></label>
      <label>Position (1 shows first)<input type="number" min={1} max={9} value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) || 1 })} /></label>
      <div className="maker-media-editor"><p className="media-help">Photo (optional). Without one, the card uses a warm color background. JPEG, PNG, or WebP up to 5 MB.</p>
        {draft.imageUrl && <img className="secure-review-cover" src={draft.imageUrl} alt="Highlight preview" />}
        <div className="review-actions"><label className="upload-button button-plain" aria-disabled={uploading}>{uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {draft.imageUrl ? "Change photo" : "Add photo"}<input type="file" accept={ACCEPTED.join(",")} hidden disabled={uploading} onChange={(event) => { void pickImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>{draft.imageUrl && <button className="button-plain" type="button" onClick={() => setDraft({ ...draft, imageUrl: "" })}><X size={14} /> Remove photo</button>}</div>
      </div>
      <div className="review-actions"><button className="button-primary" type="submit" disabled={save.isPending || uploading}><Save size={14} /> Save highlight</button><button className="button-plain" type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="secure-vendor-table">{list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : rows.length ? rows.map((row) => <div key={row.id}><span>{row.imageUrl ? <img src={row.imageUrl} alt="" /> : row.title.slice(0, 2).toUpperCase()}</span><div><strong>{row.title}</strong><small>{row.category}{row.makerName ? ` · links to ${row.makerName}` : " · no maker link"} · position {row.displayOrder}</small></div><div className="review-actions"><button className="button-plain" type="button" onClick={() => { setMessage(""); setDraft({ id: row.id, title: row.title, description: row.description, category: row.category, makerSlug: row.makerSlug || "", imageUrl: row.imageUrl || "", displayOrder: row.displayOrder }); }}><Pencil size={14} /> Edit</button><button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove the "${row.title}" highlight from the home page?`)) remove.mutate({ id: row.id }); }}><Trash2 size={14} /> Remove</button></div></div>) : <div className="admin-empty"><h3>No highlights yet</h3><p>Add up to {MAX} to show the "Find something with a story" section on the home page.</p></div>}</div>
  </section>;
}
