// Shows owners exactly what a maker changed before they approve it.
// Text is compared word by word; photos are compared by address.

export type DiffPart = { type: "same" | "added" | "removed"; text: string };

const MAX_TOKENS = 1200;

/** Word level differences between two texts (spaces are kept with the words). */
export function wordDiff(before: string, after: string): DiffPart[] {
  if (before === after) return before ? [{ type: "same", text: before }] : [];
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  // Very long texts: show the whole old and new text instead of a word by word view.
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return [...(before ? [{ type: "removed" as const, text: before }] : []), ...(after ? [{ type: "added" as const, text: after }] : [])];
  // Longest common subsequence table, filled from the end.
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text; else parts.push({ type, text });
  };
  let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push("same", a[i]); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { push("removed", a[i]); i += 1; }
    else { push("added", b[j]); j += 1; }
  }
  while (i < a.length) { push("removed", a[i]); i += 1; }
  while (j < b.length) { push("added", b[j]); j += 1; }
  return parts;
}

export type ListingSnapshot = {
  name: string; ownerName?: string | null; category: string; shortBio: string; ownerBio?: string | null; contactEmail: string;
  websiteUrl?: string | null; instagramUrl?: string | null; facebookUrl?: string | null; tiktokUrl?: string | null;
  coverImageUrl?: string | null; galleryImageUrls?: string[] | null;
};

const TEXT_FIELDS = [
  ["name", "Business name"], ["ownerName", "Maker's full name"], ["category", "Category"], ["shortBio", "Short description"],
  ["ownerBio", "About the maker"], ["contactEmail", "Contact email"], ["websiteUrl", "Website"], ["instagramUrl", "Instagram"],
  ["facebookUrl", "Facebook"], ["tiktokUrl", "TikTok"],
] as const;

export type TextChange = { kind: "text"; field: (typeof TEXT_FIELDS)[number][0]; label: string; before: string; after: string; parts: DiffPart[] };
export type CoverChange = { kind: "cover"; field: "coverImageUrl"; label: string; before: string; after: string };
export type GalleryChange = { kind: "gallery"; field: "galleryImageUrls"; label: string; added: string[]; removed: string[]; kept: string[]; reordered: boolean };
export type ListingChange = TextChange | CoverChange | GalleryChange;

const clean = (value: string | null | undefined) => (value ?? "").trim();

/** Every difference between the live listing and the maker's submission. */
export function compareListing(live: ListingSnapshot | null | undefined, next: ListingSnapshot): { isNew: boolean; changes: ListingChange[] } {
  if (!live) return { isNew: true, changes: [] };
  const changes: ListingChange[] = [];
  for (const [field, label] of TEXT_FIELDS) {
    const before = clean(live[field]); const after = clean(next[field]);
    if (before !== after) changes.push({ kind: "text", field, label, before, after, parts: wordDiff(before, after) });
  }
  const coverBefore = clean(live.coverImageUrl); const coverAfter = clean(next.coverImageUrl);
  if (coverBefore !== coverAfter) changes.push({ kind: "cover", field: "coverImageUrl", label: "Cover photo", before: coverBefore, after: coverAfter });
  const oldGallery = live.galleryImageUrls ?? []; const newGallery = next.galleryImageUrls ?? [];
  const added = newGallery.filter((url) => !oldGallery.includes(url));
  const removed = oldGallery.filter((url) => !newGallery.includes(url));
  const kept = newGallery.filter((url) => oldGallery.includes(url));
  const reordered = !added.length && !removed.length && oldGallery.join("\n") !== newGallery.join("\n");
  if (added.length || removed.length || reordered) changes.push({ kind: "gallery", field: "galleryImageUrls", label: "Gallery photos", added, removed, kept, reordered });
  return { isNew: false, changes };
}

/** Finds the live listing a submission updates: by id first, then by web address name. */
export function findLiveListing<T extends { id: number; slug: string }>(listings: T[], submission: { profileId?: number | null; slug: string }) {
  return listings.find((item) => submission.profileId != null && item.id === submission.profileId) ?? listings.find((item) => item.slug === submission.slug) ?? null;
}
