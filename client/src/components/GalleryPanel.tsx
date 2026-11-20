import { ArrowDown, ArrowUp, ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { describeRequirement } from "@shared/imageRequirements";

const MAX = 12;

/** Owner dashboard tab: the About page "Inside the Cannery" gallery (up to 12 photos). */
export default function GalleryPanel({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const gallery = trpc.gallery.list.useQuery();
  const [uploading, setUploading] = useState(false);
  const refresh = () => utils.gallery.list.invalidate();
  const reorder = trpc.adminPortal.reorderGallery.useMutation({ onSuccess: async () => { notifySuccess("Order saved"); await refresh(); }, onError: (error) => notifyError(error, "Order not saved") });
  const photos = gallery.data || [];
  const remaining = MAX - photos.length;

  async function addPhotos(files: File[]) {
    const selected = files.slice(0, Math.max(0, remaining));
    if (!selected.length) { notifyError(`The gallery holds up to ${MAX} photos. Remove one before adding more.`, "Gallery is full"); return; }
    setUploading(true);
    let added = 0;
    try {
      for (const file of selected) {
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
        const response = await fetch(`/api/admin/upload?purpose=gallery&alt=${encodeURIComponent(alt)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(body.error || "The photo did not upload. Your sign in may have expired. Reload the page and try again.");
        added += 1;
      }
      notifySuccess(`${added} photo${added === 1 ? "" : "s"} added`, { description: "Add a caption and description to each one below.", link: { label: "View About page", href: "/about" } });
    } catch (error) {
      notifyError(error, added ? `${added} added, then one failed` : "Photo not added");
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

  return <section className={embedded ? "embedded-panel" : "admin-content"}><div className="admin-section-heading"><div><p className="eyebrow">About page</p><h2>Photo gallery</h2><p>Up to {MAX} photos in the "Inside the Cannery" section of the About page, shown in this order. The section is hidden when the gallery is empty. {photos.length} of {MAX} used. Best photo size: {describeRequirement("gallery")}. Other sizes are resized for you.</p></div>
    <div className="review-actions">{remaining > 0 && <ImageUploadButton spot="gallery" multiple busy={uploading} onFiles={addPhotos} className="button-primary">Add photos</ImageUploadButton>}<a className="button-plain" href="/about" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View About page</a></div></div>
    <div className="secure-review-list">{gallery.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : photos.length ? photos.map((photo, index) => <GalleryPhotoCard key={photo.id} photo={photo} first={index === 0} last={index === photos.length - 1} onMove={(direction) => move(index, direction)} moving={reorder.isPending} onChanged={refresh} />) : <div className="admin-empty"><h3>No photos yet</h3><p>Add photos of the marketplace to show a gallery on the About page.</p></div>}</div>
  </section>;
}

function GalleryPhotoCard({ photo, first, last, onMove, moving, onChanged }: { photo: { id: number; url: string; alt: string; caption: string | null }; first: boolean; last: boolean; onMove: (direction: -1 | 1) => void; moving: boolean; onChanged: () => Promise<unknown> }) {
  const [alt, setAlt] = useState(photo.alt);
  const [caption, setCaption] = useState(photo.caption || "");
  useEffect(() => { setAlt(photo.alt); setCaption(photo.caption || ""); }, [photo.alt, photo.caption]);
  const update = trpc.adminPortal.updateGalleryPhoto.useMutation({ onSuccess: async () => { notifySuccess("Photo details saved"); await onChanged(); }, onError: (error) => notifyError(error, "Details not saved") });
  const remove = trpc.adminPortal.deleteGalleryPhoto.useMutation({ onSuccess: async () => { notifySuccess("Photo removed from the gallery"); await onChanged(); }, onError: (error) => notifyError(error, "Photo not removed") });
  const dirty = alt.trim() !== photo.alt || caption.trim() !== (photo.caption || "");
  return <article className="secure-admin-card"><div className="secure-card-heading"><div><label>Caption shown under the photo (optional)<input value={caption} maxLength={200} onChange={(event) => setCaption(event.target.value)} placeholder="Saturday morning at the marketplace" /></label><label>Description for screen readers<input value={alt} minLength={3} maxLength={300} onChange={(event) => setAlt(event.target.value)} /></label></div><img className="secure-review-cover" src={photo.url} alt={photo.alt} /></div>
    <div className="review-actions"><button className="button-plain" type="button" disabled={!dirty || update.isPending || alt.trim().length < 3} onClick={() => update.mutate({ id: photo.id, alt, caption })}><Save size={14} /> Save</button><button className="button-plain" type="button" disabled={first || moving} onClick={() => onMove(-1)} aria-label="Move earlier"><ArrowUp size={14} /> Earlier</button><button className="button-plain" type="button" disabled={last || moving} onClick={() => onMove(1)} aria-label="Move later"><ArrowDown size={14} /> Later</button><button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this photo from the gallery?")) remove.mutate({ id: photo.id }); }}><Trash2 size={14} /> Remove</button></div>
  </article>;
}
