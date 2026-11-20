import { Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import ListingFields, { emptyListing, uploadListingPhoto, type ListingValues } from "@/components/ListingFields";
import { notifyError } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { startListingSchema, type StartListingInput } from "@shared/vendorProfile";

export type StartedListing = { id: number; email: string; name: string; category: string; shortBio: string; ownerBio: string | null; ownerName: string | null; contactEmail: string; websiteUrl: string | null; instagramUrl: string | null; facebookUrl: string | null; tiktokUrl: string | null; coverImageUrl: string | null; galleryImageUrls: string[] };

export function startedToValues(row: StartedListing): ListingValues {
  return { ...emptyListing, name: row.name, category: row.category, shortBio: row.shortBio, ownerBio: row.ownerBio || "", ownerName: row.ownerName || "", contactEmail: row.contactEmail === row.email ? "" : row.contactEmail, websiteUrl: row.websiteUrl || "", instagramUrl: row.instagramUrl || "", facebookUrl: row.facebookUrl || "", tiktokUrl: row.tiktokUrl || "", coverImageUrl: row.coverImageUrl || "", galleryImageUrls: row.galleryImageUrls || [] };
}

/** Turns the listing editor's values into a started listing (only the name is required). */
export function toStartInput(values: ListingValues, email: string, id?: number): { ok: true; input: StartListingInput } | { ok: false; message: string } {
  const parsed = startListingSchema.safeParse({ id, email, name: values.name, category: values.category, shortBio: values.shortBio, ownerBio: values.ownerBio, ownerName: values.ownerName, contactEmail: values.contactEmail, websiteUrl: values.websiteUrl, instagramUrl: values.instagramUrl, facebookUrl: values.facebookUrl, tiktokUrl: values.tiktokUrl, coverImageUrl: values.coverImageUrl, galleryImageUrls: values.galleryImageUrls });
  return parsed.success ? { ok: true, input: parsed.data } : { ok: false, message: parsed.error.issues[0]?.message || "Check the listing details." };
}

/** The listing editor for a started listing. Only the business name is required; the maker finishes the rest. */
export function StartListingFields({ value, onChange }: { value: ListingValues; onChange: (next: ListingValues) => void }) {
  const aiWriter = trpc.adminPortal.aiWrite.useMutation();
  return <div className="start-listing-fields">
    <p className="form-hint">Fill in what you know. Only the business name is needed; the maker adds the rest. Nothing here is public until the maker sends it for review and you approve it. Leave the contact email blank to use the maker's email.</p>
    <ListingFields value={value} onChange={onChange} aiWrite={async (request) => (await aiWriter.mutateAsync(request)).suggestion} upload={(file) => uploadListingPhoto("/api/admin/upload?purpose=vendor", file)} />
  </div>;
}

/** Edit a started listing the maker has not sent yet. */
export function EditStartedListing({ row, onDone }: { row: StartedListing; onDone: () => void }) {
  const utils = trpc.useUtils();
  const [values, setValues] = useState<ListingValues>(() => startedToValues(row));
  const save = trpc.adminPortal.startListing.useMutation({ onSuccess: async () => { await utils.adminPortal.startedListings.invalidate(); onDone(); }, onError: (error) => notifyError(error, "Listing not saved") });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = toStartInput(values, row.email, row.id);
    if (!result.ok) { notifyError(result.message, "Check the listing"); return; }
    save.mutate(result.input);
  }
  return <form className="secure-admin-card start-listing-card" onSubmit={submit}>
    <div className="secure-card-heading"><div><h3>Edit the listing started for {row.email}</h3><p>The maker sees your changes the next time they sign in.</p></div><button className="button-plain compact-button" type="button" onClick={onDone}><X size={13} /> Close</button></div>
    <StartListingFields value={values} onChange={setValues} />
    <div className="review-actions sticky-save-bar"><button className="button-primary" type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save started listing</button><button className="button-plain" type="button" onClick={onDone}>Cancel</button></div>
  </form>;
}
