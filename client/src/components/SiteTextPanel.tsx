import { Eye, History, Loader2, RotateCcw, Save, Search, Send, Trash2, Type } from "lucide-react";
import { useMemo, useState } from "react";
import AiWriteHelper from "@/components/AiWriteHelper";
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

/** Owner dashboard tab: edit the words on every public page, with drafts, preview, publish, and history. */
export default function SiteTextPanel() {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.siteText.useQuery();
  const publishAll = trpc.adminPortal.publishSiteText.useMutation();
  const [pageId, setPageId] = useState<SitePageId>("home");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => new Map((list.data?.rows ?? []).map((row) => [row.key, row as Row])), [list.data]);
  const drafts = (list.data?.rows ?? []).filter((row) => row.draft !== null);
  const draftCount = (id: SitePageId) => drafts.filter((row) => row.key.startsWith(`${id}.`)).length;
  const refresh = () => Promise.all([utils.adminPortal.siteText.invalidate(), utils.adminPortal.siteTextPreview.invalidate()]);
  const search = query.trim().toLowerCase();
  const shown = search
    ? SITE_TEXT.filter((block) => `${block.label} ${block.original} ${rows.get(block.key)?.published ?? ""} ${rows.get(block.key)?.draft ?? ""}`.toLowerCase().includes(search))
    : SITE_TEXT.filter((block) => block.page === pageId);
  const previewPath = search ? "/" : pagePath(pageId);

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Site text</p><h2>Edit the words on any page</h2><p>Change a heading, paragraph, button, or business detail, then save a draft, preview it on the real page, and publish. Nothing changes for visitors until you publish. Every publish is kept in History, and Restore original brings back the first wording.</p></div>
      <div className="review-actions">
        <a className="button-plain" href={`${previewPath}?preview=drafts`} target="_blank" rel="noreferrer"><Eye size={14} /> Preview drafts</a>
        <button className="button-primary" type="button" disabled={!drafts.length || publishAll.isPending} onClick={() => { if (!window.confirm(`Publish ${drafts.length} draft${drafts.length === 1 ? "" : "s"} to the live site?`)) return; publishAll.mutate({ keys: "all" }, { onSuccess: async (result) => { await refresh(); notifySuccess(`${result.published} change${result.published === 1 ? "" : "s"} published`, { description: "Visitors see the new wording the next time a page loads." }); }, onError: (error) => notifyError(error, "Not published") }); }}>{publishAll.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish all drafts{drafts.length ? ` (${drafts.length})` : ""}</button>
      </div>
    </div>
    <div className="site-text-tips"><Type size={15} /><p>Formatting: put <code>*stars*</code> around words to show them in gold italics, like the accent words in headings. Press Enter for a line break. On maker pages, <code>{"{business}"}</code> and <code>{"{maker}"}</code> fill in each maker's names.</p></div>
    <div className="site-text-toolbar">
      <label className="directory-search"><Search size={15} /><span className="sr-only">Search all site text</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all pages, for example hours or Saturday" /></label>
      {!search && <div className="site-text-pages" role="tablist" aria-label="Pages">{SITE_PAGES.map((page) => <button key={page.id} type="button" role="tab" aria-selected={pageId === page.id} className={pageId === page.id ? "active" : ""} onClick={() => setPageId(page.id)}>{page.label}{draftCount(page.id) > 0 && <span className="admin-count">{draftCount(page.id)}</span>}</button>)}</div>}
    </div>
    {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : list.error ? <div className="admin-empty"><h3>Site text did not load</h3><p>{list.error.message}</p></div>
      : shown.length ? <div className="site-text-list">{shown.map((block, index) => <div key={block.key}>{(search ? index === 0 || shown[index - 1].page !== block.page : false) && <h3 className="site-text-page-title">{pageLabel(block.page)}</h3>}<TextBlockEditor block={block} row={rows.get(block.key)} history={list.data?.history[block.key] ?? []} onSaved={refresh} /></div>)}</div>
      : <div className="admin-empty"><h3>No text matches "{query}"</h3><p>Try another word.</p></div>}
  </section>;
}
