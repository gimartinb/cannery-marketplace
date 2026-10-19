import { ArrowLeft, Check, Clock, ExternalLink, Eye, History, Loader2, LogOut, Pencil, Plus, Send, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import SiteShell from "@/components/SiteShell";
import PageMeta from "@/components/PageMeta";
import ListingFields, { emptyListing, toListingValues, uploadListingPhoto, type ListingValues } from "@/components/ListingFields";
import { notifyError, notifySuccess } from "@/lib/notify";
import { LISTING_FIELD_ORDER, listingProblems, REVIEW_TIME_NOTE } from "@shared/makerListing";
import { clearSignInAttempt, signInJustFailed, signInThroughAccess, signOutOfAccess, trpc } from "@/lib/trpc";

type Status = "published" | "hidden" | "pending" | "changes_requested" | "rejected" | "draft";
const STATUS_TEXT: Record<Status, string> = { published: "Published", hidden: "Hidden by the marketplace", pending: "Change waiting for review", changes_requested: "Changes requested", rejected: "Not approved", draft: "Draft" };

export default function MakerPortal() {
  const utils = trpc.useUtils();
  const session = trpc.vendorPortal.me.useQuery(undefined, { retry: false });
  const listings = trpc.vendorPortal.listings.useQuery(undefined, { enabled: session.isSuccess });
  const [editing, setEditingState] = useState<{ values: ListingValues; title: string } | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const setEditing = (next: { values: ListingValues; title: string } | null) => { if (!next || next.title !== editing?.title) setShowProblems(false); setEditingState(next); };
  const problems = editing ? listingProblems(editing.values) : {};

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const open = LISTING_FIELD_ORDER.filter((field) => problems[field]);
    if (open.length) {
      setShowProblems(true);
      notifyError(`${open.length} item${open.length === 1 ? " needs" : "s need"} attention. ${problems[open[0]]}`, "Almost ready to send");
      window.setTimeout(() => document.querySelector<HTMLElement>(".maker-editor-card [aria-invalid='true'], .maker-editor-card .form-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    submit.mutate(editing.values);
  }
  const submit = trpc.vendorPortal.submit.useMutation({
    onSuccess: async () => {
      notifySuccess("Sent for review", { description: "The marketplace administrator reviews every submission. Approval can take up to 72 hours." });
      setEditing(null);
      await utils.vendorPortal.listings.invalidate();
    },
    onError: (error) => notifyError(error, "Listing not sent"),
  });

  if (session.isLoading) return <SiteShell><main className="portal-loading"><Loader2 className="animate-spin" /> Checking secure access…</main></SiteShell>;
  if (session.isSuccess) clearSignInAttempt();
  if (session.error?.data?.code === "FORBIDDEN") return <SiteShell><PageMeta canonicalPath="/maker-portal" noIndex title="Maker sign in" description="Secure maker profile access for The Cannery Marketplace." /><main className="admin-login"><div className="admin-login-card"><div className="admin-logo-mark"><Store size={22} /></div><p className="eyebrow">Secure maker access</p><h1 className="display">Almost there.</h1><p>{session.error.message} Once you are added, come back to this page and sign in again.</p><button className="button-plain" type="button" onClick={() => signOutOfAccess()}>Sign out or use a different email</button></div></main></SiteShell>;
  if (session.error && signInJustFailed()) return <SiteShell><PageMeta canonicalPath="/maker-portal" noIndex title="Maker sign in" description="Secure maker profile access for The Cannery Marketplace." /><main className="admin-login"><div className="admin-login-card"><div className="admin-logo-mark"><Store size={22} /></div><p className="eyebrow">Secure maker access</p><h1 className="display">Sign in did not finish.</h1><p>The page reloaded, but no sign in came back from Cloudflare Access. Please try again in a moment. If this keeps happening, contact the marketplace.</p><p><small>Details: {session.error.message}</small></p><button className="button-primary" type="button" onClick={() => { clearSignInAttempt(); signInThroughAccess("/maker-portal"); }}>Try again</button></div></main></SiteShell>;
  if (session.error) return <SiteShell><PageMeta canonicalPath="/maker-portal" noIndex title="Maker sign in" description="Secure maker profile access for The Cannery Marketplace." /><main className="admin-login"><div className="admin-login-card"><div className="admin-logo-mark"><Store size={22} /></div><p className="eyebrow">Secure maker access</p><h1 className="display">Welcome to your maker space.</h1><p>Sign in with your email and we will send you a one time code. New makers use the same step, and your account is created automatically. Your profile stays private until the marketplace approves it.</p><button className="button-primary" type="button" onClick={() => signInThroughAccess("/maker-portal")}>Continue to sign in</button><div className="admin-demo-note"><ShieldCheck size={15} /><span>Protected by Cloudflare Access email verification. No password to remember.</span></div></div></main></SiteShell>;

  const email = session.data?.email ?? "";
  const data = listings.data;
  const cards = [
    ...(data?.listings ?? []).map(({ profile, change }) => ({
      key: `p${profile.id}`, name: change?.name ?? profile.name, category: change?.category ?? profile.category, cover: change?.coverImageUrl ?? profile.coverImageUrl,
      status: (change ? change.status : profile.active ? "published" : "hidden") as Status, note: change?.adminNote ?? null,
      viewHref: profile.active ? `/vendors/${profile.slug}` : null, locked: change?.status === "pending",
      values: change ? toListingValues(change, profile.id) : toListingValues(profile, profile.id),
    })),
    ...(data?.drafts ?? []).map((draft) => ({
      key: `d${draft.id}`, name: draft.name, category: draft.category, cover: draft.coverImageUrl, status: draft.status as Status, note: draft.adminNote,
      viewHref: null, locked: draft.status === "pending", values: { ...toListingValues(draft), profileId: undefined },
    })),
  ];

  return <SiteShell><PageMeta canonicalPath="/maker-portal" noIndex title="Maker profile workspace" description="Secure self-service maker profile workspace for The Cannery Marketplace." /><main className="maker-portal">
    <section className="maker-portal-header"><div className="site-container"><div className="portal-breadcrumb"><Link href="/vendors">Maker directory</Link><span>/</span><span>Secure workspace</span></div><div className="maker-portal-header-grid"><div><p className="eyebrow">Maker self-service</p><h1 className="display">Your space at <em>The Cannery.</em></h1><p>Signed in as <strong>{email}</strong>. Update your listings and send changes to the marketplace for review.</p></div><div className="portal-status portal-status-draft"><small>Review time</small><strong>Up to 72 hours</strong><span>The marketplace administrator reviews every submission and will contact you if anything needs to change.</span><button className="button-secondary compact-button" type="button" onClick={() => signOutOfAccess()}><LogOut size={13} /> Sign out</button></div></div></div></section>
    <section className="maker-portal-body"><div className="site-container">
      {!editing && <div className="maker-listings">
        <div className="portal-card-heading"><div><p className="eyebrow">Tied to {email}</p><h2>Your listings</h2></div><button className="button-primary" type="button" onClick={() => setEditing({ values: { ...emptyListing, contactEmail: email }, title: "New listing" })}><Plus size={14} /> Add a new listing</button></div>
        {listings.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : listings.error ? <div className="admin-empty"><h3>Your listings did not load</h3><p>{listings.error.message}</p><button className="button-plain" type="button" onClick={() => listings.refetch()}>Try again</button></div> : cards.length ? <div className="maker-listing-grid">{cards.map((card) => <article className="maker-listing-card" key={card.key}>
          <div className="maker-listing-photo">{card.cover ? <img src={card.cover} alt="" /> : <span>{card.name.slice(0, 2).toUpperCase()}</span>}</div>
          <div className="maker-listing-body"><span className={`listing-status listing-status-${card.status}`}>{STATUS_TEXT[card.status]}</span><h3>{card.name}</h3><p>{card.category}</p>{card.note && <p className="listing-note"><strong>Note from the marketplace:</strong> {card.note}</p>}
            <div className="review-actions"><button className="button-plain" type="button" disabled={card.locked} title={card.locked ? "Waiting for review. You can edit again after the marketplace responds." : undefined} onClick={() => setEditing({ values: card.values, title: card.name })}><Pencil size={14} /> {card.locked ? "Waiting for review" : "Edit"}</button>{card.viewHref && <a className="button-plain" href={card.viewHref} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View</a>}</div></div>
        </article>)}</div> : <div className="admin-empty"><h3>No listings are tied to this email yet</h3><p>If you already sell at The Cannery, ask the marketplace to connect your listing to {email}. Or add a new listing and send it for review.</p></div>}
      </div>}
      {editing && <div className="maker-portal-grid"><form className="maker-editor-card" noValidate onSubmit={send}>
        <div className="portal-card-heading"><div><p className="eyebrow">{editing.values.profileId ? "Update your listing" : "New listing"}</p><h2>{editing.title}</h2></div><button className="button-plain compact-button" type="button" onClick={() => setEditing(null)}><ArrowLeft size={13} /> All listings</button></div>
        <ListingFields value={editing.values} problems={showProblems ? problems : undefined} onChange={(values) => setEditingState({ ...editing, values })} upload={(file) => uploadListingPhoto("/api/vendor/upload", file)} />
        <div className="review-time-note"><Clock size={16} /><p>{REVIEW_TIME_NOTE}</p></div>
        <div className="portal-editor-actions"><button className="button-primary" type="submit" disabled={submit.isPending}>{submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for review</button><button className="button-plain" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
        <p className="portal-review-note"><ShieldCheck size={14} /> Changes stay private until the marketplace approves them.</p>
      </form>
      <aside className="maker-portal-side"><div className="portal-preview-card"><div className="portal-card-heading"><div><p className="eyebrow">Public preview</p><h2>What shoppers will see</h2></div><Eye size={17} /></div><div className="portal-preview-photo">{editing.values.coverImageUrl ? <img src={editing.values.coverImageUrl} alt="Maker preview" /> : <><span>Cover photo</span><small>Add a photo in the editor</small></>}</div><p className="eyebrow">{editing.values.category || "Maker category"}</p><h3>{editing.values.name || "Maker name"}</h3><p>{editing.values.shortBio || "Your short description will appear here."}</p><div className="portal-gallery-preview">{editing.values.galleryImageUrls.slice(0, 3).map((image, index) => <img src={image} alt={`Work sample ${index + 1}`} key={image} />)}</div><div className="portal-preview-rule" /><p className="portal-preview-label">Meet the maker</p><p>{editing.values.ownerBio || "Your maker story will appear here."}</p></div><div className="portal-history"><div className="portal-card-heading"><div><p className="eyebrow">Review process</p><h2>Trust and control</h2></div><History size={17} /></div>{["Send a new listing or an update", "The administrator reviews it within 72 hours", "Only approved content becomes public"].map((item, index) => <div className="portal-history-item" key={item}><span><Check size={11} /></span><div><strong>{item}</strong><small>Step {index + 1}</small></div></div>)}</div></aside></div>}
    </div></section>
  </main></SiteShell>;
}
