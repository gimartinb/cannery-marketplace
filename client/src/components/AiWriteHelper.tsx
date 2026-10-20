import { Check, Loader2, PenLine, RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { AiField, AiWriteRequest } from "@shared/aiWriting";

type Context = NonNullable<AiWriteRequest["context"]>;
export type AiWriter = (request: AiWriteRequest) => Promise<string>;

type Props = {
  field: AiField;
  /** What is in the field now. */
  text: string;
  /** Other details the helper may use (name, category, owner, other fields). */
  context: Context;
  write: AiWriter;
  onUse: (text: string) => void;
  /** Placeholder for the "write it for me" notes box. */
  notesHint?: string;
};

/**
 * Two kinds of help under a text field: polish what is already written, or
 * write it from the listing details plus a few notes. The person always sees
 * the suggestion first and chooses whether to use it.
 */
export default function AiWriteHelper({ field, text, context, write, onUse, notesHint }: Props) {
  const [mode, setMode] = useState<"improve" | "draft" | null>(null);
  const [notes, setNotes] = useState("");
  const [askingNotes, setAskingNotes] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canImprove = text.trim().length >= 20;

  async function run(next: "improve" | "draft") {
    setMode(next); setBusy(true);
    try {
      setSuggestion(await write({ field, mode: next, text, notes, context }));
      setAskingNotes(false);
    } catch (error) {
      notifyError(error, "Writing help is not available right now");
    } finally {
      setBusy(false);
    }
  }

  if (suggestion) return <div className="ai-suggestion" role="status">
    <p className="form-legend"><Sparkles size={13} /> {mode === "draft" ? "Suggested text" : "Polished version"}</p>
    <p>{suggestion}</p>
    <small className="form-hint">Check that every detail is true before using it. You can still edit it afterward.</small>
    <div className="review-actions">
      <button className="button-primary compact-button" type="button" onClick={() => { onUse(suggestion); setSuggestion(null); notifySuccess("Text added", { description: "Read it over and edit anything you like." }); }}><Check size={13} /> Use this</button>
      <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => void run(mode || "draft")}>{busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Try again</button>
      <button className="button-plain compact-button" type="button" onClick={() => setSuggestion(null)}><X size={13} /> {text.trim() ? "Keep mine" : "Close"}</button>
    </div>
  </div>;

  return <div className="ai-helper">
    <div className="review-actions">
      <button className="button-plain compact-button" type="button" disabled={!canImprove || busy} title={canImprove ? undefined : "Write at least 20 characters first"} onClick={() => void run("improve")}>{busy && mode === "improve" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {busy && mode === "improve" ? "Polishing…" : "Improve my writing"}</button>
      <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => setAskingNotes((open) => !open)} aria-expanded={askingNotes}><PenLine size={13} /> Write it for me</button>
    </div>
    {askingNotes && <div className="ai-notes">
      <label>A few words to work from (optional if the details above are filled in)<textarea rows={2} maxLength={600} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={notesHint || "What you make, what it is made from, and what makes it special"} /></label>
      <div className="review-actions"><button className="button-primary compact-button" type="button" disabled={busy} onClick={() => void run("draft")}>{busy && mode === "draft" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {busy && mode === "draft" ? "Writing…" : "Write it"}</button><button className="button-plain compact-button" type="button" onClick={() => setAskingNotes(false)}>Cancel</button></div>
    </div>}
    <small className="form-hint">Free writing help. You always see the suggestion first and choose whether to use it.</small>
  </div>;
}
