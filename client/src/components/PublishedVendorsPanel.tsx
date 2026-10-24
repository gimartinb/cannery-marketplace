import { Mail, Send, UserPlus, CheckSquare, ExternalLink, Eye, EyeOff, Loader2, Pencil, Save, Search, Star, StarOff, UserCheck, UserMinus, X } from "lucide-react";
import { useMemo, useState } from "react";
import ListingFields, { toListingValues, uploadListingPhoto, type ListingValues } from "@/components/ListingFields";
import { notifyError, notifySuccess } from "@/lib/notify";
import { welcomeEmailLink } from "@/lib/makerEmails";
import { trpc } from "@/lib/trpc";

type Vendor = Parameters<typeof toListingValues>[0] & { id: number; loginEmail: string | null };

/** Owner dashboard tab: every listing, with visibility, direct editing, and who can sign in to edit it. */
export default function PublishedVendorsPanel({ vendors, onRefresh }: { vendors: Vendor[]; onRefresh: () => Promise<unknown> }) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id: number; values: ListingValues } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkEmail, setBulkEmail] = useState("");
  const aiWriter = trpc.adminPortal.aiWrite.useMutation();
  // One step invite from a listing row: ties the email to the listing and gives it maker portal access.
  const [inviting, setInviting] = useState<{ id: number; email: string } | null>(null);
  const invite = trpc.adminPortal.assignListing.useMutation({
    onSuccess: async (row, input) => {
      const vendor = vendors.find((item) => item.id === input.profileId);
      notifySuccess(`${row.name} is ready for ${input.email}`, { description: "They can sign in to the maker portal now. Send the welcome email so they know how.", link: { label: "Send welcome email", href: welcomeEmailLink({ email: input.email, businessName: row.name, fullName: vendor?.ownerName || "" }) } });
      setInviting(null);
      await refreshAll();
    },
    onError: (error) => notifyError(error, "Maker not invited"),
  });
  const refreshAll = async () => { await Promise.all([onRefresh(), utils.directory.invalidate(), utils.adminPortal.makerInvites.invalidate()]); };
  const toggle = trpc.adminPortal.setVendorActive.useMutation({
    onSuccess: async (_result, input) => { notifySuccess(input.active ? "Listing is visible on the site" : "Listing hidden from the site"); await refreshAll(); },
    onError: (error) => notifyError(error, "Visibility not changed"),
  });
  const save = trpc.adminPortal.updateVendor.useMutation({
    onSuccess: async (result, input) => {
      notifySuccess(`${input.name} saved`, {
        description: input.loginEmail ? `${input.loginEmail} can sign in to the maker portal to edit this listing.` : "Changes are live now.",
        link: { label: "View listing", href: `/vendors/${result.slug}` },
      });
      setEditing(null);
      await refreshAll();
    },
    onError: (error) => notifyError(error, "Listing not saved"),
  });

  const bulk = trpc.adminPortal.bulkUpdateVendors.useMutation({
    onSuccess: async (result, input) => {
      const names = result.listings.map((listing) => listing.name).join(", ");
      const what = input.loginEmail !== undefined ? (input.loginEmail ? `connected to ${input.loginEmail}` : "disconnected from their login email") : input.active !== undefined ? (input.active ? "visible on the site" : "hidden from the site") : input.featured ? "featured on the home page" : "no longer featured";
      notifySuccess(`${result.updated} listing${result.updated === 1 ? "" : "s"} ${what}`, { description: names, link: input.loginEmail ? undefined : { label: "View makers page", href: "/vendors" } });
      setSelected(new Set()); setBulkEmail("");
      await refreshAll();
    },
    onError: (error) => notifyError(error, "Listings not updated"),
  });

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? vendors.filter((vendor) => [vendor.name, vendor.category, vendor.slug, vendor.loginEmail || ""].some((field) => field.toLowerCase().includes(term))) : vendors;
  }, [vendors, query]);

  const allShownSelected = shown.length > 0 && shown.every((vendor) => selected.has(vendor.id));
  const toggleOne = (id: number) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleShown = () => setSelected((current) => { const next = new Set(current); shown.forEach((vendor) => (allShownSelected ? next.delete(vendor.id) : next.add(vendor.id))); return next; });
  const ids = Array.from(selected);
  const selectedNames = vendors.filter((vendor) => selected.has(vendor.id)).map((vendor) => vendor.name);

  function assignEmail(event: React.FormEvent) {
    event.preventDefault();
    const email = bulkEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) { notifyError("Enter a valid email address, like name@example.com.", "Check the email"); return; }
    const moving = vendors.filter((vendor) => selected.has(vendor.id) && vendor.loginEmail && vendor.loginEmail !== email);
    if (moving.length && !window.confirm(`${moving.map((vendor) => `${vendor.name} (now ${vendor.loginEmail})`).join(", ")} will move to ${email}. Continue?`)) return;
    bulk.mutate({ ids, loginEmail: email });
  }

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Approved public content</p><h2>Published vendors</h2><p>Edit any listing on a maker's behalf, hide or show it, and set the login email the maker uses to edit it in the maker portal. Tick several listings to update them together.</p></div></div>
    {editing && <form className="secure-admin-card" onSubmit={(event) => { event.preventDefault(); save.mutate({ id: editing.id, ...editing.values, loginEmail: editing.values.loginEmail || "" }); }}>
      <div className="secure-card-heading"><div><span className="review-status">Owner edit, goes live when saved</span><h3>Edit {editing.values.name || "listing"}</h3></div><button className="button-plain compact-button" type="button" onClick={() => setEditing(null)}><X size={13} /> Close</button></div>
      <ListingFields ownerControls aiWrite={async (request) => (await aiWriter.mutateAsync(request)).suggestion} value={editing.values} onChange={(values) => setEditing({ ...editing, values })} upload={(file) => uploadListingPhoto("/api/admin/upload?purpose=vendor", file)} />
      <div className="review-actions"><button className="button-primary" type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save and publish</button><button className="button-plain" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    {!editing && <>
      {selected.size > 0 && <div className="bulk-bar" role="region" aria-label="Bulk update">
        <div className="bulk-bar-head"><strong>{selected.size} selected</strong><span>{selectedNames.slice(0, 4).join(", ")}{selectedNames.length > 4 ? ` and ${selectedNames.length - 4} more` : ""}</span><button className="button-plain compact-button" type="button" onClick={() => setSelected(new Set())}><X size={13} /> Clear selection</button></div>
        <form className="bulk-bar-email" onSubmit={assignEmail}><label>Login email for the selected listings<input type="email" value={bulkEmail} onChange={(event) => setBulkEmail(event.target.value)} placeholder="maker@example.com" /></label><button className="button-primary" type="submit" disabled={bulk.isPending}>{bulk.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Assign email</button></form>
        <div className="review-actions">
          <button className="button-plain" type="button" disabled={bulk.isPending} onClick={() => bulk.mutate({ ids, active: true })}><Eye size={14} /> Show on site</button>
          <button className="button-plain" type="button" disabled={bulk.isPending} onClick={() => bulk.mutate({ ids, active: false })}><EyeOff size={14} /> Hide from site</button>
          <button className="button-plain" type="button" disabled={bulk.isPending} onClick={() => bulk.mutate({ ids, featured: true })}><Star size={14} /> Feature</button>
          <button className="button-plain" type="button" disabled={bulk.isPending} onClick={() => bulk.mutate({ ids, featured: false })}><StarOff size={14} /> Unfeature</button>
          <button className="danger-button" type="button" disabled={bulk.isPending} onClick={() => { if (window.confirm(`Remove the login email from ${selected.size} listing${selected.size === 1 ? "" : "s"}? The listings stay on the site, but no maker can edit them until you assign an email.`)) bulk.mutate({ ids, loginEmail: "" }); }}><UserMinus size={14} /> Remove login email</button>
        </div>
      </div>}
      <label className="admin-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, category, or login email" aria-label="Search listings" /></label>
      {shown.length > 0 && <label className="select-all"><input type="checkbox" checked={allShownSelected} onChange={toggleShown} /> <CheckSquare size={14} /> {allShownSelected ? "Unselect" : "Select"} all {shown.length}{query ? " matching" : ""} listing{shown.length === 1 ? "" : "s"}</label>}
      <div className="secure-vendor-table selectable-table">{shown.length ? shown.map((vendor) => <div key={vendor.id} className={selected.has(vendor.id) ? "is-selected" : undefined}>
        <input type="checkbox" className="row-select" checked={selected.has(vendor.id)} onChange={() => toggleOne(vendor.id)} aria-label={`Select ${vendor.name}`} />
        <span>{vendor.coverImageUrl ? <img src={vendor.coverImageUrl} alt="" /> : vendor.name.slice(0, 2).toUpperCase()}</span>
        <div><strong>{vendor.name}</strong><small>{vendor.category} · /vendors/{vendor.slug}</small><small className={vendor.loginEmail ? "login-email" : "login-email missing"}><UserCheck size={12} /> {vendor.loginEmail ? `Login: ${vendor.loginEmail}` : "No login email yet"}</small>
          {inviting?.id === vendor.id && <form className="row-invite" onSubmit={(event) => { event.preventDefault(); const email = inviting.email.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) { notifyError("Enter a valid email address, like name@example.com.", "Check the email"); return; } invite.mutate({ profileId: vendor.id, email }); }}>
            <label>Maker's email<input type="email" autoFocus value={inviting.email} onChange={(event) => setInviting({ ...inviting, email: event.target.value })} placeholder="maker@example.com" /></label>
            <div className="review-actions"><button className="button-primary compact-button" type="submit" disabled={invite.isPending}>{invite.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Invite</button><button className="button-plain compact-button" type="button" onClick={() => setInviting(null)}>Cancel</button></div>
          </form>}</div>
        <div className="review-actions">
          <label className="toggle-label"><input type="checkbox" checked={vendor.active} disabled={toggle.isPending} onChange={(event) => toggle.mutate({ id: vendor.id, active: event.target.checked })} /><span className="fake-toggle" /> {vendor.active ? "Public" : "Hidden"}</label>
          {vendor.loginEmail
            ? <a className="button-plain" href={welcomeEmailLink({ email: vendor.loginEmail, businessName: vendor.name, fullName: vendor.ownerName || "" })}><Mail size={14} /> Welcome email</a>
            : <button className="button-primary" type="button" onClick={() => setInviting({ id: vendor.id, email: vendor.contactEmail || "" })}><UserPlus size={14} /> Invite maker</button>}
          <button className="button-plain" type="button" onClick={() => setEditing({ id: vendor.id, values: toListingValues(vendor, vendor.id) })}><Pencil size={14} /> Edit</button>
          {vendor.active && <a className="button-plain" href={`/vendors/${vendor.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View</a>}
        </div>
      </div>) : <div className="admin-empty"><h3>{vendors.length ? "No listings match your search" : "No listings yet"}</h3><p>{vendors.length ? "Try a different word." : "Approve a maker submission or use the Vendor import tab."}</p></div>}</div>
    </>}
  </section>;
}
