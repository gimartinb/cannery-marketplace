import { Check, Eye, History, ImageIcon, Loader2, RotateCcw, Save, Search, Send, Trash2, Type } from "lucide-react";
import { useMemo, useState } from "react";
import AiWriteHelper from "@/components/AiWriteHelper";
import GalleryPanel from "@/components/GalleryPanel";
import { MarketplaceSocialEditor } from "@/components/FollowUs";
import HighlightsPanel from "@/components/HighlightsPanel";
import ImageUploadButton from "@/components/ImageUploadButton";
import { siteImageDefaults } from "@/lib/siteImages";
import { describeRequirement, IMAGE_REQUIREMENTS } from "@shared/imageRequirements";
import type { SiteImageSlotId } from "@shared/siteImageSlots";
import { FormattedText } from "@/lib/siteText";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { SITE_PAGES, SITE_TEXT, siteTextProblem, type SitePageId, type SiteTextBlock } from "@shared/siteText";

type Row = { key: string; draft: string | null; published: string | null; draftBy: string | null; publishedBy: string | null; publishedAt: Date | null };
type HistoryEntry = { id: number; text: string; publishedBy: string | null; publishedAt: Date };

const KIND_LABEL: Record<SiteTextBlock["kind"], string> = { eyebrow: "Small label", heading: "Heading", paragraph: "Paragraph", button: "Button or link", item: "Short text", detail: "Business detail" };
const pageLabel = (id: SitePageId) => SITE_PAGES.find((page) => page.id === id)?.label ?? id;
const pagePath = (id: SitePageId) => SITE_PAGES.find((page) => page.id === id)?.path ?? "/";
const when = (date: Date) => new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function TextBlockEditor({ block, row, history, onSaved }: { block: SiteTextBlock; row: Row | undefined; history: HistoryEntry[]; onSaved: () => Promise<unknown> }) {
  const live = row?.published ?? block.original;
  const saved = row?.draft ?? live;
  const [value, setValue] = useState(saved);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSaved, setLastSaved] = useState(saved);
  // When someone else saves (or after a publish), follow the server unless this box has unsaved typing.
  if (saved !== lastSaved) { if (value === lastSaved) setValue(saved); setLastSaved(saved); }
  const aiWriter = trpc.adminPortal.aiWrite.useMutation();
  const saveDraft = trpc.adminPortal.saveSiteTextDraft.useMutation();
  const publish = trpc.adminPortal.publishSiteText.useMutation();
  const discard = trpc.adminPortal.discardSiteTextDraft.useMutation();
  const restore = trpc.adminPortal.restoreOriginalSiteText.useMutation();
  const busy = saveDraft.isPending || publish.isPending || discard.isPending || restore.isPending;
  const problem = value.trim() === saved.trim() ? null : siteTextProblem(block.key, value);
  const unsaved = value.trim() !== saved.trim();
  const hasDraft = row?.draft != null;
  const status = hasDraft ? { label: "Draft, not live yet", tone: "pending" } : row?.published != null ? { label: "Edited and live", tone: "published" } : { label: "Original wording", tone: "muted" };
  const vars = { business: "Hearth & Grain", maker: "Maria Lopez" };

  async function save() {
    try { await saveDraft.mutateAsync({ key: block.key, text: value }); await onSaved(); notifySuccess("Draft saved", { description: "It is not on the site yet. Use Preview to see it, then Publish." }); }
    catch (error) { notifyError(error, "Draft not saved"); }
  }
  async function publishNow() {
    try {
      if (unsaved) await saveDraft.mutateAsync({ key: block.key, text: value });
      const result = await publish.mutateAsync({ keys: [block.key] });
      await onSaved();
      notifySuccess(result.published ? "Published" : "Nothing to publish", { description: result.published ? "Visitors see the new wording the next time a page loads." : "This text already matches what is live.", link: result.published ? { label: "View page", href: pagePath(block.page) } : undefined });
    } catch (error) { notifyError(error, "Not published"); }
  }

  return <article className="secure-admin-card site-text-card" id={`text-${block.key}`}>
    <div className="site-text-head">
      <div><strong>{block.label}</strong><small>{KIND_LABEL[block.kind]} · up to {block.maxChars} characters</small></div>
      <span className={`listing-status listing-status-${status.tone}`}>{status.label}</span>
    </div>
    {(hasDraft || row?.published != null) && <p className="site-text-live"><span>Live now:</span> <FormattedText text={live} vars={vars} /></p>}
    <textarea value={value} rows={block.kind === "paragraph" ? 4 : value.length > 70 || value.includes("\n") ? 2 : 1} maxLength={block.maxChars + 200} onChange={(event) => setValue(event.target.value)} aria-label={`${pageLabel(block.page)}: ${block.label}`} aria-invalid={problem ? true : undefined} />
    <div className="site-text-meta">
      <small className={problem ? "form-error" : "form-hint"}>{problem ?? `${value.trim().length} / ${block.maxChars}`}</small>
      {/[*\n{]/.test(value) && <small className="site-text-preview">Shows as: <FormattedText text={value} vars={vars} /></small>}
    </div>
    <AiWriteHelper field="siteText" text={value} minImprove={2} maxChars={block.maxChars} context={{ section: `${pageLabel(block.page)}, ${block.label}`, original: block.original }} write={async (request) => (await aiWriter.mutateAsync(request)).suggestion} onUse={setValue} notesHint="What this text should say, for example our new Saturday hours or a holiday sale" />
    <div className="review-actions">
      <button className="button-plain compact-button" type="button" disabled={!unsaved || Boolean(problem) || busy} onClick={() => void save()}>{saveDraft.isPending && !publish.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save draft</button>
      <button className="button-primary compact-button" type="button" disabled={(!unsaved && !hasDraft) || Boolean(problem) || busy} onClick={() => void publishNow()}>{publish.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publish</button>
      {hasDraft && <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => { discard.mutate({ key: block.key }, { onSuccess: async () => { setValue(live); await onSaved(); notifySuccess("Draft discarded", { description: "The live wording is unchanged." }); }, onError: (error) => notifyError(error, "Draft not discarded") }); }}><Trash2 size={13} /> Discard draft</button>}
      {(live !== block.original || (hasDraft && row?.draft !== block.original)) && <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => { restore.mutate({ key: block.key }, { onSuccess: async () => { setValue(block.original); await onSaved(); notifySuccess("Original wording is in the draft", { description: "Publish to put it back on the site." }); }, onError: (error) => notifyError(error, "Not restored") }); }}><RotateCcw size={13} /> Restore original</button>}
      {history.length > 0 && <button className="button-plain compact-button" type="button" aria-expanded={showHistory} onClick={() => setShowHistory((open) => !open)}><History size={13} /> History ({history.length})</button>}
    </div>
    {showHistory && <ul className="site-text-history">{history.map((entry) => <li key={entry.id}>
      <small>{when(entry.publishedAt)}{entry.publishedBy ? ` by ${entry.publishedBy}` : ""}</small>
      <p>{entry.text ? <FormattedText text={entry.text} vars={vars} /> : <em>Original wording</em>}</p>
      <button className="button-plain compact-button" type="button" onClick={() => { setValue(entry.text || block.original); notifySuccess("Loaded into the editor", { description: "Save a draft or Publish to use it." }); }}>Use this wording</button>
    </li>)}</ul>}
  </article>;
}

