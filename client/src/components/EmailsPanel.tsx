import { CheckCircle2, Loader2, Mail, RotateCcw, Save, TriangleAlert, Zap } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import type { EmailTemplateId } from "@shared/emailTemplates";

type Template = { id: EmailTemplateId; label: string; when: string; automatic: boolean; placeholders: string[]; subject: string; body: string; edited: boolean; original: { subject: string; body: string } };

const PLACEHOLDER_HELP: Record<string, string> = {
  firstName: "their first name", business: "the business name", email: "their sign in email", portalLink: "the maker portal link", listingLink: "their listing link",
  note: "your note (left out when empty)", company: "the company", quantity: "how many gifts", quote: "your quote (left out when empty)",
};

function TemplateEditor({ template, onSaved }: { template: Template; onSaved: () => Promise<unknown> }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const save = trpc.adminPortal.saveEmailTemplate.useMutation({ onSuccess: async () => { notifySuccess("Template saved", { description: "The next email of this kind uses it." }); await onSaved(); }, onError: (error) => notifyError(error, "Template not saved") });
  const reset = trpc.adminPortal.resetEmailTemplate.useMutation({ onSuccess: async () => { setSubject(template.original.subject); setBody(template.original.body); notifySuccess("Original wording restored"); await onSaved(); }, onError: (error) => notifyError(error, "Not restored") });
  const changed = subject !== template.subject || body !== template.body;
  return <details className="secure-admin-card email-template">
    <summary><span><strong>{template.label}</strong><small>{template.when}</small></span><span className="email-template-tags">{template.automatic && <span className="listing-status listing-status-published"><Zap size={11} /> Automatic</span>}{template.edited && <span className="listing-status listing-status-pending">Edited</span>}</span></summary>
    <label>Subject<input value={subject} maxLength={200} onChange={(event) => setSubject(event.target.value)} /></label>
    <label>Message<textarea rows={12} value={body} maxLength={6000} onChange={(event) => setBody(event.target.value)} /></label>
    <p className="form-hint">Filled in for each person: {template.placeholders.map((name) => <code key={name} title={PLACEHOLDER_HELP[name]}>{`{${name}}`}</code>)}. {template.placeholders.map((name) => `{${name}} is ${PLACEHOLDER_HELP[name]}`).join("; ")}.</p>
    <div className="review-actions">
      <button className="button-primary compact-button" type="button" disabled={!changed || save.isPending} onClick={() => save.mutate({ id: template.id, subject, body })}>{save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save template</button>
      {(template.edited || changed) && <button className="button-plain compact-button" type="button" disabled={reset.isPending} onClick={() => { if (window.confirm("Bring back the original wording for this email?")) reset.mutate({ id: template.id }); }}><RotateCcw size={13} /> Restore original</button>}
    </div>
  </details>;
}

/** Owner dashboard tab: email setup, the editable templates, and the sent log. */
export default function EmailsPanel() {
  const utils = trpc.useUtils();
  const setup = trpc.adminPortal.emailSetup.useQuery();
  const templates = trpc.adminPortal.emailTemplates.useQuery();
  const log = trpc.adminPortal.emailLog.useQuery();
  const ready = setup.data?.ready ?? false;
  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Emails we send</p><h2>Emails</h2><p>Invites, decisions, and replies start from these templates. Each time, a preview opens so you can check and change the message before clicking Send. Thank you emails to applicants and gift requests go out automatically.</p></div></div>
    <div className={`secure-admin-card email-setup ${ready ? "is-ready" : ""}`}>
      {setup.isLoading ? <Loader2 className="animate-spin" /> : ready
        ? <><CheckCircle2 size={20} /><div><strong>Sending is on</strong><p>From {setup.data?.from}. Replies go to {setup.data?.replyTo}. {setup.data?.sentToday} of {setup.data?.dailyLimit} emails sent in the last day (free plan).</p></div></>
        : <><TriangleAlert size={20} /><div><strong>Sending is not set up yet</strong><p>Until it is, the preview window offers Open in Gmail and Open in my email app, and automatic thank you emails are skipped. To turn it on: verify cannerymarket.com in Resend (three DNS records at GoDaddy), then add the Resend key in Cloudflare as the secret RESEND_API_KEY. The steps are in the hosting plan document.</p></div></>}
    </div>
    <h3 className="email-section-title">Templates</h3>
    {templates.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : <div className="secure-review-list">{(templates.data ?? []).map((template) => <TemplateEditor key={`${template.id}:${template.subject}:${template.body.length}`} template={template as Template} onSaved={() => utils.adminPortal.emailTemplates.invalidate()} />)}</div>}
    <h3 className="email-section-title">Recently sent</h3>
    {log.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : (log.data ?? []).length ? <div className="email-log">{(log.data ?? []).map((row) => <div key={row.id} className={row.status === "failed" ? "is-failed" : ""}>
      <Mail size={14} /><span><strong>{row.subject}</strong><small>To {row.to} · {new Date(row.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {row.sentBy === "website" ? "automatic" : `by ${row.sentBy}`}</small>{row.status === "failed" && <small className="form-error">Not sent: {row.error}</small>}</span>
    </div>)}</div> : <div className="admin-empty"><h3>No emails sent yet</h3><p>Emails you send from the portal will be listed here.</p></div>}
  </section>;
}
