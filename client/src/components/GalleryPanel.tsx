import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const MAX = 12;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Owner dashboard tab: the About page "Inside the Cannery" gallery (up to 12 photos). */
export default function GalleryPanel() {
  const utils = trpc.useUtils();
  const gallery = trpc.gallery.list.useQuery();
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const refresh = () => utils.gallery.list.invalidate();
  const reorder = trpc.adminPortal.reorderGallery.useMutation({ onSuccess: refresh, onError: (error) => setMessage(error.message) });
  const photos = gallery.data || [];
  const remaining = MAX - photos.length;

  async function addPhotos(files: FileList | null) {
    const selected = Array.from(files || []).slice(0, Math.max(0, remaining));
    if (!selected.length) { setMessage(`The gallery holds up to ${MAX} photos. Remove one before adding more.`); return; }
    setUploading(true);
    let added = 0;
    try {
      for (const file of selected) {
        if (!ACCEPTED.includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG, or WebP image.`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB.`);
        setMessage(`Uploading ${added + 1} of ${selected.length}…`);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
        const response = await fetch(`/api/admin/upload?purpose=gallery&alt=${encodeURIComponent(alt)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(body.error || "Upload failed. Please sign in again and retry.");
        added += 1;
      }
      setMessage(`${added} photo${added === 1 ? "" : "s"} added. Add a caption and description to each below.`);
    } catch (error) {
      setMessage(`${added ? `${added} added, then: ` : ""}${error instanceof Error ? error.message : "Upload failed."}`);
    } finally {
      setUploading(false);
      await refresh();
    }
  }

  function move(index: number, direction: -1 | 1) {
    const ids = photos.map((photo) => photo.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate({ ids });
  }

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">About page</p><h2>Photo gallery</h2><p>Up to {MAX} photos in the "Inside the Cannery" section of the About page, shown in this order. The section is hidden when the gallery is empty. {photos.length} of {MAX} used.</p></div>
    {remaining > 0 && <label className="button-primary upload-button" aria-disabled={uploading}>{uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Add photos<input type="file" multiple accept={ACCEPTED.join(",")} hidden disabled={uploading} onChange={(event) => { void addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label>}</div>
    {message && <p className="admin-result">{message}</p>}
    <div className="secure-review-list">{gallery.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : photos.length ? photos.map((photo, index) => <GalleryPhotoCard key={photo.id} photo={photo} first={index === 0} last={index === photos.length - 1} onMove={(direction) => move(index, direction)} moving={reorder.isPending} onChanged={refresh} />) : <div className="admin-empty"><h3>No photos yet</h3><p>Add photos of the marketplace to show a gallery on the About page.</p></div>}</div>
  </section>;
}

function GalleryPhotoCard({ photo, first, last, onMove, moving, onChanged }: { photo: { id: number; url: string; alt: string; caption: string | null }; first: boolean; last: boolean; onMove: (direction: -1 | 1) => void; moving: boolean; onChanged: () => Promise<unknown> }) {
  const [alt, setAlt] = useState(photo.alt);
  const [caption, setCaption] = useState(photo.caption || "");
  const [note, setNote] = useState("");
  useEffect(() => { setAlt(photo.alt); setCaption(photo.caption || ""); }, [photo.alt, photo.caption]);
  const update = trpc.adminPortal.updateGalleryPhoto.useMutation({ onSuccess: async () => { setNote("Saved."); await onChanged(); }, onError: (error) => setNote(error.message) });
  const remove = trpc.adminPortal.deleteGalleryPhoto.useMutation({ onSuccess: onChanged, onError: (error) => setNote(error.message) });
  const dirty = alt.trim() !== photo.alt || caption.trim() !== (photo.caption || "");
  return <article className="secure-admin-card"><div className="secure-card-heading"><div><label>Caption shown under the photo (optional)<input value={caption} maxLength={200} onChange={(event) => setCaption(event.target.value)} placeholder="Saturday morning at the marketplace" /></label><label>Description for screen readers<input value={alt} minLength={3} maxLength={300} onChange={(event) => setAlt(event.target.value)} /></label></div><img className="secure-review-cover" src={photo.url} alt={photo.alt} /></div>
    {note && <p className="admin-result">{note}</p>}
    <div className="review-actions"><button className="button-plain" type="button" disabled={!dirty || update.isPending || alt.trim().length < 3} onClick={() => update.mutate({ id: photo.id, alt, caption })}><Save size={14} /> Save</button><button className="button-plain" type="button" disabled={first || moving} onClick={() => onMove(-1)} aria-label="Move earlier"><ArrowUp size={14} /> Earlier</button><button className="button-plain" type="button" disabled={last || moving} onClick={() => onMove(1)} aria-label="Move later"><ArrowDown size={14} /> Later</button><button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this photo from the gallery?")) remove.mutate({ id: photo.id }); }}><Trash2 size={14} /> Remove</button></div>
  </article>;
}
