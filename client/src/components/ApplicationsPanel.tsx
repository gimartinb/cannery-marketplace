import { Archive, ExternalLink, Inbox, Loader2, Mail, RotateCcw, UserCheck, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import type { ApplicationStatus } from "@shared/application";

const FILTERS: Array<{ id: ApplicationStatus | "all"; label: string }> = [
  { id: "new", label: "New" },
  { id: "invited", label: "Invited" },
  { id: "declined", label: "Declined" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];
const STATUS_TEXT: Record<ApplicationStatus, string> = { new: "New", invited: "Invited to maker portal", declined: "Declined", archived: "Archived" };

/** A prefilled email from the owner's own email app, so replies come back to the marketplace inbox. */
function emailLink(application: { fullName: string; email: string; businessName: string }, kind: "invite" | "decline" | "reply", note: string) {
  const first = application.fullName.split(" ")[0] || "there";
  const portal = `${window.location.origin}/maker-portal`;
  const subject = kind === "invite" ? `Welcome to The Cannery Marketplace, ${application.businessName}` : `Your vendor interest form: ${application.businessName}`;
  const body = kind === "invite"
    ? `Hi ${first},\n\nThank you for your interest in The Cannery Marketplace. We would love to have ${application.businessName} on our shelves.\n\n${note ? `${note}\n\n` : ""}Next step: create your maker listing at ${portal}\nSign in with this email address (${application.email}). We will email you a one time code, so there is no password to remember. Every listing is reviewed before it goes live, which can take up to 72 hours.\n\nThe Cannery Marketplace\n7488 Monterey Road, Gilroy\n(408) 337-1620`
    : kind === "decline"
      ? `Hi ${first},\n\nThank you for sharing ${application.businessName} with The Cannery Marketplace. We reviewed your vendor interest form, and we are not able to offer a space right now.\n\n${note ? `${note}\n\n` : ""}We keep every form on file and may reach out if that changes.\n\nThe Cannery Marketplace`
      : `Hi ${first},\n\nThank you for your vendor interest form for ${application.businessName}.\n\n${note ? `${note}\n\n` : ""}The Cannery Marketplace`;
  return `mailto:${encodeURIComponent(application.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Owner dashboard tab: vendor interest forms submitted on /apply. */
export default function ApplicationsPanel() {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.applications.useQuery();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("new");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const update = trpc.adminPortal.setApplicationStatus.useMutation({
    onSuccess: async (_result, input) => {
      const application = list.data?.find((item) => item.id === input.id);
      if (application && input.status === "invited") notifySuccess(`${application.businessName} invited`, { description: `${application.email} can now sign in to the maker portal. Send them the welcome email.`, link: { label: "Email the maker", href: emailLink(application, "invite", input.note ?? "") } });
      else if (application && input.status === "declined") notifySuccess("Marked as declined", { description: "Let them know with a short email.", link: { label: "Email the applicant", href: emailLink(application, "decline", input.note ?? "") } });
      else notifySuccess(input.status === "archived" ? "Application archived" : "Moved back to New");
      await Promise.all([utils.adminPortal.applications.invalidate(), utils.adminPortal.makerInvites.invalidate()]);
    },
    onError: (error) => notifyError(error, "Application not updated"),
  });

  const rows = list.data || [];
  const counts = Object.fromEntries(FILTERS.map((item) => [item.id, item.id === "all" ? rows.length : rows.filter((row) => row.status === item.id).length]));
  const shown = filter === "all" ? rows : rows.filter((row) => row.status === filter);

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Vendor interest forms</p><h2>Applications</h2><p>Forms submitted on the site's "Become a vendor" page. Invite a maker to give them maker portal access, then send the welcome email so they know how to sign in.</p></div><a className="button-plain" href="/apply" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View the form</a></div>
    <div className="application-filters" role="tablist" aria-label="Filter applications">{FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label} <span>{counts[item.id]}</span></button>)}</div>
    <div className="secure-review-list">
      {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : list.error ? <div className="admin-empty"><h3>Applications did not load</h3><p>{list.error.message}</p></div> : shown.length ? shown.map((item) => <article className="secure-admin-card application-card" key={item.id}>
        <div className="secure-card-heading"><div><span className={`listing-status listing-status-${item.status === "new" ? "pending" : item.status === "invited" ? "published" : "muted"}`}>{STATUS_TEXT[item.status]}</span><h3>{item.businessName}</h3><p>{item.fullName} · {item.city} · received {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div></div>
        <p className="application-tagline">{item.tagline}</p>
        <dl className="application-details">
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
          {item.status === "invited" && <a className="button-primary" href={emailLink(item, "invite", notes[item.id] || "")}><Mail size={14} /> Send welcome email</a>}
          <a className="button-plain" href={emailLink(item, "reply", notes[item.id] || "")}><Mail size={14} /> Email them</a>
          {item.status === "new" && <button className="danger-button" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "declined", note: notes[item.id] || "" })}><X size={14} /> Decline</button>}
          {item.status !== "archived" && item.status !== "new" && <button className="button-plain" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "archived", note: item.adminNote || "" })}><Archive size={14} /> Archive</button>}
          {item.status !== "new" && <button className="button-plain" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: "new", note: item.adminNote || "" })}><RotateCcw size={14} /> Move to New</button>}
        </div>
      </article>) : <div className="admin-empty"><Inbox size={20} /><h3>{filter === "new" ? "No new applications" : "Nothing here"}</h3><p>{filter === "new" ? "New vendor interest forms will appear here. You also get an email for each one." : "Try another filter."}</p></div>}
    </div>
  </section>;
}
