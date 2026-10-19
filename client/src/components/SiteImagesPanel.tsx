import { Check, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSiteImages, type SiteImage } from "@/lib/siteImages";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Owner dashboard tab: replace, describe, or reset each image spot on the public site. */
export default function SiteImagesPanel() {
  const images = useSiteImages();
  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Site appearance</p><h2>Site images</h2><p>Replace the logo and photos shown across the public site. Changes appear for visitors right away. Reset any spot to bring back the original image.</p></div></div><div className="secure-review-list">{images.map((image) => <SiteImageCard key={image.id} image={image} />)}</div></section>;
}

function SiteImageCard({ image }: { image: SiteImage }) {
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [alt, setAlt] = useState(image.alt);
  useEffect(() => setAlt(image.alt), [image.alt]);
  const refresh = () => utils.siteImages.list.invalidate();
  const saveAlt = trpc.adminPortal.setSiteImageAlt.useMutation({ onSuccess: async () => { setMessage("Description saved."); await refresh(); }, onError: (error) => setMessage(error.message) });
  const reset = trpc.adminPortal.resetSiteImage.useMutation({ onSuccess: async () => { setMessage("Original image restored."); await refresh(); }, onError: (error) => setMessage(error.message) });

  async function replace(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) { setMessage("Use a JPEG, PNG, or WebP image."); return; }
    if (file.size > MAX_BYTES) { setMessage("Image exceeds 5 MB. Please use a smaller file."); return; }
    setBusy(true); setMessage("Uploading…");
    try {
      // Raw bytes, sent as is, so a transparent PNG logo keeps its transparency.
      const response = await fetch(`/api/admin/upload?slot=${encodeURIComponent(image.id)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Upload failed. Please sign in again and retry.");
      setMessage("Image replaced. Visitors see the new image now.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="secure-admin-card"><div className="secure-card-heading"><div><span className="review-status">{image.customized ? "Custom image" : "Original image"}</span><h3>{image.label}</h3><p>{image.description}</p><p><small>Recommended: {image.recommended}. JPEG, PNG, or WebP up to 5 MB.</small></p></div><img className="secure-review-cover" src={image.url} alt={image.alt} style={image.id === "logo" ? { objectFit: "contain", background: "#f4f1ea" } : undefined} /></div>
    <label>Image description (read aloud by screen readers)<input value={alt} maxLength={300} disabled={!image.customized} onChange={(event) => setAlt(event.target.value)} placeholder={image.customized ? "Describe what the photo shows" : "Replace the image first to edit its description"} /></label>
    {message && <p className="admin-result">{message}</p>}
    <div className="review-actions">
      <label className="button-primary upload-button" aria-disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {image.customized ? "Replace again" : "Replace image"}<input type="file" accept={ACCEPTED.join(",")} disabled={busy} hidden onChange={(event) => { void replace(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
      {image.customized && <button className="button-plain" type="button" disabled={saveAlt.isPending || alt.trim() === image.alt} onClick={() => saveAlt.mutate({ id: image.id, alt })}><Check size={14} /> Save description</button>}
      {image.customized && <button className="danger-button" type="button" disabled={reset.isPending || busy} onClick={() => { if (window.confirm(`Reset the ${image.label.toLowerCase()} to the original image?`)) reset.mutate({ id: image.id }); }}><RotateCcw size={14} /> Reset to original</button>}
    </div>
  </article>;
}
