import { ArrowRight, CheckCircle2, ImagePlus, Loader2, PenLine, Star, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { fitImageFile, normalizeImageFile } from "@/components/ImageUploadButton";
import { readableError } from "@/lib/notify";
import { Txt } from "@/lib/siteText";
import { trpc } from "@/lib/trpc";
import { EMPTY_REVIEW, REVIEW_SOURCE_LABEL, reviewProblems, type ReviewField, type ReviewSource, type ReviewValues } from "@shared/reviews";
import { ADMIN_URL } from "@shared/site";

const NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/thecannerymarketplace@gmail.com";
const monthYear = (date: Date | string) => new Date(date).toLocaleDateString(undefined, { month: "long", year: "numeric" });

/** Read only stars, for averages and single reviews. */
export function Stars({ value, size = 15, label }: { value: number; size?: number; label?: string }) {
  return <span className="stars" role="img" aria-label={label ?? `${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} className={value >= n - 0.25 ? "on" : value >= n - 0.75 ? "half" : ""} />)}</span>;
}

/** Tap to choose 1 to 5 stars. */
function StarPicker({ value, onChange, invalid }: { value: number; onChange: (value: number) => void; invalid?: boolean }) {
  const [hover, setHover] = useState(0);
  const words = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  return <div className={`star-picker${invalid ? " invalid" : ""}`} role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
    {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} className={(hover || value) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}><Star size={26} /></button>)}
    <span>{words[hover || value] || "Tap a star"}</span>
  </div>;
}

type PublicReview = { id: number; rating: number; body: string; reviewerCity: string | null; photoUrl: string | null; source: ReviewSource; createdAt: Date | string };

export function ReviewCard({ review, maker }: { review: PublicReview; maker?: { name: string | null; slug: string | null } }) {
  return <article className="review-card">
    <Stars value={review.rating} />
    <p className="review-body">“{review.body}”</p>
    {review.photoUrl && <img className="review-photo" src={review.photoUrl} alt="Photo shared by the shopper" loading="lazy" />}
    <footer><span><strong>A verified shopper</strong>{review.reviewerCity ? ` from ${review.reviewerCity}` : ""}</span><small>{monthYear(review.createdAt)}{review.source !== "website" ? ` · via ${REVIEW_SOURCE_LABEL[review.source]}` : ""}</small></footer>
    {maker?.name && (maker.slug ? <Link className="text-link" href={`/vendors/${maker.slug}`}>{maker.name} <ArrowRight size={14} /></Link> : <span className="review-maker">{maker.name}</span>)}
  </article>;
}

export function ReviewForm({ slug, makerName, onClose }: { slug: string; makerName: string; onClose: () => void }) {
  const [values, setValues] = useState<ReviewValues>(EMPTY_REVIEW);
  const [showProblems, setShowProblems] = useState(false);
  const [honey, setHoney] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = trpc.reviews.submit.useMutation();
  const problems = reviewProblems(values);
  const shown = showProblems ? problems : {};
  const set = <K extends ReviewField>(key: K, next: ReviewValues[K]) => setValues((current) => ({ ...current, [key]: next }));
  const fieldError = (field: ReviewField) => shown[field] ? <span className="form-error" role="alert">{shown[field]}</span> : null;

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fitted = await fitImageFile(await normalizeImageFile(file), 1600);
      const response = await fetch("/api/review-photo", { method: "POST", headers: { "Content-Type": fitted.type }, body: fitted });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "The photo did not upload. You can still send your review without it.");
      set("photoUrl", body.url);
    } catch (failure) { setError(readableError(failure, "The photo did not upload.")); } finally { setUploading(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (Object.keys(problems).length) { setShowProblems(true); return; }
    setError("");
    try {
      await submit.mutateAsync({ slug, ...values, website2: honey });
      void fetch(NOTIFY_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ _subject: `New review for ${slug ? makerName : "the marketplace"}: ${values.rating} stars`, _template: "table", Maker: slug ? makerName : "The marketplace itself", Rating: `${values.rating} of 5`, Review: values.body.trim(), From: `${values.reviewerName.trim()}${values.reviewerCity.trim() ? `, ${values.reviewerCity.trim()}` : ""}`, "Approve it": ADMIN_URL }) }).catch(() => undefined);
      setDone(true);
    } catch (failure) { setError(readableError(failure, "We could not send your review. Please try again.")); }
  }

  if (done) return <div className="review-form review-thanks" role="status"><CheckCircle2 size={22} /><p><Txt k="profile.reviews.thanks" /></p><button className="button-plain" type="button" onClick={onClose}>Close</button></div>;
  return <form className="review-form contact-form" onSubmit={send} noValidate>
    <div className="review-form-head"><h3>{slug ? `Review ${makerName}` : "Review The Cannery Marketplace"}</h3><button className="button-plain compact-button" type="button" onClick={onClose} aria-label="Close the review form"><X size={13} /></button></div>
    <input type="text" name="website2" value={honey} onChange={(event) => setHoney(event.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <div className="form-field full"><span className="field-label">Your rating *</span><StarPicker value={values.rating} onChange={(value) => set("rating", value)} invalid={Boolean(shown.rating)} />{fieldError("rating")}</div>
    <div className="form-field full"><label htmlFor="review-body">Your review *</label><textarea id="review-body" rows={4} maxLength={1000} value={values.body} onChange={(event) => set("body", event.target.value)} placeholder={slug ? "What did you buy, and what did you love about it?" : "How was your visit? What did you find?"} aria-invalid={shown.body ? true : undefined} /><small className="form-hint">{values.body.trim().length} / 1,000</small>{fieldError("body")}</div>
    <div className="form-grid">
      <div className="form-field"><label htmlFor="review-name">First name * (only our team sees it)</label><input id="review-name" maxLength={40} autoComplete="given-name" value={values.reviewerName} onChange={(event) => set("reviewerName", event.target.value)} aria-invalid={shown.reviewerName ? true : undefined} />{fieldError("reviewerName")}</div>
      <div className="form-field"><label htmlFor="review-city">City (optional)</label><input id="review-city" maxLength={60} autoComplete="address-level2" placeholder="Gilroy" value={values.reviewerCity} onChange={(event) => set("reviewerCity", event.target.value)} /></div>
      <div className="form-field full"><label htmlFor="review-email">Email (optional, never shown)</label><input id="review-email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={(event) => set("email", event.target.value)} placeholder="So we can thank you or follow up" aria-invalid={shown.email ? true : undefined} />{fieldError("email")}</div>
    </div>
    <div className="review-photo-field">
      {values.photoUrl ? <div className="review-photo-chosen"><img src={values.photoUrl} alt="Your photo" /><button className="button-plain compact-button" type="button" onClick={() => set("photoUrl", "")}><X size={13} /> Remove photo</button></div>
        : <label className="button-plain compact-button upload-button">{uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Add a photo of your purchase (optional)<input type="file" accept="image/*,.heic,.heif" hidden disabled={uploading} onChange={(event) => { void addPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" type="submit" disabled={submit.isPending || uploading}>{submit.isPending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <>Send my review <ArrowRight size={15} /></>}</button>
    <p className="form-note"><Txt k="profile.reviews.guidelines" /></p>
  </form>;
}

/** The reviews section on a maker's page: average, approved reviews, and the review form. */
export function MakerReviews({ slug, makerName }: { slug: string; makerName: string }) {
  const data = trpc.reviews.forMaker.useQuery({ slug }, { staleTime: 60_000 });
  const [writing, setWriting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const list = data.data?.reviews ?? [];
  const summary = data.data?.summary;
  const visible = showAll ? list : list.slice(0, 6);
  return <section className="maker-reviews-section" id="reviews" aria-labelledby="reviews-title"><div className="site-container">
    <div className="maker-reviews-heading">
      <div><p className="eyebrow"><Txt k="profile.reviews.eyebrow" /></p><h2 className="display" id="reviews-title"><Txt k="profile.reviews.title" /></h2>
        {summary && summary.count > 0 && <p className="review-summary"><Stars value={summary.average} size={18} label={`Average ${summary.average} out of 5 stars`} /> <strong>{summary.average.toFixed(1)}</strong> from {summary.count} review{summary.count === 1 ? "" : "s"}</p>}
      </div>
      {!writing && <button className="button-primary" type="button" onClick={() => setWriting(true)}><PenLine size={15} /> <Txt k="profile.reviews.button" /></button>}
    </div>
    {writing && <ReviewForm slug={slug} makerName={makerName} onClose={() => setWriting(false)} />}
    {data.isLoading ? null : list.length ? <div className="review-grid">{visible.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : !writing && <p className="review-empty"><Txt k="profile.reviews.empty" vars={{ business: makerName }} /></p>}
    {list.length > 6 && !showAll && <button className="button-plain" type="button" onClick={() => setShowAll(true)}>Show all {list.length} reviews</button>}
  </div></section>;
}

/** "What shoppers say": the reviews the owners chose for the home page. */
export function FeaturedReviews() {
  const data = trpc.reviews.featured.useQuery(undefined, { staleTime: 5 * 60_000 });
  const list = data.data ?? [];
  if (!list.length) return null;
  return <section className="featured-reviews-section" aria-labelledby="home-reviews-title"><div className="site-container">
    <p className="eyebrow"><Txt k="home.reviews.eyebrow" /></p>
    <h2 className="display" id="home-reviews-title"><Txt k="home.reviews.title" /></h2>
    <div className="review-grid">{list.map((review) => <ReviewCard key={review.id} review={review} maker={{ name: review.makerName, slug: review.makerSlug }} />)}</div>
    <Link className="text-link featured-reviews-more" href="/reviews"><Txt k="home.reviews.link" /> <ArrowRight size={15} /></Link>
  </div></section>;
}

/** "Review us on Google", shown when the owners have added their Google review link. */
export function GoogleReviewInvite() {
  const data = trpc.reviews.googleLink.useQuery(undefined, { staleTime: 10 * 60_000 });
  if (!data.data?.url) return null;
  return <div className="google-review-invite"><Star size={18} /><div><strong><Txt k="contact.google.title" /></strong><p><Txt k="contact.google.body" /></p></div><a className="button-primary" href={data.data.url} target="_blank" rel="noopener noreferrer"><Txt k="contact.google.button" /> <ArrowRight size={14} /></a></div>;
}
