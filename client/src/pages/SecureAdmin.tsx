import { Check, ChevronRight, Inbox, Mail, ExternalLink, FileCheck2, FileSpreadsheet, Gift, Image as ImageIcon, Images, LayoutDashboard, Sparkles, Loader2, LockKeyhole, LogOut, Store, Type, UserPlus, UserRound, UsersRound, X } from "lucide-react";
import ReviewChanges from "@/components/ReviewChanges";
import { findLiveListing } from "@shared/changeDiff";
import { useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import GalleryPanel from "@/components/GalleryPanel";
import HighlightsPanel from "@/components/HighlightsPanel";
import ApplicationsPanel from "@/components/ApplicationsPanel";
import MakerAccessPanel from "@/components/MakerAccessPanel";
import PublishedVendorsPanel from "@/components/PublishedVendorsPanel";
import UsageCard from "@/components/UsageCard";
import { notifyError, notifySuccess } from "@/lib/notify";
import { isListedCategory, MAKER_CATEGORIES } from "@shared/makerListing";
import SiteImagesPanel from "@/components/SiteImagesPanel";
import VendorImportPanel from "@/components/VendorImportPanel";
import { clearSignInAttempt, signInJustFailed, signInThroughAccess, signOutOfAccess, trpc } from "@/lib/trpc";
import SiteTextPanel from "@/components/SiteTextPanel";
import GiftsPanel from "@/components/GiftsPanel";

const tabs = [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "applications", label: "Applications", icon: Inbox }, { id: "review", label: "Review queue", icon: FileCheck2 }, { id: "vendors", label: "Published vendors", icon: UsersRound }, { id: "access", label: "Maker access", icon: UserPlus }, { id: "text", label: "Site text", icon: Type }, { id: "images", label: "Site images", icon: ImageIcon }, { id: "highlights", label: "Home highlights", icon: Sparkles }, { id: "gallery", label: "Photo gallery", icon: Images }, { id: "gifts", label: "Gifts and corporate", icon: Gift }, { id: "import", label: "Vendor import", icon: FileSpreadsheet }] as const;
type Tab = (typeof tabs)[number]["id"];

export default function SecureAdmin() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("overview");
  const dashboard = trpc.adminPortal.dashboard.useQuery(undefined, { retry: false });
  const applications = trpc.adminPortal.applications.useQuery(undefined, { enabled: dashboard.isSuccess });
  const newApplications = (applications.data || []).filter((item) => item.status === "new").length;
  const me = trpc.adminPortal.me.useQuery(undefined, { retry: false, enabled: dashboard.isSuccess });
  if (dashboard.isLoading) return <SiteShell><PageMeta canonicalPath="/admin" noIndex title="Owner portal" description="Private owner access for The Cannery Marketplace." /><main className="portal-loading"><Loader2 className="animate-spin" /> Checking secure access…</main></SiteShell>;
  if (dashboard.isSuccess) clearSignInAttempt();
  if (dashboard.error) return <AccessProblem forbidden={dashboard.error.data?.code === "FORBIDDEN"} detail={dashboard.error.message} />;
  const data = dashboard.data!;
  const pending = data.submissions.filter((item) => item.status === "pending");
  return <><PageMeta canonicalPath="/admin" noIndex title="Owner portal" description="Private owner access for The Cannery Marketplace." /><div className="admin-app secure-admin-app"><aside className="admin-sidebar"><div className="admin-brand"><div className="admin-logo-mark"><Store size={19} /></div><div><strong>The Cannery</strong><span>Secure owner panel</span></div></div><div className="admin-preview-pill secure"><LockKeyhole size={12} /> Authenticated</div><nav className="admin-nav">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? "active" : ""} type="button" onClick={() => setTab(item.id)}><Icon size={16} /> {item.label}{item.id === "review" && pending.length > 0 && <span className="admin-count">{pending.length}</span>}{item.id === "applications" && newApplications > 0 && <span className="admin-count">{newApplications}</span>}</button>; })}</nav><div className="admin-sidebar-bottom"><Link href="/" target="_blank">View site <ChevronRight size={14} /></Link><button type="button" onClick={() => signOutOfAccess()}><LogOut size={15} /> Sign out</button></div></aside><main className="admin-main"><header className="admin-topbar"><div><p className="eyebrow">Owner dashboard</p><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div><div className="admin-user"><span className="admin-avatar"><UserRound size={15} /></span><span>{me.data?.email ?? "Marketplace owner"}</span></div></header>{tab === "overview" && <Overview applicationCount={newApplications} vendorCount={data.vendors.filter((item) => item.active).length} pendingCount={pending.length} giftBoxesEnabled={data.giftBoxesEnabled} onTab={setTab} />}{tab === "review" && <ReviewQueue submissions={data.submissions} vendors={data.vendors} onRefresh={() => dashboard.refetch()} />}{tab === "vendors" && <PublishedVendorsPanel vendors={data.vendors} onRefresh={() => dashboard.refetch()} />}{tab === "access" && <MakerAccessPanel vendors={data.vendors} onChanged={() => dashboard.refetch()} />}{tab === "text" && <SiteTextPanel />}{tab === "images" && <SiteImagesPanel />}{tab === "highlights" && <HighlightsPanel vendors={data.vendors} />}{tab === "gallery" && <GalleryPanel />}{tab === "gifts" && <GiftsPanel enabled={data.giftBoxesEnabled} onRefresh={() => Promise.all([dashboard.refetch(), utils.settings.public.invalidate(), utils.gifts.catalog.invalidate()])} />}{tab === "import" && <VendorImportPanel existingSlugs={data.vendors.map((item) => item.slug)} onImported={() => dashboard.refetch()} />}{tab === "applications" && <ApplicationsPanel />}</main></div></>;
}

