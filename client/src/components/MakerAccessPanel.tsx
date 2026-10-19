import { Copy, Loader2, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Owner dashboard tab: the guest list of maker emails allowed into the maker portal. */
export default function MakerAccessPanel() {
  const utils = trpc.useUtils();
  const invites = trpc.adminPortal.makerInvites.useQuery();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const add = trpc.adminPortal.addMakerInvites.useMutation({ onSuccess: async ({ added }) => { setText(""); setMessage(`${added} email${added === 1 ? "" : "s"} can now sign in to the maker portal.`); await utils.adminPortal.makerInvites.invalidate(); }, onError: (error) => setMessage(error.message) });
  const remove = trpc.adminPortal.removeMakerInvite.useMutation({ onSuccess: async () => { setMessage("Access removed."); await utils.adminPortal.makerInvites.invalidate(); }, onError: (error) => setMessage(error.message) });
  const portalUrl = `${window.location.origin}/maker-portal`;
  const inviteText = `Hi! You're invited to set up your maker profile at The Cannery Marketplace. Go to ${portalUrl}, enter this email address, and we'll email you a one time code to sign in. No password needed.`;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const entries = text.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean);
    const invalid = entries.filter((value) => !EMAIL.test(value));
    if (!entries.length) { setMessage("Enter at least one email address."); return; }
    if (invalid.length) { setMessage(`These do not look like email addresses: ${invalid.join(", ")}`); return; }
    add.mutate({ emails: entries });
  }

  return <section className="admin-content"><div className="admin-section-heading"><div><p className="eyebrow">Maker portal access</p><h2>Invite makers</h2><p>Add a maker's email so they can sign in to the maker portal and manage their profile. They sign in with a one time code sent to that email. Remove an email to take their access away.</p></div></div>
    <form className="secure-admin-card" onSubmit={submit}><label>Maker emails (one per line, or separated by commas)<textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder={"maker@example.com\nanother.maker@example.com"} /></label><div className="review-actions"><button className="button-primary" type="submit" disabled={add.isPending}>{add.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add to guest list</button><button className="button-plain" type="button" onClick={() => { void navigator.clipboard?.writeText(inviteText).then(() => setMessage("Invitation message copied. Paste it into an email or text to the maker."), () => setMessage(inviteText)); }}><Copy size={14} /> Copy invitation message</button></div>{message && <p className="admin-result">{message}</p>}</form>
    <div className="secure-vendor-table">{invites.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : (invites.data || []).length ? (invites.data || []).map((invite) => <div key={invite.email}><span>{invite.email.slice(0, 2).toUpperCase()}</span><div><strong>{invite.email}</strong><small>{invite.lastSignedIn ? `Last signed in ${new Date(invite.lastSignedIn).toLocaleDateString()}` : "Has not signed in yet"} · added by {invite.invitedBy}</small></div><button className="danger-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove maker portal access for ${invite.email}? Their published profile stays on the site.`)) remove.mutate({ email: invite.email }); }}><Trash2 size={14} /> Remove</button></div>) : <div className="admin-empty"><h3>No makers invited yet</h3><p>Add a maker's email above to let them into the maker portal.</p></div>}</div>
  </section>;
}
