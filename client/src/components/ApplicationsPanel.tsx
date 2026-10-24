import { Archive, ExternalLink, Inbox, Loader2, Mail, RotateCcw, UserCheck, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import type { ApplicationStatus } from "@shared/application";
import { useEmailComposer } from "@/components/EmailComposer";

const FILTERS: Array<{ id: ApplicationStatus | "all"; label: string }> = [
  { id: "new", label: "New" },
  { id: "invited", label: "Invited" },
  { id: "declined", label: "Declined" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];
const STATUS_TEXT: Record<ApplicationStatus, string> = { new: "New", invited: "Invited to maker portal", declined: "Declined", archived: "Archived" };

const TEMPLATE = { invite: "makerWelcome", decline: "applicationDeclined", reply: "applicationReply" } as const;

/** Owner dashboard tab: maker applications submitted on /apply. */
export default function ApplicationsPanel() {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.applications.useQuery();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("new");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const compose = useEmailComposer();
  // Preview, then Send (see EmailComposer). Falls back to the owner's own email app.
  const email = (application: { id: number; fullName: string; email: string; businessName: string }, kind: keyof typeof TEMPLATE, note: string) => compose({ template: TEMPLATE[kind], to: application.email, about: `application:${application.id}`, values: { firstName: application.fullName.split(" ")[0] || "there", business: application.businessName, email: application.email, note } });
  const update = trpc.adminPortal.setApplicationStatus.useMutation({
    onSuccess: async (result, input) => {
      const application = list.data?.find((item) => item.id === input.id);
      if (application && input.status === "invited") { notifySuccess(`${application.businessName} invited`, { description: `${application.email} can now sign in to the maker portal${result.listingStarted ? ", and their listing is started from the application" : ""}. Next, check and send the welcome email.` }); email(application, "invite", input.note ?? ""); }
      else if (application && input.status === "declined") { notifySuccess("Marked as declined", { description: "Check the short email, then send it." }); email(application, "decline", input.note ?? ""); }
      else notifySuccess(input.status === "archived" ? "Application archived" : "Moved back to New");
      await Promise.all([utils.adminPortal.applications.invalidate(), utils.adminPortal.makerInvites.invalidate()]);
    },
    onError: (error) => notifyError(error, "Application not updated"),
  });

  const rows = list.data || [];
  const counts = Object.fromEntries(FILTERS.map((item) => [item.id, item.id === "all" ? rows.length : rows.filter((row) => row.status === item.id).length]));
  const shown = filter === "all" ? rows : rows.filter((row) => row.status === filter);

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Maker applications</p><h2>Applications</h2><p>Applications submitted on the site's "Become a vendor" page. Approve and invite gives them maker portal access and opens the welcome email to check and send.</p></div><a className="button-plain" href="/apply" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View the form</a></div>
    <div className="application-filters" role="tablist" aria-label="Filter applications">{FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label} <span>{counts[item.id]}</span></button>)}</div>
    <div className="secure-review-list">
      {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : list.error ? <div className="admin-empty"><h3>Applications did not load</h3><p>{list.error.message}</p></div> : shown.length ? shown.map((item) => <article className="secure-admin-card application-card" key={item.id}>
        <div className="secure-card-heading"><div><span className={`listing-status listing-status-${item.status === "new" ? "pending" : item.status === "invited" ? "published" : "muted"}`}>{STATUS_TEXT[item.status]}</span><h3>{item.businessName}</h3><p>{item.fullName} · received {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div></div>
        <p className="application-tagline">{item.tagline}</p>
        <dl className="application-details">
          <div><dt>Address</dt><dd>{item.address}</dd></div>
          <div><dt>Product</dt><dd>{item.productDescription}</dd></div>
          <div><dt>Categories</dt><dd>{item.categories.join(", ")}</dd></div>
          <div><dt>Sells at</dt><dd>{item.salesChannels.join(", ")}</dd></div>
          <div><dt>Email</dt><dd><a href={`mailto:${item.email}`}>{item.email}</a>{item.hasAccess ? " (has maker portal access)" : ""}</dd></div>
          <div><dt>Phone</dt><dd><a href={`tel:+1${item.phone.replace(/\D/g, "")}`}>{item.phone}</a></dd></div>
          <div><dt>Referred by</dt><dd>{item.referredBy}</dd></div>
          {item.otherSocial && <div><dt>Other social</dt><dd>{item.otherSocial}</dd></div>}
        </dl>
        <div className="review-socials">{[["Website", item.websiteUrl], ["Instagram", item.instagramUrl], ["Facebook", item.facebookUrl]].filter(([, url]) => url).map(([label, url]) => <a href={url!} target="_blank" rel="noreferrer" key={label}>{label} <ExternalLink size={12} /></a>)}</div>
        {item.adminNote && <p className="listing-note"><strong>Your note:</strong> {item.adminNote}</p>}
        <label>Note (optional, included in the email)<textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} placeholder="Anything you want to tell them" /></label>
        <div className="review-actions">
          {item.status !== "invited" && <button className="button-primary" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "invited", note: notes[item.id] || "" })}><UserCheck size={14} /> Approve and invite</button>}
          {item.status === "invited" && <button className="button-primary" type="button" onClick={() => email(item, "invite", notes[item.id] || "")}><Mail size={14} /> Send welcome email</button>}
          {item.status === "declined" && <button className="button-plain" type="button" onClick={() => email(item, "decline", notes[item.id] || "")}><Mail size={14} /> Send decline email</button>}
          <button className="button-plain" type="button" onClick={() => email(item, "reply", notes[item.id] || "")}><Mail size={14} /> Email them</button>
          {item.status === "new" && <button className="danger-button" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "declined", note: notes[item.id] || "" })}><X size={14} /> Decline</button>}
          {item.status !== "archived" && item.status !== "new" && <button className="button-plain" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "archived", note: item.adminNote || "" })}><Archive size={14} /> Archive</button>}
          {item.status !== "new" && <button className="button-plain" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "new", note: item.adminNote || "" })}><RotateCcw size={14} /> Move to New</button>}
        </div>
      </article>) : <div className="admin-empty"><Inbox size={20} /><h3>{filter === "new" ? "No new applications" : "Nothing here"}</h3><p>{filter === "new" ? "New maker applications will appear here. You also get an email for each one." : "Try another filter."}</p></div>}
    </div>
  </section>;
}
