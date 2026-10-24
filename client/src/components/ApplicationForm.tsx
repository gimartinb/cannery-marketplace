import { ArrowRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatLocalNumber } from "@/components/ContactForm";
import { readableError } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { APPLICATION_CATEGORIES, APPLICATION_FIELD_ORDER, applicationProblems, EMPTY_APPLICATION, formatApplicationPhone, SALES_CHANNELS, type ApplicationField, type ApplicationValues } from "@shared/application";

// Each application also goes to the marketplace inbox through FormSubmit (free,
// already used by the contact form), so Nancy hears about it right away.
const NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/thecannerymarketplace@gmail.com";

type Result = { kind: "success"; name: string } | { kind: "error"; message: string } | null;
const digitsOnly = (value: string) => value.replace(/\D/g, "");

export default function ApplicationForm() {
  const [values, setValues] = useState<ApplicationValues>(EMPTY_APPLICATION);
  const [showProblems, setShowProblems] = useState(false);
  const [honey, setHoney] = useState("");
  const [result, setResult] = useState<Result>(null);
  const submit = trpc.applications.submit.useMutation();
  const problems = applicationProblems(values);
  const shown = showProblems ? problems : {};
  const set = <K extends keyof ApplicationValues>(key: K, next: ApplicationValues[K]) => setValues((current) => ({ ...current, [key]: next }));
  const toggle = (key: "categories" | "salesChannels", item: string) => setValues((current) => ({ ...current, [key]: current[key].includes(item) ? current[key].filter((value) => value !== item) : [...current[key], item] }));

  const invalid = (field: ApplicationField) => (shown[field] ? { "aria-invalid": true as const, "aria-describedby": `apply-${field}-error` } : {});
  const error = (field: ApplicationField) => shown[field] ? <span className="form-error" id={`apply-${field}-error`} role="alert">{shown[field]}</span> : null;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const open = APPLICATION_FIELD_ORDER.filter((field) => problems[field]);
    if (open.length) {
      setShowProblems(true);
      window.setTimeout(() => document.querySelector<HTMLElement>(".application-form [aria-invalid='true'], .application-form .form-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    try {
      await submit.mutateAsync({ ...values, website2: honey });
      // Best effort: the application is already saved, so a failed email does not block the applicant.
      void fetch(NOTIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New maker application: ${values.businessName.trim()}`,
          _template: "table",
          _replyto: values.email.trim(),
          Business: values.businessName.trim(),
          Address: values.address.trim(),
          "Full name": values.fullName.trim(),
          Email: values.email.trim(),
          Phone: formatApplicationPhone(values),
          "In one sentence": values.tagline.trim(),
          Categories: values.categories.map((item) => (item === "Other" ? `Other: ${values.categoryOther.trim()}` : item)).join(", "),
          "Review it": `${window.location.origin}/admin`,
        }),
      }).catch(() => undefined);
      setResult({ kind: "success", name: values.fullName.trim().split(" ")[0] });
      setValues(EMPTY_APPLICATION);
      setShowProblems(false);
    } catch (failure) {
      setResult({ kind: "error", message: readableError(failure, "We could not send your application. Please try again, or email thecannerymarketplace@gmail.com.") });
    }
  }

  return <>
    <form className="contact-form application-form" onSubmit={send} noValidate>
      <h2>The Cannery Marketplace Maker Application</h2>
      <p>Fields marked with an asterisk are required. It takes about five minutes.</p>
      <input type="text" name="website2" value={honey} onChange={(event) => setHoney(event.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <fieldset className="application-section"><legend>About your business</legend>
        <div className="form-grid">
          <div className="form-field full"><label htmlFor="apply-businessName">Name of your business *</label><input id="apply-businessName" maxLength={140} autoComplete="organization" value={values.businessName} onChange={(event) => set("businessName", event.target.value)} {...invalid("businessName")} />{error("businessName")}</div>
          <div className="form-field full"><label htmlFor="apply-address">Address *</label><input id="apply-address" maxLength={200} autoComplete="street-address" placeholder="Street, city, state, ZIP" value={values.address} onChange={(event) => set("address", event.target.value)} {...invalid("address")} />{error("address")}</div>
          <div className="form-field full"><label htmlFor="apply-websiteUrl">Website (optional)</label><input id="apply-websiteUrl" inputMode="url" placeholder="yourshop.com" value={values.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} {...invalid("websiteUrl")} />{error("websiteUrl")}</div>
          <p className="form-hint full">Social media is optional. Type your @handle or paste the full link.</p>
          <div className="form-field"><label htmlFor="apply-instagramUrl">Instagram</label><input id="apply-instagramUrl" placeholder="@yourshop" value={values.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} {...invalid("instagramUrl")} />{error("instagramUrl")}</div>
          <div className="form-field"><label htmlFor="apply-facebookUrl">Facebook</label><input id="apply-facebookUrl" placeholder="@yourshop" value={values.facebookUrl} onChange={(event) => set("facebookUrl", event.target.value)} {...invalid("facebookUrl")} />{error("facebookUrl")}</div>
          <div className="form-field full"><label htmlFor="apply-otherSocial">Other social media platform(s)</label><input id="apply-otherSocial" maxLength={300} placeholder="TikTok, Pinterest, or a link" value={values.otherSocial} onChange={(event) => set("otherSocial", event.target.value)} {...invalid("otherSocial")} />{error("otherSocial")}</div>
          <div className="form-field full"><label htmlFor="apply-tagline">Describe your business in one short sentence *</label><input id="apply-tagline" maxLength={160} value={values.tagline} onChange={(event) => set("tagline", event.target.value)} {...invalid("tagline")} /><small className="form-hint">{values.tagline.trim().length} / 160</small>{error("tagline")}</div>
          <div className="form-field full"><label htmlFor="apply-productDescription">Describe your product *</label><textarea id="apply-productDescription" maxLength={1500} value={values.productDescription} onChange={(event) => set("productDescription", event.target.value)} placeholder="What you make, the materials you use, and your price range." {...invalid("productDescription")} /><small className="form-hint">{values.productDescription.trim().length} / 1,500</small>{error("productDescription")}</div>
        </div>
      </fieldset>

      <fieldset className="application-section"><legend>About you</legend>
        <div className="form-grid">
          <div className="form-field full"><label htmlFor="apply-fullName">Full name *</label><input id="apply-fullName" maxLength={100} autoComplete="name" value={values.fullName} onChange={(event) => set("fullName", event.target.value)} {...invalid("fullName")} />{error("fullName")}</div>
          <div className="form-field full"><label htmlFor="apply-email">Email *</label><input id="apply-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={values.email} onChange={(event) => set("email", event.target.value)} {...invalid("email")} />{error("email")}</div>
          <fieldset className="form-field full phone-fieldset"><legend>Phone * (US numbers)</legend>
            <div className="phone-parts">
              <div className="phone-part phone-country"><label htmlFor="apply-country">Country</label><select id="apply-country" value="US" disabled><option value="US">United States +1</option></select></div>
              <div className="phone-part phone-area"><label htmlFor="apply-areaCode">Area code</label><input id="apply-areaCode" inputMode="numeric" autoComplete="tel-area-code" placeholder="408" maxLength={3} value={values.areaCode} onChange={(event) => set("areaCode", digitsOnly(event.target.value).slice(0, 3))} {...invalid(shown.phone ? "phone" : "areaCode")} /></div>
              <div className="phone-part phone-local"><label htmlFor="apply-localNumber">Number</label><input id="apply-localNumber" inputMode="numeric" autoComplete="tel-local" placeholder="555-1234" maxLength={8} value={values.localNumber} onChange={(event) => set("localNumber", formatLocalNumber(event.target.value))} {...invalid(shown.phone ? "phone" : "localNumber")} /></div>
            </div>
            {error("phone")}{error("areaCode")}{error("localNumber")}
          </fieldset>
          <div className="form-field full"><label htmlFor="apply-referredBy">Referred by, or how you found us *</label><input id="apply-referredBy" maxLength={200} placeholder="A friend, Instagram, or the QR code in the store" value={values.referredBy} onChange={(event) => set("referredBy", event.target.value)} {...invalid("referredBy")} />{error("referredBy")}</div>
        </div>
      </fieldset>

      <fieldset className="application-section" aria-describedby={shown.categories ? "apply-categories-error" : undefined}><legend>What category of product do you best fit under? Select all that apply. *</legend>
        <div className="choice-grid">{APPLICATION_CATEGORIES.map((item) => <label className="choice" key={item}><input type="checkbox" checked={values.categories.includes(item)} onChange={() => toggle("categories", item)} /> {item}</label>)}</div>
        {values.categories.includes("Other") && <div className="form-field"><label htmlFor="apply-categoryOther">Your other category *</label><input id="apply-categoryOther" maxLength={80} value={values.categoryOther} onChange={(event) => set("categoryOther", event.target.value)} {...invalid("categoryOther")} />{error("categoryOther")}</div>}
        {error("categories")}
      </fieldset>

      <fieldset className="application-section" aria-describedby={shown.salesChannels ? "apply-salesChannels-error" : undefined}><legend>Where do you currently sell your products? Select all that apply. *</legend>
        <div className="choice-grid">{SALES_CHANNELS.map((item) => <label className="choice" key={item}><input type="checkbox" checked={values.salesChannels.includes(item)} onChange={() => toggle("salesChannels", item)} /> {item}</label>)}</div>
        {values.salesChannels.includes("Other") && <div className="form-field"><label htmlFor="apply-salesOther">Where else do you sell? *</label><input id="apply-salesOther" maxLength={120} value={values.salesOther} onChange={(event) => set("salesOther", event.target.value)} {...invalid("salesOther")} />{error("salesOther")}</div>}
        {error("salesChannels")}
      </fieldset>

      {showProblems && Object.keys(problems).length > 0 && <p className="form-error application-summary" role="alert">Please fix the {Object.keys(problems).length === 1 ? "item" : `${Object.keys(problems).length} items`} marked above.</p>}
      <button className="button-primary" type="submit" disabled={submit.isPending}>{submit.isPending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <>Send my application <ArrowRight size={15} /></>}</button>
      <p className="form-note">Completing the application does not guarantee a space in the marketplace. Our team reviews every application and will contact you if your work is a good fit. Please do not include payment information.</p>
    </form>

    <Dialog open={result !== null} onOpenChange={(open) => { if (!open) setResult(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>{result?.kind === "success" ? <><CheckCircle2 size={20} color="var(--gold)" /> Thank you{result.name ? `, ${result.name}` : ""}</> : <><TriangleAlert size={20} /> Form not sent</>}</DialogTitle>
          <DialogDescription>{result?.kind === "success" ? "We received your maker application. Our team reviews every submission and will contact you by email if your work is a good fit for our shelves." : result?.kind === "error" ? result.message : ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter>{result?.kind === "success" ? <Link className="button-primary" href="/vendors" onClick={() => setResult(null)}>Meet our makers</Link> : <button className="button-primary" type="button" onClick={() => setResult(null)}>Close</button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
