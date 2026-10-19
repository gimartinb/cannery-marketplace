import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { describeRequirement, IMAGE_REQUIREMENTS } from "@shared/imageRequirements";
import { useSiteImages, type SiteImage } from "@/lib/siteImages";

// Where each spot can be seen, for the "View" link after a change.
const PAGE_FOR: Record<string, string> = { logo: "/", "home-hero": "/", "marketplace-interior": "/", "about-display": "/about", "social-sharing": "/" };

/** Owner dashboard tab: replace, describe, or reset each image spot on the public site. */
export default function SiteImagesPanel() {
  const images = useSiteImages();
  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Site appearance</p><h2>Site images</h2><p>Replace the logo and photos shown across the public site. Changes appear for visitors right away. Reset any spot to bring back the original image.</p></div></div><div className="secure-review-list">{images.map((image) => <SiteImageCard key={image.id} image={image} />)}</div></section>;
}

function SiteImageCard({ image }: { image: SiteImage }) {
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState(false);
  const [alt, setAlt] = useState(image.alt);
  useEffect(() => setAlt(image.alt), [image.alt]);
  const refresh = () => utils.siteImages.list.invalidate();
  const saveAlt = trpc.adminPortal.setSiteImageAlt.useMutation({ onSuccess: async () => { notifySuccess("Description saved"); await refresh(); }, onError: (error) => notifyError(error, "Description not saved") });
  const reset = trpc.adminPortal.resetSiteImage.useMutation({ onSuccess: async () => { notifySuccess(`${image.label} reset to the original`, { link: { label: "View page", href: PAGE_FOR[image.id] || "/" } }); await refresh(); }, onError: (error) => notifyError(error, "Image not reset") });

  async function replace(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    try {
      // Raw bytes, sent as is, so a transparent PNG logo keeps its transparency.
      const response = await fetch(`/api/admin/upload?slot=${encodeURIComponent(image.id)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The image did not upload. Your sign in may have expired. Reload the page and try again.");
      notifySuccess(`${image.label} replaced`, { description: "Visitors see the new image now.", link: { label: "View page", href: PAGE_FOR[image.id] || "/" } });
      await refresh();
    } catch (error) {
      notifyError(error, "Image not replaced");
    } finally {
      setBusy(false);
    }
  }

  return <article className="secure-admin-card"><div className="secure-card-heading"><div><span className="review-status">{image.customized ? "Custom image" : "Original image"}</span><h3>{image.label}</h3><p>{image.description}</p><p><small>Required: {describeRequirement(image.id)}. {IMAGE_REQUIREMENTS[image.id].shape}. JPEG, PNG, or WebP up to 5 MB. 300 DPI is nice to have.</small></p></div><img className="secure-review-cover" src={image.url} alt={image.alt} style={image.id === "logo" ? { objectFit: "contain", background: "#f4f1ea" } : undefined} /></div>
    <label>Image description (read aloud by screen readers)<input value={alt} maxLength={300} disabled={!image.customized} onChange={(event) => setAlt(event.target.value)} placeholder={image.customized ? "Describe what the photo shows" : "Replace the image first to edit its description"} /></label>
    <div className="review-actions">
      <ImageUploadButton spot={image.id} busy={busy} onFiles={replace} className="button-primary">{image.customized ? "Replace again" : "Replace image"}</ImageUploadButton><a className="button-plain" href={PAGE_FOR[image.id] || "/"} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View</a>
      {image.customized && <button className="button-plain" type="button" disabled={saveAlt.isPending || alt.trim() === image.alt} onClick={() => saveAlt.mutate({ id: image.id, alt })}><Check size={14} /> Save description</button>}
      {image.customized && <button className="danger-button" type="button" disabled={reset.isPending || busy} onClick={() => { if (window.confirm(`Reset the ${image.label.toLowerCase()} to the original image?`)) reset.mutate({ id: image.id }); }}><RotateCcw size={14} /> Reset to original</button>}
    </div>
  </article>;
}
