import { ExternalLink, Loader2, Mail, Send } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { fillTemplate, templateDefault, type EmailTemplateId } from "@shared/emailTemplates";

export type EmailRequest = {
  template: EmailTemplateId;
  to: string;
  /** Values for the template's {placeholders}. */
  values: Record<string, string | number | null | undefined>;
  /** What the email is about, for the sent log, for example "application:12". */
  about?: string;
  /** Called after the email is sent. */
  onSent?: () => void;
};

type Draft = EmailRequest & { subject: string; body: string };
const ComposerContext = createContext<(request: EmailRequest) => void>(() => undefined);

/** Opens the Preview, then Send window from anywhere in the owner portal. */
export function useEmailComposer() { return useContext(ComposerContext); }

// Opens Gmail's compose window in the browser, signed in as the marketplace inbox when that account is open.
const GMAIL_ACCOUNT = "thecannerymarketplace@gmail.com";
const gmailLink = (draft: Draft) => `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(GMAIL_ACCOUNT)}&to=${encodeURIComponent(draft.to)}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
const mailto = (draft: Draft) => `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;

/** Shared values every template can use. */
export function commonEmailValues() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cannerymarket.com";
  return { portalLink: `${origin}/maker-portal`, siteLink: origin };
}

/**
 * Preview, then Send: fills the template, lets the owner edit it, and sends it from the
 * marketplace address. Replies go to the marketplace inbox.
 */
export function EmailComposerProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const setup = trpc.adminPortal.emailSetup.useQuery(undefined, { staleTime: 60_000 });
  const send = trpc.adminPortal.sendEmail.useMutation();

  async function open(request: EmailRequest) {
    setLoading(true);
    try {
      const templates = await utils.adminPortal.emailTemplates.fetch();
      const template = templates.find((item) => item.id === request.template) ?? templateDefault(request.template);
      const values = { ...commonEmailValues(), ...request.values };
      setDraft({ ...request, subject: fillTemplate(template.subject, values), body: fillTemplate(template.body, values) });
    } catch (error) {
      notifyError(error, "Email preview did not open");
    } finally {
      setLoading(false);
    }
  }

  async function sendNow() {
    if (!draft) return;
    try {
      await send.mutateAsync({ template: draft.template, to: draft.to, subject: draft.subject, body: draft.body, about: draft.about ?? "" });
      notifySuccess(`Email sent to ${draft.to}`, { description: "Replies come to the marketplace inbox." });
      draft.onSent?.();
      setDraft(null);
      await Promise.all([utils.adminPortal.emailSetup.invalidate(), utils.adminPortal.emailLog.invalidate()]);
    } catch (error) {
      notifyError(error, "Email not sent");
    }
  }

  const ready = setup.data?.ready ?? false;
  const label = draft ? templateDefault(draft.template).label : "";
  return <ComposerContext.Provider value={(request) => { void open(request); }}>
    {children}
    {loading && <div className="email-loading" role="status"><Loader2 size={16} className="animate-spin" /> Preparing the email…</div>}
    <Dialog open={draft !== null} onOpenChange={(isOpen) => { if (!isOpen) setDraft(null); }}>
      <DialogContent className="email-composer">
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Mail size={18} /> {label}</DialogTitle>
          <DialogDescription>Check the message and change anything you like. {ready ? `It is sent from ${setup.data?.from}, and replies go to ${setup.data?.replyTo || "the marketplace inbox"}.` : "Sending from the site is not set up yet, so use Open in Gmail or Open in my email app."}</DialogDescription>
        </DialogHeader>
        {draft && <div className="email-composer-fields">
          <label>To<input type="email" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
          <label>Subject<input value={draft.subject} maxLength={200} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>
          <label>Message<textarea rows={14} value={draft.body} maxLength={8000} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
          {ready && setup.data && <small className="form-hint">{setup.data.sentToday} of {setup.data.dailyLimit} emails sent in the last day.</small>}
        </div>}
        <DialogFooter className="email-composer-actions">
          {draft && <a className="button-plain" href={gmailLink(draft)} target="_blank" rel="noopener noreferrer" onClick={() => { draft.onSent?.(); setDraft(null); }}><ExternalLink size={14} /> Open in Gmail</a>}
          {draft && <a className="button-plain" href={mailto(draft)} onClick={() => { draft.onSent?.(); setDraft(null); }}><Mail size={14} /> Open in my email app</a>}
          <button className="button-primary" type="button" disabled={!ready || send.isPending || !draft?.to || !draft?.subject.trim() || !draft?.body.trim()} onClick={() => void sendNow()}>{send.isPending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </ComposerContext.Provider>;
}
