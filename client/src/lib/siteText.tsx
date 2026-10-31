import { Eye, Loader2, X } from "lucide-react";
import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import { parseSiteText, plainSiteText, siteTextOriginal } from "@shared/siteText";
import { trpc } from "@/lib/trpc";

declare global {
  interface Window { __SITE_TEXT__?: Record<string, string> }
}

const PREVIEW_KEY = "cannery-preview-drafts";

/** Draft preview stays on while the owner clicks around the site, until they exit it. */
function readPreviewFlag() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get("preview") === "drafts") sessionStorage.setItem(PREVIEW_KEY, "1");
    if (params.get("preview") === "off") sessionStorage.removeItem(PREVIEW_KEY);
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return params.get("preview") === "drafts";
  }
}

type SiteTextState = { text: Record<string, string>; ownerPreview: boolean };
const SiteTextContext = createContext<SiteTextState>({ text: {}, ownerPreview: false });

function PreviewBanner({ status, onExit }: { status: "loading" | "ok" | "error"; onExit: () => void }) {
  return <div className="preview-banner" role="status">
    {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
    <span>{status === "ok" ? "Previewing unpublished site text and hidden pages. Visitors do not see this." : status === "loading" ? "Loading your drafts…" : "Preview needs you to be signed in to the owner portal. Open /admin, sign in, then try Preview again."}</span>
    <button type="button" onClick={onExit}><X size={13} /> Exit preview</button>
  </div>;
}

/** Supplies the owners' wording to every page, and draft wording while an owner previews. */
export function SiteTextProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState(readPreviewFlag);
  const injected = typeof window !== "undefined" ? window.__SITE_TEXT__ : undefined;
  const published = trpc.settings.siteText.useQuery(undefined, { enabled: !injected, staleTime: 5 * 60_000 });
  const drafts = trpc.adminPortal.siteTextPreview.useQuery(undefined, { enabled: preview, retry: false, staleTime: 0 });
  useEffect(() => { if (!preview) return; document.documentElement.classList.add("has-preview-banner"); return () => document.documentElement.classList.remove("has-preview-banner"); }, [preview]);
  const ownerPreview = preview && drafts.isSuccess;
  const text = ownerPreview ? drafts.data : injected ?? published.data ?? {};
  function exit() {
    try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* storage unavailable */ }
    setPreview(false);
  }
  return <SiteTextContext.Provider value={{ text, ownerPreview }}>
    {children}
    {preview && <PreviewBanner status={drafts.isLoading ? "loading" : drafts.isSuccess ? "ok" : "error"} onExit={exit} />}
  </SiteTextContext.Provider>;
}

/** True while a signed in owner previews drafts (hidden pages show too). */
export function useOwnerPreview() { return useContext(SiteTextContext).ownerPreview; }

/** Raw wording for a text id: the owners' version if published, otherwise the original. */
export function useSiteText() {
  const { text } = useContext(SiteTextContext);
  return (key: string) => text[key] ?? siteTextOriginal(key);
}

/** Plain wording (no formatting marks), for placeholders, labels, and alt text. */
export function usePlainText() {
  const raw = useSiteText();
  return (key: string, vars?: Record<string, string>) => plainSiteText(raw(key), vars);
}

/** Renders editable site text, with *accent* words in italics and line breaks kept. */
export function Txt({ k, vars }: { k: string; vars?: Record<string, string> }) {
  const raw = useSiteText();
  return <>{parseSiteText(raw(k), vars).map((piece, index) => piece.br ? <br key={index} /> : piece.em ? <em key={index}>{piece.text}</em> : <Fragment key={index}>{piece.text}</Fragment>)}</>;
}

/** Renders any text with the same formatting rules (used by the owner portal's previews). */
export function FormattedText({ text, vars }: { text: string; vars?: Record<string, string> }) {
  return <>{parseSiteText(text, vars).map((piece, index) => piece.br ? <br key={index} /> : piece.em ? <em key={index}>{piece.text}</em> : <Fragment key={index}>{piece.text}</Fragment>)}</>;
}