type ImageRow = { id: string; url: string; alt: string | null };
type ImageDraft = { id: string; url: string | null; alt: string | null; draftBy: string | null };

/** One image spot: live image, draft image, description, and Draft then Publish like text. */
function ImageSpotEditor({ slot, live, draft, onSaved }: { slot: SiteImageSlotId; live: ImageRow | undefined; draft: ImageDraft | undefined; onSaved: () => Promise<unknown> }) {
  const info = siteImageDefaults.find((item) => item.id === slot)!;
  const liveUrl = live?.url ?? info.defaultUrl;
  const liveAlt = live?.alt || info.alt;
  const draftUrl = draft ? draft.url ?? info.defaultUrl : null;
  const shownAlt = draft ? draft.alt || (draft.url ? liveAlt : info.alt) : liveAlt;
  const [alt, setAlt] = useState(shownAlt);
  const [lastAlt, setLastAlt] = useState(shownAlt);
  if (shownAlt !== lastAlt) { setAlt(shownAlt); setLastAlt(shownAlt); }
  const [busy, setBusy] = useState(false);
  const saveAlt = trpc.adminPortal.setSiteImageAlt.useMutation();
  const reset = trpc.adminPortal.resetSiteImage.useMutation();
  const discard = trpc.adminPortal.discardSiteImageDraft.useMutation();
  const publish = trpc.adminPortal.publishSiteImages.useMutation();
  const pending = busy || saveAlt.isPending || reset.isPending || discard.isPending || publish.isPending;
  const customLive = Boolean(live);
  const editingCustom = draft ? draft.url !== null : customLive;
  const status = draft ? { label: "Draft, not live yet", tone: "pending" } : customLive ? { label: "Replaced and live", tone: "published" } : { label: "Original image", tone: "muted" };
  const logo = slot === "logo" ? { objectFit: "contain" as const, background: "#f4f1ea" } : undefined;
  const run = async (action: () => Promise<unknown>, done: string, description: string, failed: string) => {
    try { await action(); await onSaved(); notifySuccess(done, { description }); } catch (error) { notifyError(error, failed); }
  };

  async function upload(files: File[]) {
    const file = files[0]; if (!file) return;
    setBusy(true);
    try {
      // Raw bytes, sent as is, so a transparent PNG logo keeps its transparency.
      const response = await fetch(`/api/admin/upload?slot=${encodeURIComponent(slot)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The image did not upload. Your sign in may have expired. Reload the page and try again.");
      await onSaved();
      notifySuccess("New image saved as a draft", { description: "Preview it, then Publish to show it to visitors." });
    } catch (error) { notifyError(error, "Image not uploaded"); } finally { setBusy(false); }
  }

  return <article className="secure-admin-card site-text-card site-image-card" id={`image-${slot}`}>
    <div className="site-text-head">
      <div><strong><ImageIcon size={14} /> {info.label}</strong><small>Image · {info.description}</small></div>
      <span className={`listing-status listing-status-${status.tone}`}>{status.label}</span>
    </div>
    <div className="site-image-compare">
      <figure><img src={liveUrl} alt={liveAlt} style={logo} /><figcaption>{draft ? "Live now" : customLive ? "Live now (your image)" : "Live now (original)"}</figcaption></figure>
      {draftUrl && <figure className="is-draft"><img src={draftUrl} alt={shownAlt} style={logo} /><figcaption>{draft?.url ? "Draft" : "Draft: back to the original"}</figcaption></figure>}
    </div>
    <small className="form-hint">Best: {describeRequirement(slot)}. {IMAGE_REQUIREMENTS[slot].shape}. Any JPEG, PNG, or WebP photo; large photos are resized for you.</small>
    <label>Image description (read aloud by screen readers)<input value={alt} maxLength={300} disabled={!editingCustom} onChange={(event) => setAlt(event.target.value)} placeholder={editingCustom ? "Describe what the photo shows" : "Replace the image first to edit its description"} /></label>
    <div className="review-actions">
      <ImageUploadButton spot={slot} busy={busy} onFiles={upload} className="button-plain compact-button">{editingCustom ? "Replace again" : "Replace image"}</ImageUploadButton>
      {editingCustom && alt.trim() !== shownAlt && <button className="button-plain compact-button" type="button" disabled={pending} onClick={() => void run(() => saveAlt.mutateAsync({ id: slot, alt }), "Description saved as a draft", "Publish to show it.", "Description not saved")}><Check size={13} /> Save description</button>}
      <button className="button-primary compact-button" type="button" disabled={!draft || pending} onClick={() => void run(() => publish.mutateAsync({ ids: [slot] }), "Image published", "Visitors see it the next time a page loads.", "Not published")}>{publish.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publish</button>
      {draft && <button className="button-plain compact-button" type="button" disabled={pending} onClick={() => void run(() => discard.mutateAsync({ id: slot }), "Draft discarded", "The live image is unchanged.", "Draft not discarded")}><Trash2 size={13} /> Discard draft</button>}
      {(customLive || draft?.url) && draft?.url !== null && <button className="button-plain compact-button" type="button" disabled={pending} onClick={() => void run(() => reset.mutateAsync({ id: slot }), "Original image is in the draft", "Publish to put it back on the site.", "Not restored")}><RotateCcw size={13} /> Restore original</button>}
    </div>
  </article>;
}

// Where images and the photo sections sit among each page's text, in page order.
type Extra = { kind: "image"; slot: SiteImageSlotId } | { kind: "highlights" } | { kind: "gallery" } | { kind: "socials" };
const EXTRAS_BEFORE: Partial<Record<string, Extra[]>> = { "shared.nav.makers": [{ kind: "image", slot: "logo" }] };
const EXTRAS_AFTER: Partial<Record<string, Extra[]>> = {
  "home.hero.cardLink": [{ kind: "image", slot: "home-hero" }],
  "home.products.body": [{ kind: "highlights" }],
  "home.feature3.body": [{ kind: "image", slot: "marketplace-interior" }],
  "about.story.quote": [{ kind: "image", slot: "about-display" }],
  "about.gallery.title": [{ kind: "gallery" }],
  "shared.business.email": [{ kind: "image", slot: "social-sharing" }],
  "shared.follow.body": [{ kind: "socials" }],
};
const IMAGE_PAGE: Record<SiteImageSlotId, SitePageId> = { logo: "shared", "social-sharing": "shared", "home-hero": "home", "marketplace-interior": "home", "about-display": "about" };

type Vendor = { slug: string; name: string; active: boolean; category: string; shortBio: string; coverImageUrl: string | null };

/**
 * Owner dashboard tab "Edit pages": every page's words, images, highlights, and gallery in
 * one place, in page order. Words and images use Draft, Preview, then Publish.
 */
export default function EditPagesPanel({ vendors }: { vendors: Vendor[] }) {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.siteText.useQuery();
  const liveImages = trpc.siteImages.list.useQuery();
  const imageDrafts = trpc.adminPortal.siteImageDrafts.useQuery();
  const publishAll = trpc.adminPortal.publishAllPageDrafts.useMutation();
  const [pageId, setPageId] = useState<SitePageId>("home");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => new Map((list.data?.rows ?? []).map((row) => [row.key, row as Row])), [list.data]);
  const liveById = useMemo(() => new Map((liveImages.data ?? []).map((row) => [row.id, row as ImageRow])), [liveImages.data]);
  const draftById = useMemo(() => new Map((imageDrafts.data ?? []).map((row) => [row.id, row as ImageDraft])), [imageDrafts.data]);
  const textDrafts = (list.data?.rows ?? []).filter((row) => row.draft !== null);
  const totalDrafts = textDrafts.length + (imageDrafts.data?.length ?? 0);
  const draftCount = (id: SitePageId) => textDrafts.filter((row) => row.key.startsWith(`${id}.`)).length + (imageDrafts.data ?? []).filter((row) => IMAGE_PAGE[row.id as SiteImageSlotId] === id).length;
  const refresh = () => Promise.all([utils.adminPortal.siteText.invalidate(), utils.adminPortal.siteTextPreview.invalidate(), utils.adminPortal.siteImageDrafts.invalidate(), utils.adminPortal.siteImagesPreview.invalidate(), utils.siteImages.list.invalidate()]);
  const search = query.trim().toLowerCase();
  const shown = search
    ? SITE_TEXT.filter((block) => `${block.label} ${block.original} ${rows.get(block.key)?.published ?? ""} ${rows.get(block.key)?.draft ?? ""}`.toLowerCase().includes(search))
    : SITE_TEXT.filter((block) => block.page === pageId);
  const previewPath = search ? "/" : pagePath(pageId);

  const extra = (item: Extra) => item.kind === "socials" ? <MarketplaceSocialEditor key="socials" /> : item.kind === "image"
    ? <ImageSpotEditor key={item.slot} slot={item.slot} live={liveById.get(item.slot)} draft={draftById.get(item.slot)} onSaved={refresh} />
    : <div className="page-section-embed" key={item.kind}><p className="page-section-note">{item.kind === "highlights" ? "Home highlights are cards with their own start and end dates. Changes here go live when you save a card." : "Gallery changes go live when you save them."}</p>{item.kind === "highlights" ? <HighlightsPanel vendors={vendors} embedded /> : <GalleryPanel embedded />}</div>;

  function publishEverything() {
    if (!window.confirm(`Publish ${totalDrafts} draft${totalDrafts === 1 ? "" : "s"} to the live site?`)) return;
    publishAll.mutate(undefined, {
      onSuccess: async (result) => { await refresh(); const total = result.text + result.images; notifySuccess(`${total} change${total === 1 ? "" : "s"} published`, { description: "Visitors see them the next time a page loads." }); },
      onError: (error) => notifyError(error, "Not published"),
    });
  }

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Edit pages</p><h2>Words and photos, page by page</h2><p>Pick a page, then change its words and photos in the order they appear. Changes save as drafts. Preview them on the real page, then Publish. Visitors see nothing until you publish. Restore original brings back the first version.</p></div>
      <div className="review-actions">
        <a className="button-plain" href={`${previewPath}?preview=drafts`} target="_blank" rel="noreferrer"><Eye size={14} /> Preview drafts</a>
        <button className="button-primary" type="button" disabled={!totalDrafts || publishAll.isPending} onClick={publishEverything}>{publishAll.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish all drafts{totalDrafts ? ` (${totalDrafts})` : ""}</button>
      </div>
    </div>
    <div className="site-text-toolbar">
      <div className="site-text-pages" role="tablist" aria-label="Pages">{SITE_PAGES.map((page) => <button key={page.id} type="button" role="tab" aria-selected={!search && pageId === page.id} className={!search && pageId === page.id ? "active" : ""} onClick={() => { setQuery(""); setPageId(page.id); }}>{page.label}{draftCount(page.id) > 0 && <span className="admin-count">{draftCount(page.id)}</span>}</button>)}</div>
      <label className="directory-search"><Search size={15} /><span className="sr-only">Search all words</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Or search the words on every page, for example Saturday" /></label>
    </div>
    <div className="site-text-tips"><Type size={15} /><p>Formatting: put <code>*stars*</code> around words to show them in gold italics, like the accent words in headings. Press Enter for a line break. On maker pages, <code>{"{business}"}</code> and <code>{"{maker}"}</code> fill in each maker's names.</p></div>
    {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : list.error ? <div className="admin-empty"><h3>Page content did not load</h3><p>{list.error.message}</p></div>
      : shown.length ? <div className="site-text-list">{shown.map((block, index) => <div key={block.key} className="site-text-item">
        {search && (index === 0 || shown[index - 1].page !== block.page) && <h3 className="site-text-page-title">{pageLabel(block.page)}</h3>}
        {!search && (EXTRAS_BEFORE[block.key] ?? []).map(extra)}
        <TextBlockEditor block={block} row={rows.get(block.key)} history={list.data?.history[block.key] ?? []} onSaved={refresh} />
        {!search && (EXTRAS_AFTER[block.key] ?? []).map(extra)}
      </div>)}</div>
      : <div className="admin-empty"><h3>No words match "{query}"</h3><p>Try another word.</p></div>}
  </section>;
}
