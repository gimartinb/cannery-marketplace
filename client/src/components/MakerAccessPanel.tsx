import { Copy, Link2, Loader2, Mail, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { welcomeText } from "@/lib/makerEmails";
import { trpc } from "@/lib/trpc";
import { useEmailComposer } from "@/components/EmailComposer";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Listing = { id: number; name: string; slug: string; loginEmail: string | null };

/**
 * Owner dashboard tab: who may sign in to the maker portal, and which listings
 * each email may edit. Connecting a listing to an email is the mapping.
 */
export default function MakerAccessPanel({ vendors, onChanged }: { vendors: Listing[]; onChanged: () => Promise<unknown> }) {
  const utils = trpc.useUtils();
  const invites = trpc.adminPortal.makerInvites.useQuery();
  const [text, setText] = useState("");
  const [listingId, setListingId] = useState("");
  const refresh = async () => { await Promise.all([utils.adminPortal.makerInvites.invalidate(), onChanged()]); };
  const add = trpc.adminPortal.addMakerInvites.useMutation({ onError: (error) => notifyError(error, "Emails not added") });
  const assign = trpc.adminPortal.assignListing.useMutation({
    onSuccess: async (row, input) => {
      notifySuccess(input.email ? `${row.name} connected to ${input.email}` : `${row.name} disconnected`, { description: input.email ? "They see this listing the next time they sign in to the maker portal." : "No maker can edit this listing until you connect an email.", link: { label: "View listing", href: `/vendors/${row.slug}` } });
      await refresh();
    },
    onError: (error) => notifyError(error, "Listing not connected"),
  });
  const compose = useEmailComposer();
  const remove = trpc.adminPortal.removeMakerInvite.useMutation({ onSuccess: async (_result, input) => { notifySuccess(`${input.email} can no longer sign in`, { description: "Their listings stay on the site." }); await refresh(); }, onError: (error) => notifyError(error, "Access not removed") });
  // Same wording as the welcome email (lib/makerEmails.ts), for pasting into a text or email.
  const inviteText = welcomeText({ email: "the email address we invited" }, "", false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const entries = Array.from(new Set(text.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean)));
    const invalid = entries.filter((value) => !EMAIL.test(value));
    if (!entries.length) { notifyError("Enter at least one email address.", "Nothing to add"); return; }
    if (invalid.length) { notifyError(`These do not look like email addresses: ${invalid.join(", ")}`, "Check the emails"); return; }
    if (listingId && entries.length > 1) { notifyError("Connect a listing to one email at a time.", "Pick one email"); return; }
    const result = await add.mutateAsync({ emails: entries }).catch(() => null);
    if (!result) return;
    setText("");
    const listing = vendors.find((vendor) => String(vendor.id) === listingId);
    if (listingId) { await assign.mutateAsync({ profileId: Number(listingId), email: entries[0] }).catch(() => null); setListingId(""); }
    else { notifySuccess(`${result.added} email${result.added === 1 ? "" : "s"} can now sign in to the maker portal`, { description: entries.length === 1 ? "The welcome email goes out next." : "Connect each one to their listing below, then send each a welcome email." }); await refresh(); }
    // One maker at a time: open the welcome email to check and send.
    if (entries.length === 1) compose({ template: "makerWelcome", to: entries[0], about: listing ? `listing:${listing.id}` : "maker-access", automatic: true, values: { firstName: "there", business: listing?.name || "your business", email: entries[0], note: "" } });
  }

  const unconnected = vendors.filter((vendor) => !vendor.loginEmail);

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Maker portal access</p><h2>Makers and their listings</h2><p>Each listing is tied to one login email. That maker signs in with a one time code sent to that email and sees every listing tied to it. One email can have several listings.</p></div></div>
    <form className="secure-admin-card" onSubmit={submit}>
      <h3>Invite a maker</h3>
      <label>Maker email (or several, one per line)<textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={"maker@example.com\nanother.maker@example.com"} /></label>
      <label>Connect to a listing (optional)<select value={listingId} onChange={(event) => setListingId(event.target.value)}><option value="">No listing yet (the maker can create one)</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.loginEmail ? ` (now: ${vendor.loginEmail})` : ""}</option>)}</select></label>
      <div className="review-actions"><button className="button-primary" type="submit" disabled={add.isPending || assign.isPending}>{add.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add maker</button><button className="button-plain" type="button" onClick={() => { void navigator.clipboard?.writeText(inviteText).then(() => notifySuccess("Invitation message copied", { description: "Paste it into an email or text to the maker." }), () => notifyError("Your browser blocked copying. Select the text and copy it by hand.", "Not copied")); }}><Copy size={14} /> Copy invitation message</button></div>
      {unconnected.length > 0 && <p className="form-hint">{unconnected.length} listing{unconnected.length === 1 ? " has" : "s have"} no login email yet: {unconnected.map((vendor) => vendor.name).join(", ")}.</p>}
    </form>
    <div className="secure-vendor-table maker-access-table">{invites.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : (invites.data || []).length ? (invites.data || []).map((invite) => <div key={invite.email}>
      <span>{invite.email.slice(0, 2).toUpperCase()}</span>
      <div>
        <strong>{invite.email}</strong>
        <small>{invite.lastSignedIn ? `Last signed in ${new Date(invite.lastSignedIn).toLocaleDateString()}` : "Has not signed in yet"} · added by {invite.invitedBy}</small>
        <div className="listing-chips">{invite.listings.length ? invite.listings.map((listing) => <span className="listing-chip" key={listing.id}>{listing.name}<button type="button" aria-label={`Disconnect ${listing.name}`} disabled={assign.isPending} onClick={() => { if (window.confirm(`Disconnect ${listing.name} from ${invite.email}? The listing stays on the site.`)) assign.mutate({ profileId: listing.id, email: "" }); }}><X size={12} /></button></span>) : <span className="listing-chip empty">No listings connected</span>}</div>
        <label className="connect-listing"><Link2 size={13} /><select value="" disabled={assign.isPending} onChange={(event) => { if (event.target.value) assign.mutate({ profileId: Number(event.target.value), email: invite.email }); }} aria-label={`Connect a listing to ${invite.email}`}><option value="">Connect a listing…</option>{vendors.filter((vendor) => vendor.loginEmail !== invite.email).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.loginEmail ? ` (moves from ${vendor.loginEmail})` : ""}</option>)}</select></label>
      </div>
      <button className="button-plain" type="button" onClick={() => compose({ template: "makerWelcome", to: invite.email, about: "maker-access", values: { firstName: "there", business: invite.listings[0]?.name || "your business", email: invite.email, note: "" } })}><Mail size={14} /> Welcome email</button>
      <button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove maker portal access for ${invite.email}? Their listings stay on the site.`)) remove.mutate({ email: invite.email }); }}><Trash2 size={14} /> Remove access</button>
    </div>) : <div className="admin-empty"><h3>No makers invited yet</h3><p>Add a maker's email above to let them into the maker portal.</p></div>}</div>
  </section>;
}
