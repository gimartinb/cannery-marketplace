import { Star, Trash2 } from "lucide-react";
import AiWriteHelper, { type AiWriter } from "@/components/AiWriteHelper";
import { useState } from "react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { resizeImageForPreview } from "@/lib/imageProcessing";
import { describeRequirement } from "@shared/imageRequirements";
import { isListedCategory, type ListingField, type ListingProblems } from "@shared/makerListing";
import { useMakerCategories } from "@/lib/makerCategories";
import type { VendorProfileInput } from "@shared/vendorProfile";

export const MAX_LISTING_GALLERY = 5;
export type ListingValues = VendorProfileInput & { loginEmail?: string };

export const emptyListing: ListingValues = { name: "", ownerName: "", category: "", shortBio: "", ownerBio: "", contactEmail: "", websiteUrl: "", instagramUrl: "", facebookUrl: "", tiktokUrl: "", coverImageUrl: "", galleryImageUrls: [], featured: false, displayOrder: 100, active: true };

/** Copies a stored listing (profile or submission) into form values. */
export function toListingValues(row: { id?: number; profileId?: number | null; name: string; slug: string; category: string; shortBio: string; ownerBio: string | null; ownerName?: string | null; contactEmail: string; websiteUrl: string | null; instagramUrl: string | null; facebookUrl: string | null; tiktokUrl: string | null; coverImageUrl: string | null; galleryImageUrls: string[]; featured: boolean; displayOrder: number; active: boolean; loginEmail?: string | null }, profileId?: number): ListingValues {
  return { profileId: profileId ?? row.profileId ?? undefined, name: row.name, slug: row.slug, category: row.category, shortBio: row.shortBio, ownerBio: row.ownerBio || "", ownerName: row.ownerName || "", contactEmail: row.contactEmail, websiteUrl: row.websiteUrl || "", instagramUrl: row.instagramUrl || "", facebookUrl: row.facebookUrl || "", tiktokUrl: row.tiktokUrl || "", coverImageUrl: row.coverImageUrl || "", galleryImageUrls: row.galleryImageUrls || [], featured: row.featured, displayOrder: row.displayOrder, active: row.active, loginEmail: row.loginEmail || "" };
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
  /** Maker portal: the email they signed in with, shown read only. */
  signedInEmail?: string;
  /** Free AI writing help for the short description and About the maker. */
  aiWrite?: AiWriter;
};

function FieldError({ problems, field }: { problems?: ListingProblems; field: ListingField }) {
  const message = problems?.[field];
  return message ? <span className="form-error" id={`listing-${field}-error`} role="alert">{message}</span> : null;
}

