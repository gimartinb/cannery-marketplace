import { ArrowRight, CircleDot, Sparkles } from "lucide-react";
import { compareListing, type DiffPart, type ListingChange, type ListingSnapshot } from "@shared/changeDiff";

/** Inline text with additions highlighted and removals struck through. */
export function DiffText({ parts }: { parts: DiffPart[] }) {
  return <p className="diff-text">{parts.map((part, index) => part.type === "added" ? <ins key={index}>{part.text}</ins> : part.type === "removed" ? <del key={index}>{part.text}</del> : <span key={index}>{part.text}</span>)}</p>;
}

function Change({ change }: { change: ListingChange }) {
  if (change.kind === "text") return <div className="review-change">
    <strong>{change.label}</strong>
    {!change.before ? <p className="diff-text"><ins>{change.after}</ins> <em className="diff-note">(new)</em></p>
      : !change.after ? <p className="diff-text"><del>{change.before}</del> <em className="diff-note">(removed)</em></p>
      : <DiffText parts={change.parts} />}
  </div>;
  if (change.kind === "cover") return <div className="review-change">
    <strong>{change.label}</strong>
    <div className="diff-photos-pair">
      {change.before ? <figure className="diff-photo removed"><img src={change.before} alt="Current cover" /><figcaption>Now on the site</figcaption></figure> : <figure className="diff-photo empty"><figcaption>No cover yet</figcaption></figure>}
      <ArrowRight size={18} aria-hidden="true" />
      {change.after ? <figure className="diff-photo added"><img src={change.after} alt="New cover" /><figcaption>New</figcaption></figure> : <figure className="diff-photo empty"><figcaption>Cover removed</figcaption></figure>}
    </div>
  </div>;
  return <div className="review-change">
    <strong>{change.label}{change.reordered ? " (new order only)" : ""}</strong>
    <div className="diff-gallery">
      {change.added.map((url) => <figure className="diff-photo added" key={url}><img src={url} alt="Added photo" /><figcaption>Added</figcaption></figure>)}
      {change.removed.map((url) => <figure className="diff-photo removed" key={url}><img src={url} alt="Removed photo" /><figcaption>Removed</figcaption></figure>)}
      {change.kept.map((url) => <figure className="diff-photo kept" key={url}><img src={url} alt="Unchanged photo" /><figcaption>Unchanged</figcaption></figure>)}
    </div>
  </div>;
}

/**
 * The top of each review card: "New listing", or exactly what changed compared
 * with the live listing, so owners do not have to compare by eye.
 */
export default function ReviewChanges({ live, submission }: { live: ListingSnapshot | null; submission: ListingSnapshot }) {
  const { isNew, changes } = compareListing(live, submission);
  if (isNew) return <div className="review-changes is-new"><p className="review-changes-title"><Sparkles size={15} /> New listing. Everything below is new.</p></div>;
  if (!changes.length) return <div className="review-changes"><p className="review-changes-title"><CircleDot size={15} /> Sent again with no changes from the live listing.</p></div>;
  return <div className="review-changes">
    <p className="review-changes-title"><CircleDot size={15} /> {changes.length} change{changes.length === 1 ? "" : "s"} from the live listing: {changes.map((change) => change.label).join(", ")}</p>
    <p className="review-diff-key"><ins>Added text</ins> <del>Removed text</del></p>
    {changes.map((change) => <Change change={change} key={change.field} />)}
  </div>;
}
