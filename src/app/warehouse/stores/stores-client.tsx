"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { warehouseStores, warehouseCreateStore, warehouseUpdateStore, type WarehouseStore } from "@/app/api/warehouse.api";
import { errorMessage } from "../warehouse-shared";

export function StoresClient({ initial, admin }: { initial: WarehouseStore[]; admin: boolean }) {
  const [stores, setStores] = useState(initial), [editing, setEditing] = useState<WarehouseStore | null>(null);
  const [open, setOpen] = useState(false), [name, setName] = useState(""), [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  async function refresh() {
    setBusy(true); setError("");
    try { setStores(await warehouseStores()); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  function edit(store: WarehouseStore | null) {
    setEditing(store); setName(store?.name ?? ""); setActive(store?.isActive ?? true); setError(""); setOpen(true);
  }
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (editing) await warehouseUpdateStore(editing, name.trim(), active);
      else await warehouseCreateStore(name.trim());
      setOpen(false); setStores(await warehouseStores());
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); lock.current = false; }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Stores</h2><p className="mt-1 text-sm text-muted-foreground">Internal locations at your warehouse. Create as many as you need; the warehouse pickup address does not change.</p></div>
        <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{admin && <Button disabled={busy} onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" />New store</Button>}</div>
      </div>
      {error && !open && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stores.map((store) => (
          <section key={store.id} className="space-y-4 rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3"><h3 className="break-words font-semibold">{store.name}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${store.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{store.isActive ? "Active" : "Inactive"}</span></div>
            <p className="text-3xl font-bold">{store.onHand.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">physical parts</span></p>
            <p className="text-xs text-muted-foreground">{store.units} units with stock</p>
            <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={`/warehouse?storeId=${store.id}`}>View stock</Link></Button>{admin && <Button variant="outline" size="sm" disabled={busy} onClick={() => edit(store)}><Pencil className="mr-2 h-3 w-3" />Edit</Button>}</div>
          </section>
        ))}
      </div>
      {!stores.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No stores configured. An administrator must create the first store before receiving parts.</p>}
      <p className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">Existing stock with no known location appears under <Link className="font-medium underline" href="/warehouse?storeId=unassigned">Unassigned</Link>. Open a unit and assign its parts to a store; do not receive them again. A store can be deactivated only after all its parts are transferred out. History is preserved.</p>
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit store" : "New store"}</DialogTitle><DialogDescription>Use a name that your warehouse team can identify.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="store-name">Store name</Label><Input id="store-name" value={name} maxLength={80} disabled={busy} onChange={(e) => setName(e.target.value)} /></div>
          {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} disabled={busy} onChange={(e) => setActive(e.target.checked)} />Active</label>}
          {editing && !active && editing.onHand > 0 && <p className="text-sm text-amber-800">This store still holds {editing.onHand} parts. Transfer them out before deactivating it.</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={busy || !name.trim() || name.trim().toLowerCase() === "unassigned" || Boolean(editing && !active && editing.onHand > 0)}>{busy ? "Saving…" : "Save store"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
