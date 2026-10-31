import { ArrowRight, Building2, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GiftsUnavailable } from "@/pages/Gifts";
import { readableError } from "@/lib/notify";
import { Txt, useOwnerPreview } from "@/lib/siteText";
import { trpc } from "@/lib/trpc";
import { BRANDING_OPTIONS, DELIVERY_METHODS, EMPTY_GIFT_REQUEST, GIFT_BUDGETS, GIFT_CATEGORIES, GIFT_REQUEST_FIELD_ORDER, giftRequestProblems, type GiftRequestField, type GiftRequestValues } from "@shared/gifts";
import { ADMIN_URL } from "@shared/site";

// Same free inbox alert as the contact form and maker application.
const NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/thecannerymarketplace@gmail.com";
type Result = { kind: "success"; name: string } | { kind: "error"; message: string } | null;
const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); };

function GiftRequestForm({ ownerPreview }: { ownerPreview: boolean }) {
  const [values, setValues] = useState<GiftRequestValues>(EMPTY_GIFT_REQUEST);
  const [showProblems, setShowProblems] = useState(false);
  const [honey, setHoney] = useState("");
  const [result, setResult] = useState<Result>(null);
  const publicChoices = trpc.gifts.boxChoices.useQuery(undefined, { enabled: !ownerPreview });
  const ownerBoxes = trpc.adminPortal.giftBoxes.useQuery(undefined, { enabled: ownerPreview });
  const choices = ownerPreview ? (ownerBoxes.data?.boxes ?? []).filter((box) => box.active) : publicChoices.data ?? [];
  const submit = trpc.gifts.requestQuote.useMutation();
  const problems = giftRequestProblems(values);
  const shown = showProblems ? problems : {};
  const set = <K extends GiftRequestField>(key: K, next: GiftRequestValues[K]) => setValues((current) => ({ ...current, [key]: next }));
  const toggle = (key: "branding" | "preferredCategories", item: string) => setValues((current) => {
    let next = current[key].includes(item) ? current[key].filter((value) => value !== item) : [...current[key], item];
    // "No branding needed" and the branding choices cancel each other out.
    if (key === "branding") next = item === "No branding needed" ? (next.includes(item) ? [item] : next) : next.filter((value) => value !== "No branding needed");
    return { ...current, [key]: next };
  });
  const invalid = (field: GiftRequestField) => (shown[field] ? { "aria-invalid": true as const, "aria-describedby": `gift-${field}-error` } : {});
  const error = (field: GiftRequestField) => shown[field] ? <span className="form-error" id={`gift-${field}-error`} role="alert">{shown[field]}</span> : null;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (GIFT_REQUEST_FIELD_ORDER.some((field) => problems[field])) {
      setShowProblems(true);
      window.setTimeout(() => document.querySelector<HTMLElement>(".gift-request-form [aria-invalid='true'], .gift-request-form .form-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    try {
      await submit.mutateAsync({ ...values, website2: honey });
      void fetch(NOTIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New corporate gift request: ${values.company.trim()} (${values.quantity} gifts)`,
          _template: "table",
          _replyto: values.email.trim(),
          Company: values.company.trim(), Contact: values.contactName.trim(), Email: values.email.trim(), Phone: values.phone.trim() || "Not given",
          Quantity: values.quantity, "Budget per gift": values.budgetPerGift, "Needed by": values.neededBy || "Flexible", Delivery: values.deliveryMethod,
          "Custom box": values.customBox ? "Yes" : "No", Branding: values.branding.join(", "),
          "Review it": ADMIN_URL,
        }),
      }).catch(() => undefined);
      setResult({ kind: "success", name: values.contactName.trim().split(" ")[0] });
      setValues(EMPTY_GIFT_REQUEST); setShowProblems(false);
    } catch (failure) {
      setResult({ kind: "error", message: readableError(failure, "We could not send your request. Please try again, or email thecannerymarketplace@gmail.com.") });
    }
  }

  return <>
    <form className="contact-form quote-form application-form gift-request-form" onSubmit={send} noValidate>
      <h2><Txt k="corporate.form.title" /></h2>
      <p><Txt k="corporate.form.body" /> Fields marked with an asterisk are required.</p>
      <input type="text" name="website2" value={honey} onChange={(event) => setHoney(event.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <fieldset className="application-section"><legend>About you</legend><div className="form-grid">
        <div className="form-field full"><label htmlFor="gift-company">Company or organization *</label><input id="gift-company" maxLength={140} autoComplete="organization" value={values.company} onChange={(event) => set("company", event.target.value)} {...invalid("company")} />{error("company")}</div>
        <div className="form-field"><label htmlFor="gift-contactName">Your name *</label><input id="gift-contactName" maxLength={120} autoComplete="name" value={values.contactName} onChange={(event) => set("contactName", event.target.value)} {...invalid("contactName")} />{error("contactName")}</div>
        <div className="form-field"><label htmlFor="gift-email">Email *</label><input id="gift-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={values.email} onChange={(event) => set("email", event.target.value)} {...invalid("email")} />{error("email")}</div>
        <div className="form-field"><label htmlFor="gift-phone">Phone (optional)</label><input id="gift-phone" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="(408) 555-1234" value={values.phone} onChange={(event) => set("phone", event.target.value)} {...invalid("phone")} />{error("phone")}</div>
      </div></fieldset>

      <fieldset className="application-section"><legend>The order</legend><div className="form-grid">
        <div className="form-field"><label htmlFor="gift-quantity">How many gifts? *</label><input id="gift-quantity" inputMode="numeric" maxLength={6} placeholder="25" value={values.quantity} onChange={(event) => set("quantity", event.target.value.replace(/\D/g, "").slice(0, 6))} {...invalid("quantity")} />{error("quantity")}</div>
        <div className="form-field"><label htmlFor="gift-budget">Budget per gift *</label><select id="gift-budget" value={values.budgetPerGift} onChange={(event) => set("budgetPerGift", event.target.value)} {...invalid("budgetPerGift")}><option value="">Choose a range</option>{GIFT_BUDGETS.map((item) => <option key={item}>{item}</option>)}</select>{error("budgetPerGift")}</div>
        <div className="form-field"><label htmlFor="gift-neededBy">Needed by (optional)</label><input id="gift-neededBy" type="date" min={tomorrow()} value={values.neededBy} onChange={(event) => set("neededBy", event.target.value)} {...invalid("neededBy")} />{error("neededBy")}</div>
        <div className="form-field"><label htmlFor="gift-delivery">How should they arrive? *</label><select id="gift-delivery" value={values.deliveryMethod} onChange={(event) => set("deliveryMethod", event.target.value)} {...invalid("deliveryMethod")}><option value="">Choose one</option>{DELIVERY_METHODS.map((item) => <option key={item}>{item}</option>)}</select>{error("deliveryMethod")}</div>
        {(values.deliveryMethod === "Shipping" || values.deliveryMethod === "Local delivery in Gilroy") && <div className="form-field full"><label htmlFor="gift-destinations">Where are they going?{values.deliveryMethod === "Shipping" ? " *" : ""}</label><input id="gift-destinations" maxLength={400} placeholder="One office in San Jose, or 40 home addresses across California" value={values.destinations} onChange={(event) => set("destinations", event.target.value)} {...invalid("destinations")} />{error("destinations")}</div>}
        <div className="form-field full"><label htmlFor="gift-startingBox">Start from one of our boxes (optional)</label><select id="gift-startingBox" value={values.startingBox} onChange={(event) => set("startingBox", event.target.value)}><option value="">No preference</option>{choices.map((box) => <option key={box.slug} value={box.name}>{box.name} ({box.price})</option>)}</select></div>
      </div></fieldset>

      <fieldset className="application-section"><legend>Build a custom box</legend>
        <label className="choice"><input type="checkbox" checked={values.customBox} onChange={(event) => set("customBox", event.target.checked)} /> Yes, I would like a custom box made from your makers' goods</label>
        {values.customBox && <>
          <p className="form-hint">What kinds of goods would you like included? Select all that apply.</p>
          <div className="choice-grid" {...invalid("preferredCategories")}>{GIFT_CATEGORIES.map((item) => <label className="choice" key={item}><input type="checkbox" checked={values.preferredCategories.includes(item)} onChange={() => toggle("preferredCategories", item)} /> {item}</label>)}</div>
          <div className="form-field"><label htmlFor="gift-preferredMakers">Makers you would love to include (optional)</label><input id="gift-preferredMakers" maxLength={400} placeholder="Names from our maker directory" value={values.preferredMakers} onChange={(event) => set("preferredMakers", event.target.value)} /></div>
          {error("preferredCategories")}
        </>}
      </fieldset>

      <fieldset className="application-section" aria-describedby={shown.branding ? "gift-branding-error" : undefined}><legend>Branding *</legend>
        <div className="choice-grid">{BRANDING_OPTIONS.map((item) => <label className="choice" key={item}><input type="checkbox" checked={values.branding.includes(item)} onChange={() => toggle("branding", item)} /> {item}</label>)}</div>
        {error("branding")}
        {values.branding.includes("Company logo on the box or tag") && <div className="form-field"><label htmlFor="gift-logoLink">Link to your logo (optional)</label><input id="gift-logoLink" inputMode="url" maxLength={500} placeholder="https://… or email it to us later" value={values.logoLink} onChange={(event) => set("logoLink", event.target.value)} {...invalid("logoLink")} />{error("logoLink")}</div>}
        {values.branding.includes("Custom card message") && <div className="form-field"><label htmlFor="gift-cardMessage">Card message (optional, you can send it later)</label><textarea id="gift-cardMessage" rows={3} maxLength={500} value={values.cardMessage} onChange={(event) => set("cardMessage", event.target.value)} {...invalid("cardMessage")} />{error("cardMessage")}</div>}
      </fieldset>

      <div className="form-field full"><label htmlFor="gift-message">Tell us about the occasion *</label><textarea id="gift-message" maxLength={2000} value={values.message} onChange={(event) => set("message", event.target.value)} placeholder="Client holiday gifts, a team thank you, an event, or anything else we should know." {...invalid("message")} />{error("message")}</div>

      {showProblems && Object.keys(problems).length > 0 && <p className="form-error application-summary" role="alert">Please fix the {Object.keys(problems).length === 1 ? "item" : `${Object.keys(problems).length} items`} marked above.</p>}
      <button className="button-primary" type="submit" disabled={submit.isPending}>{submit.isPending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <>Send quote request <ArrowRight size={15} /></>}</button>
      <p className="form-note"><Txt k="corporate.form.note" /></p>
    </form>

    <Dialog open={result !== null} onOpenChange={(open) => { if (!open) setResult(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>{result?.kind === "success" ? <><CheckCircle2 size={20} color="var(--gold)" /> Thank you{result.name ? `, ${result.name}` : ""}</> : <><TriangleAlert size={20} /> Request not sent</>}</DialogTitle>
          <DialogDescription>{result?.kind === "success" ? "We received your request and will reply by email with ideas, timing, and pricing." : result?.kind === "error" ? result.message : ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter>{result?.kind === "success" ? <Link className="button-primary" href="/vendors" onClick={() => setResult(null)}>Meet our makers</Link> : <button className="button-primary" type="button" onClick={() => setResult(null)}>Close</button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export default function RequestQuote() {
  const ownerPreview = useOwnerPreview();
  const settings = trpc.settings.public.useQuery();
  if (!ownerPreview && settings.isLoading) return <SiteShell><main className="route-loading"><Loader2 className="animate-spin" /></main></SiteShell>;
  if (!ownerPreview && settings.data?.giftBoxesEnabled !== true) return <GiftsUnavailable path="/request-a-quote" />;
  return (
    <SiteShell>
      <PageMeta canonicalPath="/request-a-quote" noIndex title="Request a corporate order quote" description="Request custom pricing for corporate, custom, and bulk gift orders from The Cannery Marketplace." />
      <main>
        <section className="page-hero quote-hero"><div className="site-container page-hero-content"><p className="eyebrow"><Txt k="corporate.hero.eyebrow" /></p><h1 className="display"><Txt k="corporate.hero.title" /></h1><p><Txt k="corporate.hero.body" /></p></div></section>
        <section className="quote-section"><div className="site-container quote-grid">
          <div className="quote-intro"><div className="quote-icon"><Building2 size={22} /></div><p className="eyebrow"><Txt k="corporate.intro.eyebrow" /></p><h2 className="display"><Txt k="corporate.intro.title" /></h2><p className="body-large"><Txt k="corporate.intro.body" /></p><div className="quote-points"><p><Txt k="corporate.intro.listTitle" /></p><ul>{[1, 2, 3, 4].map((n) => <li key={n}><Txt k={`corporate.intro.item${n}`} /></li>)}</ul></div></div>
          <GiftRequestForm ownerPreview={ownerPreview} />
        </div></section>
      </main>
    </SiteShell>
  );
}
