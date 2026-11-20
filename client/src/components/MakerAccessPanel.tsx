import { Copy, FilePen, Link2, Loader2, Mail, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { welcomeText } from "@/lib/makerEmails";
import { trpc } from "@/lib/trpc";
import { useEmailComposer } from "@/components/EmailComposer";
import { emptyListing, type ListingValues } from "@/components/ListingFields";
import { EditStartedListing, StartListingFields, toStartInput, type StartedListing } from "@/components/StartListingForm";
import { STARTED_LISTING_EMAIL_NOTE } from "@shared/vendorProfile";

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
  const [makerName, setMakerName] = useState("");
  const [adding, setAdding] = useState(false);
  // What happens with the maker's listing: start one for them (a draft they finish), connect an existing one, or neither.
  const [mode, setMode] = useState<"start" | "connect" | "none">("start");
  const [startValues, setStartValues] = useState<ListingValues>(emptyListing);
  const [editingStarted, setEditingStarted] = useState<number | null>(null);
  const started = trpc.adminPortal.startedListings.useQuery();
  const startListing = trpc.adminPortal.startListing.useMutation({ onError: (error) => notifyError(error, "Listing not started") });
  const removeStarted = trpc.adminPortal.deleteStartedListing.useMutation({ onSuccess: async () => { notifySuccess("Started listing deleted", { description: "The maker can still sign in and create a listing themselves." }); await utils.adminPortal.startedListings.invalidate(); }, onError: (error) => notifyError(error, "Not deleted") });
  const refresh = async () => { await Promise.all([utils.adminPortal.makerInvites.invalidate(), utils.adminPortal.startedListings.invalidate(), onChanged()]); };
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
    if (mode === "start") {
      if (entries.length !== 1) { notifyError("Start a listing for one maker at a time.", "Enter one email"); return; }
      const prepared = toStartInput(startValues, entries[0]);
      if (!prepared.ok) { notifyError(prepared.message, "Check the listing"); return; }
      const done = await startListing.mutateAsync(prepared.input).catch(() => null);
      if (!done) return;
      notifySuccess(`Listing started for ${prepared.input.name}`, { description: "It is not public. The maker finishes it and sends it for review; approving it publishes it." });
      await refresh();
      compose({ template: "makerWelcome", to: entries[0], about: "maker-access", automatic: true, values: { firstName: makerName.trim().split(" ")[0] || "there", business: prepared.input.name, email: entries[0], note: STARTED_LISTING_EMAIL_NOTE } });
      setText(""); setMakerName(""); setStartValues(emptyListing); setAdding(false);
      return;
    }
    if (mode === "connect" && !listingId) { notifyError("Choose the listing to connect, or pick another option.", "Choose a listing"); return; }
    if (listingId && entries.length > 1) { notifyError("Connect a listing to one email at a time.", "Pick one email"); return; }
    const result = await add.mutateAsync({ emails: entries }).catch(() => null);
    if (!result) return;
    setText("");
    const listing = vendors.find((vendor) => String(vendor.id) === listingId);
    if (listingId) { await assign.mutateAsync({ profileId: Number(listingId), email: entries[0] }).catch(() => null); setListingId(""); }
    else { notifySuccess(`${result.added} email${result.added === 1 ? "" : "s"} can now sign in to the maker portal`, { description: entries.length === 1 ? "The welcome email goes out next." : "Connect each one to their listing below, then send each a welcome email." }); await refresh(); }
    // One maker at a time: open the welcome email to check and send.
    if (entries.length === 1) compose({ template: "makerWelcome", to: entries[0], about: listing ? `listing:${listing.id}` : "maker-access", automatic: true, values: { firstName: makerName.trim().split(" ")[0] || "there", business: listing?.name || "your business", email: entries[0], note: "" } });
    setMakerName(""); setAdding(false);
  }

  const unconnected = vendors.filter((vendor) => !vendor.loginEmail);

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Maker portal access</p><h2>Makers and their listings</h2><p>Each listing is tied to one login email. That maker signs in with a one time code sent to that email and sees every listing tied to it. One email can have several listings.</p></div>{!adding && <button className="button-primary" type="button" onClick={() => setAdding(true)}><Plus size={15} /> Add new maker</button>}</div>
    {adding && <form className="secure-admin-card add-maker-card" onSubmit={submit}>
      <div className="secure-card-heading"><div><h3>Add new maker</h3><p>They can sign in right away, and the welcome email goes out automatically.</p></div><button className="button-plain compact-button" type="button" onClick={() => setAdding(false)}><X size={13} /> Close</button></div>
      <label>Maker's first name (optional, used in the welcome email)<input value={makerName} maxLength={80} onChange={(event) => setMakerName(event.target.value)} placeholder="Maria" /></label>
      <label>Maker email (or several, one per line)<textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={"maker@example.com\nanother.maker@example.com"} /></label>
      <fieldset className="listing-mode"><legend>Their listing</legend>
        <label className="radio-label"><input type="radio" name="listing-mode" checked={mode === "start"} onChange={() => setMode("start")} /> <span><strong>Start a listing for them</strong><small>You fill in what you know. They finish it and send it for review. Not public until you approve it.</small></span></label>
        <label className="radio-label"><input type="radio" name="listing-mode" checked={mode === "connect"} onChange={() => setMode("connect")} /> <span><strong>Connect a listing that is already on the site</strong></span></label>
        <label className="radio-label"><input type="radio" name="listing-mode" checked={mode === "none"} onChange={() => { setMode("none"); setListingId(""); }} /> <span><strong>Not now</strong><small>They can create their own listing after signing in.</small></span></label>
      </fieldset>
      {mode === "connect" && <label>Listing to connect<select value={listingId} onChange={(event) => setListingId(event.target.value)}><option value="">Choose a listing…</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.loginEmail ? ` (now: ${vendor.loginEmail})` : ""}</option>)}</select></label>}
      {mode === "start" && <StartListingFields value={startValues} onChange={setStartValues} />}
      <div className={`review-actions${mode === "start" ? " sticky-save-bar" : ""}`}><button className="button-primary" type="submit" disabled={add.isPending || assign.isPending || startListing.isPending}>{add.isPending || startListing.isPending ? <Loader2 size={14} className="animate-spin" /> : mode === "start" ? <FilePen size={14} /> : <UserPlus size={14} />} {mode === "start" ? "Start listing and send welcome" : "Add maker and send welcome"}</button><button className="button-plain" type="button" onClick={() => { void navigator.clipboard?.writeText(inviteText).then(() => notifySuccess("Invitation message copied", { description: "Paste it into an email or text to the maker." }), () => notifyError("Your browser blocked copying. Select the text and copy it by hand.", "Not copied")); }}><Copy size={14} /> Copy invitation message</button></div>
      {unconnected.length > 0 && <p className="form-hint">{unconnected.length} listing{unconnected.length === 1 ? " has" : "s have"} no login email yet: {unconnected.map((vendor) => vendor.name).join(", ")}.</p>}
    </form>}
    {(started.data ?? []).length > 0 && <div className="started-listings"><h3>Listings started for makers <small>Waiting for the maker to finish and send for review. Not public.</small></h3>
      {(started.data ?? []).map((row) => editingStarted === row.id ? <EditStartedListing key={row.id} row={row as StartedListing} onDone={() => setEditingStarted(null)} /> : <div className="secure-admin-card started-listing-row" key={row.id}>
        <div><strong>{row.name}</strong><small>{row.email} · started {new Date(row.updatedAt).toLocaleDateString()}{row.category ? ` · ${row.category}` : ""}</small></div>
        <div className="maker-access-actions">
          <button className="button-plain compact-button" type="button" onClick={() => setEditingStarted(row.id)}><Pencil size={14} /> Edit</button>
          <button className="button-plain compact-button" type="button" onClick={() => compose({ template: "makerWelcome", to: row.email, about: "maker-access", values: { firstName: (row.ownerName || "").split(" ")[0] || "there", business: row.name, email: row.email, note: STARTED_LISTING_EMAIL_NOTE } })}><Mail size={14} /> Welcome email</button>
          <button className="danger-button compact-button" type="button" disabled={removeStarted.isPending} onClick={() => { if (window.confirm(`Delete the listing you started for ${row.name}? The maker keeps their login.`)) removeStarted.mutate({ id: row.id }); }}><Trash2 size={14} /> Delete</button>
        </div>
      </div>)}
    </div>}
    <div className="secure-vendor-table maker-access-table">{invites.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : (invites.data || []).length ? (invites.data || []).map((invite) => <div key={invite.email}>
      <span>{invite.email.slice(0, 2).toUpperCase()}</span>
      <div>
        <strong>{invite.email}</strong>
        <small>{invite.lastSignedIn ? `Last signed in ${new Date(invite.lastSignedIn).toLocaleDateString()}` : "Has not signed in yet"} · added by {invite.invitedBy}</small>
        <div className="listing-chips">{invite.listings.length ? invite.listings.map((listing) => <span className="listing-chip" key={listing.id}>{listing.name}<button type="button" aria-label={`Disconnect ${listing.name}`} disabled={assign.isPending} onClick={() => { if (window.confirm(`Disconnect ${listing.name} from ${invite.email}? The listing stays on the site.`)) assign.mutate({ profileId: listing.id, email: "" }); }}><X size={12} /></button></span>) : <span className="listing-chip empty">No listings connected</span>}</div>
        <label className="connect-listing"><Link2 size={13} /><select value="" disabled={assign.isPending} onChange={(event) => { if (event.target.value) assign.mutate({ profileId: Number(event.target.value), email: invite.email }); }} aria-label={`Connect a listing to ${invite.email}`}><option value="">Connect a listing…</option>{vendors.filter((vendor) => vendor.loginEmail !== invite.email).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.loginEmail ? ` (moves from ${vendor.loginEmail})` : ""}</option>)}</select></label>
      </div>
      <div className="maker-access-actions"><button className="button-plain compact-button" type="button" onClick={() => compose({ template: "makerWelcome", to: invite.email, about: "maker-access", values: { firstName: "there", business: invite.listings[0]?.name || "your business", email: invite.email, note: "" } })}><Mail size={14} /> Welcome email</button>
      <button className="danger-button compact-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove maker portal access for ${invite.email}? Their listings stay on the site.`)) remove.mutate({ email: invite.email }); }}><Trash2 size={14} /> Remove access</button></div>
    </div>) : <div className="admin-empty"><h3>No makers invited yet</h3><p>Click Add new maker to let someone into the maker portal.</p></div>}</div>
  </section>;
}
