import { Check, Loader2, PenLine, RotateCcw, Sparkles, Wand2, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { AI_QUICK_CHANGES, type AiField, type AiWriteRequest } from "@shared/aiWriting";

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
  /** Shortest text "Improve my writing" works on (headings can be short). */
  minImprove?: number;
  /** Longest text the field takes. */
  maxChars?: number;
};

/**
 * Writing help under any text field, used across the site:
 *  1. "Improve my writing" polishes what is there; "Write it for me" drafts from the details and a few notes.
 *  2. The suggestion appears in an editable box. The person can edit it, use it as is,
 *     ask for a change ("make it shorter"), or try again. Nothing changes until they choose Use.
 */
export default function AiWriteHelper({ field, text, context, write, onUse, notesHint, minImprove = 20, maxChars }: Props) {
  const [mode, setMode] = useState<"improve" | "draft" | null>(null);
  const [notes, setNotes] = useState("");
  const [askingNotes, setAskingNotes] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [edited, setEdited] = useState("");
  const [instruction, setInstruction] = useState("");
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState<"improve" | "draft" | "refine" | null>(null);
  const canImprove = text.trim().length >= minImprove;
  const fullContext = { ...context, ...(maxChars ? { maxChars } : {}) };

  function show(next: string) { setSuggestion(next); setEdited(next); }

  async function run(next: "improve" | "draft") {
    setMode(next); setBusy(next);
    try {
      show(await write({ field, mode: next, text, notes, context: fullContext }));
      setAskingNotes(false); setChanging(false);
    } catch (error) {
      notifyError(error, "Writing help is not available right now");
    } finally {
      setBusy(null);
    }
  }

  async function change(request: string) {
    const ask = request.trim();
    if (!ask) { notifyError("Say what you would like changed, like \"make it shorter\".", "Nothing to change"); return; }
    setBusy("refine");
    try {
      show(await write({ field, mode: "refine", text: edited, instruction: ask, notes, context: fullContext }));
      setInstruction(""); setChanging(false);
    } catch (error) {
      notifyError(error, "Writing help is not available right now");
    } finally {
      setBusy(null);
    }
  }

  function close() { setSuggestion(null); setChanging(false); setInstruction(""); }

  if (suggestion !== null) {
    const changed = edited.trim() !== suggestion.trim();
    const tooLong = maxChars ? edited.trim().length > maxChars : false;
    return <div className="ai-suggestion" role="region" aria-label="Writing suggestion">
      <p className="form-legend"><Sparkles size={13} /> {mode === "draft" ? "Suggested text" : "Polished version"}. Edit it here if you like.</p>
      <textarea className="ai-suggestion-text" value={edited} rows={Math.min(10, Math.max(2, Math.ceil(edited.length / 70)))} onChange={(event) => setEdited(event.target.value)} aria-label="Suggested text, editable" />
      <small className={tooLong ? "form-error" : "form-hint"}>{maxChars ? `${edited.trim().length} / ${maxChars} characters. ` : ""}Check that every detail is true before using it.</small>
      <div className="review-actions">
        <button className="button-primary compact-button" type="button" disabled={!edited.trim() || tooLong || busy !== null} onClick={() => { onUse(edited.trim()); close(); notifySuccess(changed ? "Your edited version was added" : "Text added", { description: "You can keep editing it in the field." }); }}><Check size={13} /> {changed ? "Use my edited version" : "Use as is"}</button>
        <button className="button-plain compact-button" type="button" disabled={busy !== null} aria-expanded={changing} onClick={() => setChanging((open) => !open)}><Wand2 size={13} /> Change it</button>
        <button className="button-plain compact-button" type="button" disabled={busy !== null} onClick={() => void run(mode || "draft")}>{busy === "improve" || busy === "draft" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Try again</button>
        <button className="button-plain compact-button" type="button" onClick={close}><X size={13} /> {text.trim() ? "Keep mine" : "Close"}</button>
      </div>
      {changing && <div className="ai-notes">
        <div className="ai-quick-changes">{AI_QUICK_CHANGES.map((item) => <button key={item} type="button" className="ai-chip" disabled={busy !== null} onClick={() => void change(item)}>{item}</button>)}</div>
        <label>Or say what to change<input value={instruction} maxLength={300} onChange={(event) => setInstruction(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void change(instruction); } }} placeholder="Mention our Saturday hours, or sound more playful" /></label>
        <div className="review-actions"><button className="button-primary compact-button" type="button" disabled={busy !== null} onClick={() => void change(instruction)}>{busy === "refine" ? <><Loader2 size={13} className="animate-spin" /> Changing…</> : <><Wand2 size={13} /> Apply change</>}</button></div>
        <small className="form-hint">Changes start from the text in the box above, including your own edits.</small>
      </div>}
    </div>;
  }

  return <div className="ai-helper">
    <div className="review-actions">
      <button className="button-plain compact-button" type="button" disabled={!canImprove || busy !== null} title={canImprove ? undefined : `Write at least ${minImprove} characters first`} onClick={() => void run("improve")}>{busy === "improve" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {busy === "improve" ? "Improving…" : "Improve my writing"}</button>
      <button className="button-plain compact-button" type="button" disabled={busy !== null} onClick={() => setAskingNotes((open) => !open)} aria-expanded={askingNotes}><PenLine size={13} /> Write it for me</button>
    </div>
    {askingNotes && <div className="ai-notes">
      <label>A few words to work from (optional if the details above are filled in)<textarea rows={2} maxLength={600} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={notesHint || "What you make, what it is made from, and what makes it special"} /></label>
      <div className="review-actions"><button className="button-primary compact-button" type="button" disabled={busy !== null} onClick={() => void run("draft")}>{busy === "draft" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {busy === "draft" ? "Writing…" : "Write it"}</button><button className="button-plain compact-button" type="button" onClick={() => setAskingNotes(false)}>Cancel</button></div>
    </div>}
    <small className="form-hint">Free writing help. You see the suggestion first, can edit it or ask for changes, and choose whether to use it.</small>
  </div>;
}