// Sign in itself happens on Cloudflare Access's email code screen, before this page loads.
// This card only appears if that session is missing, expired, or for an email that is not approved.
function AccessProblem({ forbidden, detail }: { forbidden: boolean; detail?: string }) {
  const stuck = !forbidden && signInJustFailed();
  if (stuck) return <SiteShell><PageMeta canonicalPath="/admin" noIndex title="Owner sign in" description="Private owner access for The Cannery Marketplace." /><main className="admin-login"><div className="admin-login-card"><div className="admin-logo-mark"><LockKeyhole size={22} /></div><p className="eyebrow">Private owner area</p><h1 className="display">Sign in did not finish.</h1><p>The page reloaded, but no sign in came back from Cloudflare Access. This usually means Access is not protecting this web address yet, or its settings do not match the site. The site owner can check this in Cloudflare under the Worker's Access settings.</p>{detail && <p><small>Details for the site owner: {detail}</small></p>}<button className="button-primary" type="button" onClick={() => { clearSignInAttempt(); signInThroughAccess("/admin"); }}>Try again</button></div></main></SiteShell>;
  return <SiteShell><PageMeta canonicalPath="/admin" noIndex title="Owner sign in" description="Private owner access for The Cannery Marketplace." /><main className="admin-login"><div className="admin-login-card"><div className="admin-logo-mark"><LockKeyhole size={22} /></div><p className="eyebrow">Private owner area</p><h1 className="display">{forbidden ? "Not on the owner list." : "Owner sign in."}</h1><p>{forbidden ? "You are signed in, but this email is not approved for the owner dashboard. Sign out and use an approved email." : "Sign in with your approved email. We will send you a one time code. There is no password to remember."}</p>{forbidden ? <button className="button-primary" type="button" onClick={() => signOutOfAccess()}>Sign out</button> : <button className="button-primary" type="button" onClick={() => signInThroughAccess("/admin")}>Continue to sign in</button>}<div className="admin-demo-note"><LockKeyhole size={15} /><span>Protected by Cloudflare Access email verification.</span></div></div></main></SiteShell>;
}

function Overview({ applicationCount, vendorCount, pendingCount, giftBoxesEnabled, onTab }: { applicationCount: number; vendorCount: number; pendingCount: number; giftBoxesEnabled: boolean; onTab: (tab: Tab) => void }) { return <section className="admin-content"><div className="admin-welcome"><div><p className="eyebrow">Secure content control</p><h2 className="display">Keep the marketplace <em>fresh.</em></h2><p>Vendor submissions remain private until you approve them. Public feature controls and imports are validated on the server.</p></div><div className="admin-welcome-icon"><LockKeyhole size={27} /></div></div><div className="admin-stat-grid"><button type="button" onClick={() => onTab("applications")}><span>New applications</span><strong>{applicationCount}</strong><small>Review forms <ChevronRight size={13} /></small></button><button type="button" onClick={() => onTab("vendors")}><span>Published vendors</span><strong>{vendorCount}</strong><small>Manage visibility <ChevronRight size={13} /></small></button><button type="button" onClick={() => onTab("review")}><span>Pending reviews</span><strong>{pendingCount}</strong><small>Open queue <ChevronRight size={13} /></small></button><button type="button" onClick={() => onTab("gifts")}><span>Gifts and corporate</span><strong>{giftBoxesEnabled ? "On" : "Hidden"}</strong><small>Boxes and requests <ChevronRight size={13} /></small></button></div><UsageCard /></section>; }

