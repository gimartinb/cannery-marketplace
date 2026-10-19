import { Star, Trash2 } from "lucide-react";
import { useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { resizeImageForPreview } from "@/lib/imageProcessing";
import { describeRequirement } from "@shared/imageRequirements";
import { MAKER_CATEGORIES, type ListingField, type ListingProblems } from "@shared/makerListing";
import type { VendorProfileInput } from "@shared/vendorProfile";

export const MAX_LISTING_GALLERY = 5;
export type ListingValues = VendorProfileInput & { loginEmail?: string };

export const emptyListing: ListingValues = { name: "", category: "", shortBio: "", ownerBio: "", contactEmail: "", websiteUrl: "", instagramUrl: "", facebookUrl: "", tiktokUrl: "", coverImageUrl: "", galleryImageUrls: [], featured: false, displayOrder: 100, active: true };

/** Copies a stored listing (profile or submission) into form values. */
export function toListingValues(row: { id?: number; profileId?: number | null; name: string; slug: string; category: string; shortBio: string; ownerBio: string | null; contactEmail: string; websiteUrl: string | null; instagramUrl: string | null; facebookUrl: string | null; tiktokUrl: string | null; coverImageUrl: string | null; galleryImageUrls: string[]; featured: boolean; displayOrder: number; active: boolean; loginEmail?: string | null }, profileId?: number): ListingValues {
  return { profileId: profileId ?? row.profileId ?? undefined, name: row.name, slug: row.slug, category: row.category, shortBio: row.shortBio, ownerBio: row.ownerBio || "", contactEmail: row.contactEmail, websiteUrl: row.websiteUrl || "", instagramUrl: row.instagramUrl || "", facebookUrl: row.facebookUrl || "", tiktokUrl: row.tiktokUrl || "", coverImageUrl: row.coverImageUrl || "", galleryImageUrls: row.galleryImageUrls || [], featured: row.featured, displayOrder: row.displayOrder, active: row.active, loginEmail: row.loginEmail || "" };
}

/** Resizes in the browser (long side 1600 px, JPEG) and streams the bytes to the given upload endpoint. */
export async function uploadListingPhoto(endpoint: string, file: File): Promise<string> {
  const dataUrl = await resizeImageForPreview(file);
  const blob = await (await fetch(dataUrl)).blob();
  const name = `${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  const separator = endpoint.includes("?") ? "&" : "?";
  const response = await fetch(`${endpoint}${separator}name=${encodeURIComponent(name)}`, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob, credentials: "include" });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || "The photo did not upload. Your sign in may have expired. Reload the page and try again.");
  return body.url;
}

type Props = {
  value: ListingValues;
  onChange: (next: ListingValues) => void;
  upload: (file: File) => Promise<string>;
  /** Owner only settings: login email, visibility, featured, and order. */
  ownerControls?: boolean;
  /** Problems to show under each field (shown after the first submit attempt). */
  problems?: ListingProblems;
};

function FieldError({ problems, field }: { problems?: ListingProblems; field: ListingField }) {
  const message = problems?.[field];
  return message ? <span className="form-error" id={`listing-${field}-error`} role="alert">{message}</span> : null;
}

/** The listing form shared by the maker portal and the owner dashboard, so both edit the same fields. */
export default function ListingFields({ value, onChange, upload, ownerControls, problems }: Props) {
  const [busy, setBusy] = useState<"cover" | "gallery" | null>(null);
  const set = <K extends keyof ListingValues>(key: K, next: ListingValues[K]) => onChange({ ...value, [key]: next });
  const galleryRoom = MAX_LISTING_GALLERY - value.galleryImageUrls.length;
  const invalid = (field: ListingField) => (problems?.[field] ? { "aria-invalid": true as const, "aria-describedby": `listing-${field}-error` } : {});
  // Owners can keep a category that is not on the maker list (for example from an import).
  const categories = value.category && !(MAKER_CATEGORIES as readonly string[]).includes(value.category) ? [value.category, ...MAKER_CATEGORIES] : [...MAKER_CATEGORIES];

  async function addPhotos(kind: "cover" | "gallery", files: File[]) {
    const selected = kind === "cover" ? files.slice(0, 1) : files.slice(0, Math.max(0, galleryRoom));
    if (!selected.length) { notifyError(`A listing holds up to ${MAX_LISTING_GALLERY} work photos. Remove one first.`, "Photo not added"); return; }
    setBusy(kind);
    const urls: string[] = [];
    try {
      for (const file of selected) urls.push(await upload(file));
    } catch (error) {
      notifyError(error, urls.length ? `${urls.length} photo${urls.length === 1 ? "" : "s"} added, then one failed` : "Photo not uploaded");
    } finally {
      setBusy(null);
    }
    if (!urls.length) return;
    onChange(kind === "cover" ? { ...value, coverImageUrl: urls[0] } : { ...value, galleryImageUrls: [...value.galleryImageUrls, ...urls].slice(0, MAX_LISTING_GALLERY) });
    notifySuccess(kind === "cover" ? "Cover photo ready" : `${urls.length} work photo${urls.length === 1 ? "" : "s"} ready`, { description: "Save the listing to keep the change." });
  }

  return <div className="listing-fields">
    {ownerControls && <fieldset className="listing-owner-controls">
      <legend>Owner settings</legend>
      <label>Login email (the maker signs in with this to edit the listing)<input type="email" value={value.loginEmail || ""} onChange={(event) => set("loginEmail", event.target.value)} placeholder="maker@example.com" /></label>
      <small className="form-hint">Saving adds this email to Maker access automatically. Leave blank if no maker should edit it.</small>
      <div className="listing-owner-row">
        <label className="checkbox-label"><input type="checkbox" checked={value.active} onChange={(event) => set("active", event.target.checked)} /> Visible on the site</label>
        <label className="checkbox-label"><input type="checkbox" checked={value.featured} onChange={(event) => set("featured", event.target.checked)} /> <Star size={13} /> Featured on the home page</label>
        <label>Display order<input type="number" min={0} max={9999} value={value.displayOrder} onChange={(event) => set("displayOrder", Number(event.target.value) || 0)} /></label>
      </div>
    </fieldset>}
    <p className="form-hint">{ownerControls ? "Asterisks mark what makers must fill in. As an owner you can save a listing with gaps and finish it later." : "Fields marked with an asterisk are required."}</p>
    <label>Maker name *<input id="listing-name" maxLength={140} value={value.name} onChange={(event) => set("name", event.target.value)} {...invalid("name")} /><FieldError problems={problems} field="name" /></label>
    <label>Category *<select id="listing-category" value={value.category} onChange={(event) => set("category", event.target.value)} {...invalid("category")}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><FieldError problems={problems} field="category" /></label>
    <label>Short description *<textarea id="listing-shortBio" maxLength={800} rows={3} value={value.shortBio} onChange={(event) => set("shortBio", event.target.value)} {...invalid("shortBio")} /><small className="form-hint">{value.shortBio.trim().length} / 800, at least 20</small><FieldError problems={problems} field="shortBio" /></label>
    <label>About the maker *<textarea id="listing-ownerBio" rows={5} maxLength={1800} value={value.ownerBio} onChange={(event) => set("ownerBio", event.target.value)} {...invalid("ownerBio")} /><small className="form-hint">{(value.ownerBio || "").trim().length} / 1,800, at least 40</small><FieldError problems={problems} field="ownerBio" /></label>
    <label>Contact email (shown to shoppers) *<input id="listing-contactEmail" type="email" value={value.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} {...invalid("contactEmail")} /><FieldError problems={problems} field="contactEmail" /></label>
    <fieldset className="listing-links">
      <legend>Links</legend>
      <label>Website (optional)<input id="listing-websiteUrl" type="url" value={value.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} placeholder="https://…" {...invalid("websiteUrl")} /><FieldError problems={problems} field="websiteUrl" /></label>
      <p className="form-hint">Add at least one social link *</p>
      <div className="portal-social-grid">
        <label>Instagram<input id="listing-instagramUrl" type="url" value={value.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} placeholder="https://instagram.com/…" {...invalid("instagramUrl")} /><FieldError problems={problems} field="instagramUrl" /></label>
        <label>Facebook<input id="listing-facebookUrl" type="url" value={value.facebookUrl} onChange={(event) => set("facebookUrl", event.target.value)} placeholder="https://facebook.com/…" {...invalid("facebookUrl")} /><FieldError problems={problems} field="facebookUrl" /></label>
        <label>TikTok<input id="listing-tiktokUrl" type="url" value={value.tiktokUrl} onChange={(event) => set("tiktokUrl", event.target.value)} placeholder="https://tiktok.com/@…" {...invalid("tiktokUrl")} /><FieldError problems={problems} field="tiktokUrl" /></label>
      </div>
      <FieldError problems={problems} field="social" />
    </fieldset>
    <div className="maker-media-editor">
      <p className="form-legend">Photos *</p>
      <p className="media-help">One cover photo, {describeRequirement("maker-cover")}. One to {MAX_LISTING_GALLERY} work photos, {describeRequirement("maker-gallery")}. Photos are resized automatically after they pass the size check.</p>
      <div className="review-actions">
        <ImageUploadButton spot="maker-cover" busy={busy === "cover"} disabled={busy !== null} onFiles={(files) => addPhotos("cover", files)}>{value.coverImageUrl ? "Replace cover photo" : "Add cover photo"}</ImageUploadButton>
        {galleryRoom > 0 && <ImageUploadButton spot="maker-gallery" multiple busy={busy === "gallery"} disabled={busy !== null} onFiles={(files) => addPhotos("gallery", files)}>Add work photos</ImageUploadButton>}
      </div>
      <FieldError problems={problems} field="coverImageUrl" /><FieldError problems={problems} field="galleryImageUrls" />
      <div className="maker-gallery-thumbs">
        {value.coverImageUrl && <div className="maker-gallery-thumb"><img src={value.coverImageUrl} alt="Cover preview" /><span>Cover</span><button type="button" aria-label="Remove cover photo" onClick={() => set("coverImageUrl", "")}><Trash2 size={12} /></button></div>}
        {value.galleryImageUrls.map((image, index) => <div className="maker-gallery-thumb" key={`${image}-${index}`}><img src={image} alt={`Work sample ${index + 1}`} /><button type="button" aria-label={`Remove work photo ${index + 1}`} onClick={() => set("galleryImageUrls", value.galleryImageUrls.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={12} /></button></div>)}
      </div>
    </div>
  </div>;
}
