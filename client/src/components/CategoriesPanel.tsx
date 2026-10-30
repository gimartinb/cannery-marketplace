import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";

type Category = { id: number; name: string; listings: number };

/**
 * Owner dashboard tab: the category list makers pick from. Renaming updates every
 * listing that uses it; deleting moves those listings to another category first.
 */
export default function CategoriesPanel() {
  const utils = trpc.useUtils();
  const list = trpc.adminPortal.categories.useQuery();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: number; moveTo: string } | null>(null);
  const refresh = () => Promise.all([utils.adminPortal.categories.invalidate(), utils.directory.invalidate(), utils.adminPortal.dashboard.invalidate()]);
  const add = trpc.adminPortal.addCategory.useMutation({ onSuccess: async (result) => { notifySuccess(`"${result.name}" added`, { description: "Makers can choose it now." }); setNewName(""); await refresh(); }, onError: (error) => notifyError(error, "Category not added") });
  const adopt = trpc.adminPortal.adoptCategory.useMutation({ onSuccess: async (result) => { notifySuccess(`"${result.name}" added to the list`); await refresh(); }, onError: (error) => notifyError(error, "Category not added") });
  const rename = trpc.adminPortal.renameCategory.useMutation({ onSuccess: async (result) => { notifySuccess(`Renamed to "${result.name}"`, { description: result.moved ? `${result.moved} listing${result.moved === 1 ? " was" : "s were"} updated too.` : undefined }); setEditing(null); await refresh(); }, onError: (error) => notifyError(error, "Category not renamed") });
  const remove = trpc.adminPortal.deleteCategory.useMutation({ onSuccess: async (result) => { notifySuccess("Category deleted", { description: result.moved && result.to ? `${result.moved} listing${result.moved === 1 ? " moved" : "s moved"} to "${result.to}".` : undefined }); setDeleting(null); await refresh(); }, onError: (error) => notifyError(error, "Category not deleted") });
  const reorder = trpc.adminPortal.reorderCategories.useMutation({ onSuccess: refresh, onError: (error) => notifyError(error, "Order not saved") });
  const rows: Category[] = list.data?.categories ?? [];
  const busy = add.isPending || rename.isPending || remove.isPending || reorder.isPending;

  function move(index: number, by: number) {
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    reorder.mutate({ ids: next.map((row) => row.id) });
  }

  return <section className="admin-content">
    <div className="admin-section-heading"><div><p className="eyebrow">Maker categories</p><h2>Categories</h2><p>The list makers choose from in the maker portal, shown in this order, with "Other" always last. Renaming a category updates every listing that uses it. Deleting one moves its listings to the category you choose.</p></div></div>
    <form className="secure-admin-card category-add" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) add.mutate({ name: newName }); }}>
      <label>Add a category<input value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} placeholder="Leather Goods" /></label>
      <button className="button-primary" type="submit" disabled={busy || !newName.trim()}>{add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add category</button>
    </form>
    {list.isLoading ? <div className="admin-empty"><Loader2 className="animate-spin" /></div> : <div className="secure-vendor-table category-table">{rows.map((row, index) => <div key={row.id}>
      <span><Tags size={15} /></span>
      <div>
        {editing?.id === row.id
          ? <form className="category-rename" onSubmit={(event) => { event.preventDefault(); rename.mutate(editing); }}><input autoFocus value={editing.name} maxLength={40} onChange={(event) => setEditing({ ...editing, name: event.target.value })} aria-label={`New name for ${row.name}`} /><button className="button-primary compact-button" type="submit" disabled={busy}><Check size={13} /> Save</button><button className="button-plain compact-button" type="button" onClick={() => setEditing(null)}><X size={13} /> Cancel</button></form>
          : <><strong>{row.name}</strong><small>{row.listings ? `${row.listings} listing${row.listings === 1 ? "" : "s"}` : "No listings yet"}</small></>}
        {deleting?.id === row.id && <div className="category-delete">
          {row.listings > 0 && <label>Move its {row.listings} listing{row.listings === 1 ? "" : "s"} to<select value={deleting.moveTo} onChange={(event) => setDeleting({ ...deleting, moveTo: event.target.value })}><option value="">Choose a category</option>{rows.filter((other) => other.id !== row.id).map((other) => <option key={other.id} value={other.name}>{other.name}</option>)}</select></label>}
          <div className="review-actions"><button className="danger-button compact-button" type="button" disabled={busy || (row.listings > 0 && !deleting.moveTo)} onClick={() => remove.mutate(deleting)}><Trash2 size={13} /> Delete "{row.name}"</button><button className="button-plain compact-button" type="button" onClick={() => setDeleting(null)}>Cancel</button></div>
        </div>}
      </div>
      {editing?.id !== row.id && deleting?.id !== row.id && <div className="category-actions">
        <button className="button-plain compact-button icon-only" type="button" aria-label={`Move ${row.name} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={13} /></button>
        <button className="button-plain compact-button icon-only" type="button" aria-label={`Move ${row.name} down`} disabled={busy || index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown size={13} /></button>
        <button className="button-plain compact-button" type="button" disabled={busy} onClick={() => { setDeleting(null); setEditing({ id: row.id, name: row.name }); }}><Pencil size={13} /> Rename</button>
        <button className="danger-button compact-button" type="button" disabled={busy} onClick={() => { setEditing(null); setDeleting({ id: row.id, moveTo: "" }); }}><Trash2 size={13} /> Delete</button>
      </div>}
    </div>)}
      <div className="category-other"><span><Tags size={15} /></span><div><strong>Other</strong><small>Built in and always last. Makers who choose it type their own category, which you can keep or change in the Review queue.</small></div></div>
    </div>}
    {(list.data?.unlisted ?? []).length > 0 && <div className="secure-admin-card category-unlisted">
      <h3>In use but not on the list</h3>
      <p className="form-hint">Categories makers typed themselves. Add one to the list so other makers can choose it too.</p>
      <div className="listing-chips">{list.data!.unlisted.map((item) => <span className="listing-chip" key={item.name}>{item.name} ({item.listings})<button type="button" aria-label={`Add ${item.name} to the list`} disabled={adopt.isPending} onClick={() => adopt.mutate({ name: item.name })}><Plus size={12} /></button></span>)}</div>
    </div>}
  </section>;
}