function ReviewQueue({ submissions, vendors, onRefresh }: { submissions: any[]; vendors: any[]; onRefresh: () => Promise<unknown> }) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  // For makers who typed their own category: keep it, or switch it to one on the list when approving.
  const [categories, setCategories] = useState<Record<number, string>>({});
  const review = trpc.adminPortal.review.useMutation({
    onSuccess: async (_result, input) => {
      const item = submissions.find((entry) => entry.id === input.submissionId);
      if (input.decision === "approved") notifySuccess(`${item?.name ?? "Listing"} approved and published`, { link: item ? { label: "View listing", href: `/vendors/${item.slug}` } : undefined });
      else notifySuccess(input.decision === "rejected" ? "Submission rejected" : "Changes requested", { description: "The maker sees your note in their maker space. Email them so they know to look.", link: item ? { label: "Email the maker", href: makerEmailLink(item, input.note ?? "") } : undefined });
      await onRefresh();
    },
    onError: (error) => notifyError(error, "Review not saved"),
  });
  const pending = submissions.filter((item) => item.status === "pending");
  if (!pending.length) return <section className="admin-content"><div className="admin-empty review-empty"><div className="admin-empty-icon"><Check size={19} /></div><h3>No profiles waiting</h3><p>New and updated profiles will appear here after a vendor submits them.</p></div></section>;
  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Private until approved</p><h2>Vendor review queue</h2><p>Changes from the live listing are highlighted at the top of each card. Check names, story, photos, and links before publishing.</p></div></div><div className="secure-review-list">{pending.map((item) => <article className="secure-admin-card" key={item.id}><div className="secure-card-heading"><div><span className="review-status">Pending review</span><h3>{item.name}</h3>{item.ownerName && <p>Maker: {item.ownerName}</p>}<p>{item.category} · Login: {item.accountEmail || "unknown"}{item.contactEmail !== item.accountEmail ? ` · Contact: ${item.contactEmail}` : ""}</p></div>{item.coverImageUrl && <img className="secure-review-cover" src={item.coverImageUrl} alt="" />}</div><ReviewChanges live={findLiveListing(vendors, item)} submission={item} /><details className="review-full" open={!findLiveListing(vendors, item)}><summary>Full submission</summary><p>{item.shortBio}</p>{item.ownerBio && <div className="review-bio"><strong>About the maker</strong><p>{item.ownerBio}</p></div>}<div className="review-socials">{[["Website",item.websiteUrl],["Instagram",item.instagramUrl],["Facebook",item.facebookUrl],["TikTok",item.tiktokUrl]].filter(([,url]) => url).map(([label,url]) => <a href={url} target="_blank" rel="noreferrer" key={label}>{label} <ExternalLink size={12} /></a>)}</div>{item.galleryImageUrls?.length > 0 && <div className="review-gallery">{item.galleryImageUrls.map((url: string) => <img src={url} alt="Submitted work sample" key={url} />)}</div>}</details>{!isListedCategory(item.category) && <label>New category from the maker: "{item.category}"<select value={categories[item.id] || item.category} onChange={(event) => setCategories({ ...categories, [item.id]: event.target.value })}><option value={item.category}>Keep "{item.category}" as a new category</option>{MAKER_CATEGORIES.filter((category) => category !== "Other").map((category) => <option key={category} value={category}>Use {category}</option>)}</select></label>}<label>Review note<textarea value={notes[item.id] || ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} placeholder="Required when requesting changes or rejecting" /></label><div className="review-actions"><button className="button-primary" type="button" onClick={() => review.mutate({ submissionId: item.id, decision: "approved", note: notes[item.id] || "", category: categories[item.id] && categories[item.id] !== item.category ? categories[item.id] : undefined })}><Check size={14} /> Approve</button><button className="button-plain" type="button" onClick={() => review.mutate({ submissionId: item.id, decision: "changes_requested", note: notes[item.id] || "" })}><FileCheck2 size={14} /> Request changes</button><button className="danger-button" type="button" onClick={() => review.mutate({ submissionId: item.id, decision: "rejected", note: notes[item.id] || "" })}><X size={14} /> Reject</button><a className="button-plain" href={makerEmailLink(item, notes[item.id] || "")}><Mail size={14} /> Email the maker</a></div></article>)}</div></section>;
}

/** Opens the owner's own email app with a message to the maker, so replies come back to the marketplace inbox. Free, no email service needed. */
function makerEmailLink(item: { name: string; accountEmail?: string | null; contactEmail: string }, note: string) {
  const to = item.accountEmail || item.contactEmail;
  const cc = item.contactEmail && item.contactEmail !== to ? `&cc=${encodeURIComponent(item.contactEmail)}` : "";
  const body = `Hi,\n\nThank you for your listing "${item.name}" on The Cannery Marketplace.\n\n${note ? `${note}\n\n` : ""}You can update your listing by signing in at ${window.location.origin}/maker-portal with this email address.\n\nThe Cannery Marketplace`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Your Cannery Marketplace listing: ${item.name}`)}${cc}&body=${encodeURIComponent(body)}`;
}