/** The listing form shared by the maker portal and the owner dashboard, so both edit the same fields. */
export default function ListingFields({ value, onChange, upload, ownerControls, problems, signedInEmail, aiWrite }: Props) {
  const [busy, setBusy] = useState<"cover" | "gallery" | null>(null);
  const set = <K extends keyof ListingValues>(key: K, next: ListingValues[K]) => onChange({ ...value, [key]: next });
  const galleryRoom = MAX_LISTING_GALLERY - value.galleryImageUrls.length;
  const aiContext = { name: value.name, ownerName: value.ownerName || "", category: value.category === "Other" ? "" : value.category, shortBio: value.shortBio, ownerBio: value.ownerBio || "", title: "" };
  const invalid = (field: ListingField) => (problems?.[field] ? { "aria-invalid": true as const, "aria-describedby": `listing-${field}-error` } : {});
  // A category not on the list is shown as "Other" with the typed name in a text box.
  const categories = useMakerCategories();
  const categoryChoice = !value.category ? "" : isListedCategory(value.category, categories) ? value.category : "Other";
  const ownCategory = categoryChoice === "Other" && value.category !== "Other" ? value.category : "";

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
      <legend>Marketplace settings (owners only)</legend>
      <label>Login email (the maker signs in with this to edit the listing)<input type="email" value={value.loginEmail || ""} onChange={(event) => set("loginEmail", event.target.value)} placeholder="maker@example.com" /></label>
      <small className="form-hint">Saving adds this email to Maker access automatically. Leave blank if no maker should edit it.</small>
      <div className="listing-owner-row">
        <label className="checkbox-label"><input type="checkbox" checked={value.active} onChange={(event) => set("active", event.target.checked)} /> Visible on the site</label>
        <label className="checkbox-label"><input type="checkbox" checked={value.featured} onChange={(event) => set("featured", event.target.checked)} /> <Star size={13} /> Featured on the home page</label>
        <label>Display order<input type="number" min={0} max={9999} value={value.displayOrder} onChange={(event) => set("displayOrder", Number(event.target.value) || 0)} /></label>
      </div>
    </fieldset>}
    <p className="form-hint">{ownerControls ? "Asterisks mark what makers must fill in. As an owner you can save a listing with gaps and finish it later." : "Fields marked with an asterisk are required."}</p>
    {signedInEmail && <p className="signed-in-email">Your login email: <strong>{signedInEmail}</strong>. This is how you sign in. It is not shown on your public page.</p>}
    <label>Business name *<input id="listing-name" maxLength={140} value={value.name} onChange={(event) => set("name", event.target.value)} {...invalid("name")} /><FieldError problems={problems} field="name" /></label>
    <label>Maker's full name *<input id="listing-ownerName" maxLength={120} autoComplete="name" value={value.ownerName || ""} onChange={(event) => set("ownerName", event.target.value)} placeholder="Gilbert Martin" {...invalid("ownerName")} /><small className="form-hint">The person behind the work. Shown on the profile as "Meet" and this name.</small><FieldError problems={problems} field="ownerName" /></label>
    <label>Category *<select id="listing-category" value={categoryChoice} onChange={(event) => set("category", event.target.value)} {...invalid("category")}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{categoryChoice !== "Other" && <FieldError problems={problems} field="category" />}</label>
    {categoryChoice === "Other" && <label>Your category *<input id="listing-category-other" maxLength={40} value={ownCategory} onChange={(event) => set("category", event.target.value || "Other")} placeholder="Leather goods" {...invalid("category")} /><small className="form-hint">The marketplace reviews new categories and may match yours to one on the list.</small><FieldError problems={problems} field="category" /></label>}
    <label>Short description *<textarea id="listing-shortBio" maxLength={800} rows={3} value={value.shortBio} onChange={(event) => set("shortBio", event.target.value)} {...invalid("shortBio")} /><small className="form-hint">{value.shortBio.trim().length} / 800, at least 20</small><FieldError problems={problems} field="shortBio" /></label>
    {aiWrite && <AiWriteHelper field="shortBio" text={value.shortBio} write={aiWrite} context={aiContext} onUse={(text) => set("shortBio", text)} />}
    <label>About the maker *<textarea id="listing-ownerBio" rows={5} maxLength={1800} value={value.ownerBio} onChange={(event) => set("ownerBio", event.target.value)} {...invalid("ownerBio")} /><small className="form-hint">{(value.ownerBio || "").trim().length} / 1,800, at least 40</small><FieldError problems={problems} field="ownerBio" /></label>
    {aiWrite && <AiWriteHelper field="ownerBio" text={value.ownerBio || ""} write={aiWrite} context={aiContext} onUse={(text) => set("ownerBio", text)} notesHint="How you started, what you love about making it, and where you work" />}
    <label>Contact email (shown to shoppers) *<input id="listing-contactEmail" type="email" value={value.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} {...invalid("contactEmail")} /><FieldError problems={problems} field="contactEmail" /></label>
    <fieldset className="listing-links">
      <legend>Links</legend>
      <label>Website (optional)<input id="listing-websiteUrl" value={value.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} placeholder="yourshop.com" {...invalid("websiteUrl")} /><FieldError problems={problems} field="websiteUrl" /></label>
      <p className="form-hint">Social links are optional. Type your @handle or paste the full link.</p>
      <div className="portal-social-grid">
        <label>Instagram<input id="listing-instagramUrl" value={value.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} placeholder="@yourshop" {...invalid("instagramUrl")} /><FieldError problems={problems} field="instagramUrl" /></label>
        <label>Facebook<input id="listing-facebookUrl" value={value.facebookUrl} onChange={(event) => set("facebookUrl", event.target.value)} placeholder="@yourshop" {...invalid("facebookUrl")} /><FieldError problems={problems} field="facebookUrl" /></label>
        <label>TikTok<input id="listing-tiktokUrl" value={value.tiktokUrl} onChange={(event) => set("tiktokUrl", event.target.value)} placeholder="@yourshop" {...invalid("tiktokUrl")} /><FieldError problems={problems} field="tiktokUrl" /></label>
      </div>
    </fieldset>
    <div className="maker-media-editor">
      <p className="form-legend">Photos *</p>
      <p className="media-help">One cover photo, {describeRequirement("maker-cover")}. One to {MAX_LISTING_GALLERY} work photos, {describeRequirement("maker-gallery")}. Any size works: large photos are made smaller and small ones are enlarged to fit. Very small photos (under 400 pixels) are turned away.</p>
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
