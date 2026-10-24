import { Building2, CreditCard, Eye, Gift, Loader2, Mail, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import AiWriteHelper from "@/components/AiWriteHelper";
import ImageUploadButton from "@/components/ImageUploadButton";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";
import { CHECKOUT_PROVIDERS, DEFAULT_COMMERCE, GIFT_REQUEST_STATUSES, type CommerceSettings, type GiftBoxInput } from "@shared/gifts";
import { useEmailComposer } from "@/components/EmailComposer";

type Box = GiftBoxInput & { id: number; slug: string };
const EMPTY_BOX: GiftBoxInput = { name: "", price: "", description: "", details: "", imageUrl: "", checkoutUrl: "", externalItemId: "", externalVariationId: "", corporateOnly: false, active: true, displayOrder: 100 };
const STATUS_TEXT: Record<(typeof GIFT_REQUEST_STATUSES)[number], string> = { new: "New", quoted: "Quote sent", won: "Ordered", lost: "Did not order", archived: "Archived" };

function VisibilityCard({ enabled, onChanged }: { enabled: boolean; onChanged: () => Promise<unknown> }) {
  const update = trpc.adminPortal.setGiftBoxesEnabled.useMutation({ onSuccess: async (_result, input) => { notifySuccess(input.enabled ? "Gift pages are on" : "Gift pages are hidden", { link: input.enabled ? { label: "View gift boxes", href: "/gifts" } : undefined }); await onChanged(); }, onError: (error) => notifyError(error, "Setting not changed") });
  return <div className="secure-admin-card feature-setting-card"><div><Gift size={23} /><div><strong>Show gift boxes and corporate gifting on the website</strong><p>While off, the Gifts menu link, the gift box page, and the corporate request page stay hidden, and nothing is lost. Use Preview to see them as a visitor would.</p></div></div><div className="review-actions"><a className="button-plain compact-button" href="/gifts?preview=drafts" target="_blank" rel="noreferrer"><Eye size={13} /> Preview</a><label className="toggle-label large-toggle"><input type="checkbox" checked={enabled} onChange={(event) => update.mutate({ enabled: event.target.checked })} /><span className="fake-toggle" /> {enabled ? "On" : "Hidden"}</label></div></div>;
}

function CheckoutCard({ initial, squareApiReady, hasSquareToken, onSaved }: { initial: CommerceSettings; squareApiReady: boolean; hasSquareToken: boolean; onSaved: () => Promise<unknown> }) {
  const [settings, setSettings] = useState<CommerceSettings>(initial);
  const save = trpc.adminPortal.saveCommerceSettings.useMutation({ onSuccess: async () => { notifySuccess("Checkout settings saved"); await onSaved(); }, onError: (error) => notifyError(error, "Settings not saved") });
  const set = <K extends keyof CommerceSettings>(key: K, value: CommerceSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const provider = CHECKOUT_PROVIDERS.find((item) => item.id === settings.provider)!;
  return <div className="secure-admin-card gift-settings-card">
    <h3><CreditCard size={17} /> Checkout</h3>
    <p className="form-hint">Payments happen on your point of sale's own secure page, never on this website. Today that is Square. If the store moves to a different system later, change it here and paste the new links.</p>
    <div className="choice-grid">{CHECKOUT_PROVIDERS.map((item) => <label className="choice" key={item.id}><input type="radio" name="checkout-provider" checked={settings.provider === item.id} onChange={() => set("provider", item.id)} /> {item.label}</label>)}</div>
    <p className="form-hint">{provider.help}</p>
    {settings.provider !== "none" && <div className="form-grid">
      <label>Name shown to shoppers<input value={settings.providerName} maxLength={40} placeholder={settings.provider.startsWith("square") ? "Square" : "Shopify, Clover, Toast…"} onChange={(event) => set("providerName", event.target.value)} /></label>
      {(settings.provider === "square_online" || settings.provider === "other") && <label>Online store address<input value={settings.storeUrl} maxLength={300} placeholder="https://your-store.square.site" onChange={(event) => set("storeUrl", event.target.value)} /></label>}
    </div>}
    <label>Pickup or shipping note for shoppers (optional)<input value={settings.pickupNote} maxLength={300} placeholder="Local pickup at the marketplace during open hours." onChange={(event) => set("pickupNote", event.target.value)} /></label>
    <details className="gift-phase2"><summary>Phase 2: connect Square directly (not active yet)</summary>
      <p className="form-hint">Later, the site can create Square checkouts and invoices by itself. It needs the Square location that sells gift boxes and a Square access token. The token is a password, so it is never typed here: a developer adds it in Cloudflare as the secret SQUARE_ACCESS_TOKEN.</p>
      <div className="form-grid">
        <label>Square location id<input value={settings.squareLocationId} maxLength={64} placeholder="L1234ABCD" onChange={(event) => set("squareLocationId", event.target.value.replace(/[^A-Za-z0-9]/g, ""))} /></label>
        <label>Square mode<select value={settings.squareEnvironment} onChange={(event) => set("squareEnvironment", event.target.value as CommerceSettings["squareEnvironment"])}><option value="sandbox">Test (sandbox)</option><option value="production">Live</option></select></label>
      </div>
      <p className="form-hint">Status: {squareApiReady ? "Ready for phase 2." : hasSquareToken ? "Token added. Add the location id." : "Not connected. Payment links still work without this."}</p>
    </details>
    <div className="review-actions"><button className="button-primary" type="button" disabled={save.isPending} onClick={() => save.mutate(settings)}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save checkout settings</button></div>
  </div>;
}

function BoxEditor({ box, provider, onDone }: { box: GiftBoxInput; provider: CommerceSettings["provider"]; onDone: () => Promise<unknown> | void }) {
  const [draft, setDraft] = useState<GiftBoxInput>(box);
  const [uploading, setUploading] = useState(false);
  const aiWriter = trpc.adminPortal.aiWrite.useMutation();
  const save = trpc.adminPortal.saveGiftBox.useMutation({ onSuccess: async () => { notifySuccess(draft.id ? "Gift box saved" : "Gift box added"); await onDone(); }, onError: (error) => notifyError(error, "Gift box not saved") });
  const set = <K extends keyof GiftBoxInput>(key: K, value: GiftBoxInput[K]) => setDraft((current) => ({ ...current, [key]: value }));
  async function upload(files: File[]) {
    const file = files[0]; if (!file) return;
    setUploading(true);
    try {
      const response = await fetch("/api/admin/upload?purpose=gift", { method: "POST", headers: { "Content-Type": file.type }, body: file, credentials: "include" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "The photo did not upload. Your sign in may have expired. Reload the page and try again.");
      set("imageUrl", body.url);
      notifySuccess("Photo ready", { description: "Save the box to use it." });
    } catch (error) { notifyError(error, "Photo not uploaded"); } finally { setUploading(false); }
  }
  return <div className="secure-admin-card gift-box-editor">
    <div className="form-grid">
      <label>Box name *<input value={draft.name} maxLength={80} onChange={(event) => set("name", event.target.value)} /></label>
      <label>Price *<input value={draft.price} maxLength={20} placeholder="$72" onChange={(event) => set("price", event.target.value)} /></label>
    </div>
    <label>Description *<textarea rows={3} value={draft.description} maxLength={400} onChange={(event) => set("description", event.target.value)} /></label>
    <AiWriteHelper field="giftBox" text={draft.description} context={{ name: draft.name, title: draft.details }} maxChars={400} write={async (request) => (await aiWriter.mutateAsync(request)).suggestion} onUse={(text) => set("description", text)} notesHint="Who the box is for and what is inside, for example a candle, local honey, and a handmade card" />
    <label>What is inside (short line)<input value={draft.details} maxLength={160} placeholder="Candle, honey, and a handwritten note" onChange={(event) => set("details", event.target.value)} /></label>
    <div className="review-actions">{draft.imageUrl && <img className="gift-editor-photo" src={draft.imageUrl} alt="" />}<ImageUploadButton spot="gift-box" busy={uploading} onFiles={upload}>{draft.imageUrl ? "Change photo" : "Add photo"}</ImageUploadButton>{draft.imageUrl && <button className="button-plain" type="button" onClick={() => set("imageUrl", "")}><X size={14} /> Remove photo</button>}</div>
    <label>Checkout link{provider === "none" ? " (choose a checkout above first)" : ""}<input value={draft.checkoutUrl} maxLength={500} inputMode="url" placeholder={provider === "square_online" ? "https://your-store.square.site/product/…" : "https://square.link/u/…"} onChange={(event) => set("checkoutUrl", event.target.value.trim())} /></label>
    <details className="gift-phase2"><summary>Point of sale catalog ids (phase 2, optional)</summary>
      <p className="form-hint">In Square, open the item and copy its item id and variation id. They let phase 2 keep prices and stock in sync. Any other system's ids work too.</p>
      <div className="form-grid"><label>Item id<input value={draft.externalItemId} maxLength={64} onChange={(event) => set("externalItemId", event.target.value.trim())} /></label><label>Variation id<input value={draft.externalVariationId} maxLength={64} onChange={(event) => set("externalVariationId", event.target.value.trim())} /></label></div>
    </details>
    <div className="form-grid">
      <label className="toggle-label"><input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} /><span className="fake-toggle" /> Show this box</label>
      <label className="toggle-label"><input type="checkbox" checked={draft.corporateOnly} onChange={(event) => set("corporateOnly", event.target.checked)} /><span className="fake-toggle" /> Corporate only (offered on the request form, not in the shop)</label>
      <label>Display order<input type="number" min={0} max={999} value={draft.displayOrder} onChange={(event) => set("displayOrder", Number(event.target.value) || 0)} /></label>
    </div>
    <div className="review-actions"><button className="button-primary" type="button" disabled={save.isPending} onClick={() => save.mutate(draft)}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {draft.id ? "Save box" : "Add box"}</button><button className="button-plain" type="button" onClick={() => void onDone()}><X size={14} /> Cancel</button></div>
  </div>;
}

function RequestsList() {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.giftRequests.useQuery();
  const compose = useEmailComposer();
  const [edits, setEdits] = useState<Record<number, { status: (typeof GIFT_REQUEST_STATUSES)[number]; adminNote: string; quoteAmount: string; externalOrderId: string }>>({});
  const update = trpc.adminPortal.updateGiftRequest.useMutation({ onSuccess: async () => { notifySuccess("Request updated"); await utils.adminPortal.giftRequests.invalidate(); }, onError: (error) => notifyError(error, "Request not updated") });
  const rows = list.data ?? [];
  if (list.isLoading) return <div className="admin-empty"><Loader2 className="animate-spin" /></div>;
  if (!rows.length) return <div className="admin-empty"><Building2 size={20} /><h3>No corporate requests yet</h3><p>Requests from the corporate gifting page will appear here, and you also get an email for each one.</p></div>;
  return <div className="secure-review-list">{rows.map((row) => {
    const edit = edits[row.id] ?? { status: row.status, adminNote: row.adminNote ?? "", quoteAmount: row.quoteAmount ?? "", externalOrderId: row.externalOrderId ?? "" };
    const setEdit = (change: Partial<typeof edit>) => setEdits((current) => ({ ...current, [row.id]: { ...edit, ...change } }));
    const replyEmail = () => compose({ template: "giftReply", to: row.email, about: `gift:${row.id}`, values: { firstName: row.contactName.split(" ")[0] || "there", company: row.company, quantity: row.quantity, quote: edit.quoteAmount ? `Our quote: ${edit.quoteAmount}` : "", note: "" } });
    return <article className="secure-admin-card application-card" key={row.id}>
      <div className="secure-card-heading"><div><span className={`listing-status listing-status-${row.status === "new" ? "pending" : row.status === "won" ? "published" : "muted"}`}>{STATUS_TEXT[row.status]}</span><h3>{row.company}</h3><p>{row.contactName} · {row.quantity} gifts · {row.budgetPerGift} each · received {new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div></div>
      <dl className="application-details">
        <div><dt>Needed by</dt><dd>{row.neededBy ? new Date(`${row.neededBy}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Flexible"}</dd></div>
        <div><dt>Delivery</dt><dd>{row.deliveryMethod}{row.destinations ? `: ${row.destinations}` : ""}</dd></div>
        {row.startingBox && <div><dt>Start from</dt><dd>{row.startingBox}</dd></div>}
        <div><dt>Custom box</dt><dd>{row.customBox ? [row.preferredCategories.join(", "), row.preferredMakers].filter(Boolean).join(". Makers: ") || "Yes" : "No"}</dd></div>
        <div><dt>Branding</dt><dd>{row.branding.join(", ")}{row.logoLink ? <> · <a href={row.logoLink} target="_blank" rel="noreferrer">Logo link</a></> : ""}</dd></div>
        {row.cardMessage && <div><dt>Card message</dt><dd>{row.cardMessage}</dd></div>}
        <div><dt>Occasion</dt><dd>{row.message}</dd></div>
        <div><dt>Contact</dt><dd><a href={`mailto:${row.email}`}>{row.email}</a>{row.phone ? ` · ${row.phone}` : ""}</dd></div>
      </dl>
      <div className="form-grid">
        <label>Status<select value={edit.status} onChange={(event) => setEdit({ status: event.target.value as typeof edit.status })}>{GIFT_REQUEST_STATUSES.map((status) => <option key={status} value={status}>{STATUS_TEXT[status]}</option>)}</select></label>
        <label>Quote<input value={edit.quoteAmount} maxLength={40} placeholder="$1,850 for 25 boxes" onChange={(event) => setEdit({ quoteAmount: event.target.value })} /></label>
        <label>Square invoice or order number<input value={edit.externalOrderId} maxLength={64} placeholder="From Square, once invoiced" onChange={(event) => setEdit({ externalOrderId: event.target.value })} /></label>
      </div>
      <label>Private note<textarea rows={2} value={edit.adminNote} maxLength={1200} onChange={(event) => setEdit({ adminNote: event.target.value })} /></label>
      <div className="review-actions"><button className="button-primary" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, ...edit })}><Save size={14} /> Save</button><button className="button-plain" type="button" onClick={replyEmail}><Mail size={14} /> Reply by email</button></div>
    </article>;
  })}</div>;
}

/** Owner dashboard tab: gift box visibility, checkout setup, the boxes, and corporate requests. */
export default function GiftsPanel({ enabled, onRefresh }: { enabled: boolean; onRefresh: () => Promise<unknown> }) {
  const utils = trpc.useUtils();
  const data = trpc.adminPortal.giftBoxes.useQuery();
  const remove = trpc.adminPortal.deleteGiftBox.useMutation({ onSuccess: async () => { notifySuccess("Gift box deleted"); await utils.adminPortal.giftBoxes.invalidate(); }, onError: (error) => notifyError(error, "Gift box not deleted") });
  const [editing, setEditing] = useState<GiftBoxInput | null>(null);
  const [view, setView] = useState<"boxes" | "requests">("boxes");
  const requests = trpc.adminPortal.giftRequests.useQuery();
  const newRequests = (requests.data ?? []).filter((row) => row.status === "new").length;
  const refreshBoxes = async () => { setEditing(null); await utils.adminPortal.giftBoxes.invalidate(); };
  const settings = data.data?.settings ?? DEFAULT_COMMERCE;

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Hidden until you turn it on</p><h2>Gifts and corporate</h2><p>Set up gift boxes and corporate gifting now, and show them when you are ready. The words on these pages are in Site text.</p></div></div>
    <VisibilityCard enabled={enabled} onChanged={onRefresh} />
    <div className="application-filters" role="tablist" aria-label="Gifts sections"><button type="button" role="tab" aria-selected={view === "boxes"} className={view === "boxes" ? "active" : ""} onClick={() => setView("boxes")}>Gift boxes and checkout</button><button type="button" role="tab" aria-selected={view === "requests"} className={view === "requests" ? "active" : ""} onClick={() => setView("requests")}>Corporate requests {newRequests > 0 && <span>{newRequests}</span>}</button></div>
    {view === "requests" ? <RequestsList /> : data.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : <>
      <CheckoutCard key={JSON.stringify(settings)} initial={settings} squareApiReady={data.data?.squareApiReady ?? false} hasSquareToken={data.data?.hasSquareToken ?? false} onSaved={() => utils.adminPortal.giftBoxes.invalidate()} />
      <div className="admin-section-heading compact"><div><h3>Gift boxes</h3></div>{!editing && <button className="button-primary" type="button" onClick={() => setEditing(EMPTY_BOX)}><Plus size={14} /> Add a gift box</button>}</div>
      {editing && !editing.id && <BoxEditor box={editing} provider={settings.provider} onDone={refreshBoxes} />}
      <div className="secure-review-list">{(data.data?.boxes ?? []).map((box) => editing?.id === box.id
        ? <BoxEditor key={box.id} box={editing} provider={settings.provider} onDone={refreshBoxes} />
        : <article className="secure-admin-card gift-box-row" key={box.id}>
          {box.imageUrl ? <img src={box.imageUrl} alt="" /> : <span className="gift-box-row-empty"><Gift size={18} /></span>}
          <div><strong>{box.name} · {box.price}</strong><p>{box.description}</p><small>{[!box.active && "Hidden", box.corporateOnly && "Corporate only", box.checkoutUrl ? "Checkout link set" : "No checkout link", box.externalItemId && "Catalog id set"].filter(Boolean).join(" · ")}</small></div>
          <div className="review-actions"><button className="button-plain compact-button" type="button" onClick={() => setEditing({ ...EMPTY_BOX, ...box, details: box.details ?? "", imageUrl: box.imageUrl ?? "", checkoutUrl: box.checkoutUrl ?? "", externalItemId: box.externalItemId ?? "", externalVariationId: box.externalVariationId ?? "" } as Box)}><Pencil size={13} /> Edit</button><button className="danger-button compact-button" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete the ${box.name} gift box? This cannot be undone. To keep it for later, edit it and turn off Show this box.`)) remove.mutate({ id: box.id }); }}><Trash2 size={13} /> Delete</button></div>
        </article>)}</div>
    </>}
  </section>;
}
