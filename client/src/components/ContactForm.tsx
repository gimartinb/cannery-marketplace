import { ArrowRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// FormSubmit (free) emails each message to the marketplace inbox. The /ajax/
// endpoint answers with JSON, so the visitor stays on the page.
const FORM_ENDPOINT = "https://formsubmit.co/ajax/thecannerymarketplace@gmail.com";

export type ContactValues = { fullName: string; email: string; areaCode: string; localNumber: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactValues | "phone", string>>;

const EMPTY: ContactValues = { fullName: "", email: "", areaCode: "", localNumber: "", message: "" };
const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** Formats the 7 digit local number as 555-1234 while typing. */
export function formatLocalNumber(value: string) {
  const digits = digitsOnly(value).slice(0, 7);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

/** Validation shared by the form and its tests. Phone is optional, but if started it must be a full US number. */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.fullName.trim().replace(/\s+/g, " ");
  if (!name) errors.fullName = "Please enter your full name.";
  else if (name.split(" ").length < 2) errors.fullName = "Please enter your first and last name.";
  else if (!/^[\p{L}][\p{L}' .-]*[\p{L}.]$/u.test(name)) errors.fullName = "Use letters, spaces, apostrophes, periods, or hyphens.";
  else if (name.length > 100) errors.fullName = "Please keep your name under 100 characters.";

  const email = values.email.trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) || /\.\./.test(email)) errors.email = "Please enter a valid email address, like name@example.com.";

  const area = digitsOnly(values.areaCode);
  const local = digitsOnly(values.localNumber);
  if (area || local) {
    // US numbers: the area code and the first digit of the local number cannot start with 0 or 1.
    if (!/^[2-9]\d{2}$/.test(area)) errors.areaCode = "Enter a 3 digit area code (it cannot start with 0 or 1).";
    if (!/^[2-9]\d{6}$/.test(local)) errors.localNumber = "Enter the 7 digit number (it cannot start with 0 or 1).";
  }

  const message = values.message.trim();
  if (!message) errors.message = "Please tell us how we can help.";
  else if (message.length < 10) errors.message = "Please add a little more detail (at least 10 characters).";
  else if (message.length > 2000) errors.message = "Please keep your message under 2,000 characters.";
  return errors;
}

export function formatPhone(values: ContactValues) {
  const area = digitsOnly(values.areaCode);
  const local = digitsOnly(values.localNumber);
  return area && local ? `+1 (${area}) ${local.slice(0, 3)}-${local.slice(3)}` : "";
}

type Result = { kind: "success" } | { kind: "error"; message: string } | null;

export default function ContactForm() {
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof ContactValues, boolean>>>({});
  const [honey, setHoney] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const errors = validateContact(values);
  const show = (field: keyof ContactValues) => (touched[field] ? errors[field] : undefined);
  const set = (field: keyof ContactValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const blur = (field: keyof ContactValues) => setTouched((current) => ({ ...current, [field]: true }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ fullName: true, email: true, areaCode: true, localNumber: true, message: true });
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    if (honey) { setResult({ kind: "success" }); return; } // Bots fill the hidden field; quietly ignore them.
    setSending(true);
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: values.fullName.trim().replace(/\s+/g, " "),
          email: values.email.trim(),
          phone: formatPhone(values) || "Not provided",
          message: values.message.trim(),
          _subject: "New Cannery Marketplace website inquiry",
          _template: "table",
          _replyto: values.email.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
      if (response.ok && String(body.success) === "true") {
        setResult({ kind: "success" });
        setValues(EMPTY);
        setTouched({});
      } else {
        setResult({ kind: "error", message: body.message || "We could not send your message. Please try again, or email us directly." });
      }
    } catch {
      setResult({ kind: "error", message: "We could not reach the server. Please check your connection and try again, or email us directly." });
    } finally {
      setSending(false);
    }
  }

  const field = (name: keyof ContactValues) => ({
    id: `contact-${name}`,
    value: values[name],
    onBlur: () => blur(name),
    "aria-invalid": show(name) ? ("true" as const) : ("false" as const),
    "aria-describedby": show(name) ? `contact-${name}-error` : undefined,
  });
  const errorText = (name: keyof ContactValues) => show(name) && <span className="form-error" id={`contact-${name}-error`} role="alert">{show(name)}</span>;

  return <>
    <form className="contact-form" onSubmit={submit} noValidate>
      <h2>Send a message</h2>
      <p>Fields marked with an asterisk are required.</p>
      <input type="text" name="_honey" value={honey} onChange={(event) => setHoney(event.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="form-grid">
        <div className="form-field full"><label htmlFor="contact-fullName">Full name *</label><input {...field("fullName")} autoComplete="name" maxLength={100} onChange={(event) => set("fullName", event.target.value)} />{errorText("fullName")}</div>
        <div className="form-field full"><label htmlFor="contact-email">Email *</label><input {...field("email")} type="email" inputMode="email" autoComplete="email" maxLength={254} onChange={(event) => set("email", event.target.value)} />{errorText("email")}</div>
        <fieldset className="form-field full phone-fieldset">
          <legend>Phone (optional, US numbers)</legend>
          <div className="phone-parts">
            <div className="phone-part phone-country"><label htmlFor="contact-country">Country</label><select id="contact-country" value="US" disabled aria-describedby="contact-country-note"><option value="US">United States +1</option></select></div>
            <div className="phone-part phone-area"><label htmlFor="contact-areaCode">Area code</label><input {...field("areaCode")} inputMode="numeric" autoComplete="tel-area-code" placeholder="408" maxLength={3} onChange={(event) => set("areaCode", digitsOnly(event.target.value).slice(0, 3))} /></div>
            <div className="phone-part phone-local"><label htmlFor="contact-localNumber">Number</label><input {...field("localNumber")} inputMode="numeric" autoComplete="tel-local" placeholder="555-1234" maxLength={8} onChange={(event) => set("localNumber", formatLocalNumber(event.target.value))} /></div>
          </div>
          <small id="contact-country-note" className="form-hint">We currently accept US phone numbers only.</small>
          {errorText("areaCode")}{errorText("localNumber")}
        </fieldset>
        <div className="form-field full"><label htmlFor="contact-message">How can we help? *</label><textarea {...field("message")} maxLength={2000} onChange={(event) => set("message", event.target.value)} /><small className="form-hint">{values.message.trim().length} / 2,000</small>{errorText("message")}</div>
      </div>
      <button className="button-primary" type="submit" disabled={sending}>{sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <>Send inquiry <ArrowRight size={15} /></>}</button>
      <p className="form-note">This form delivers inquiries to the marketplace email address. Please do not include sensitive personal or payment information.</p>
    </form>

    <Dialog open={result !== null} onOpenChange={(open) => { if (!open) setResult(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>{result?.kind === "success" ? <><CheckCircle2 size={20} color="var(--gold)" /> Message sent</> : <><TriangleAlert size={20} /> Message not sent</>}</DialogTitle>
          <DialogDescription>{result?.kind === "success" ? "Thank you for reaching out to The Cannery Marketplace. We received your message and will reply by email soon." : result?.kind === "error" ? result.message : ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter><button className="button-primary" type="button" onClick={() => setResult(null)}>Close</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
