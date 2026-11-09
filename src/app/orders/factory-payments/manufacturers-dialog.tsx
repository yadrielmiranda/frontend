"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getFactoryManufacturers, saveFactoryManufacturer } from "@/app/api/factory-payments.api";
import type { FactoryManufacturer } from "@/lib/factory-payments";

export function ManufacturersDialog({ open, onOpenChange, manufacturers, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturers: FactoryManufacturer[];
  onSaved: (rows: FactoryManufacturer[]) => void;
}) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const editingDefault = manufacturers.some(row => row.id === editing && row.isDefault);
  const begin = (manufacturer?: FactoryManufacturer) => {
    setEditing(manufacturer?.id ?? "new");
    setName(manufacturer?.name ?? "");
    setActive(manufacturer?.active ?? true);
    setIsDefault(manufacturer?.isDefault ?? false);
  };
  const save = async () => {
    if (busy || editing == null) return;
    setBusy(true);
    try {
      await saveFactoryManufacturer({ name: name.trim(), ...(editing === "new" ? {} : { active }), isDefault }, editing === "new" ? undefined : editing);
      onSaved(await getFactoryManufacturers());
      setEditing(null);
      toast.success("Manufacturer saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the manufacturer.");
    } finally { setBusy(false); }
  };
  const visible = manufacturers.filter(row => row.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <Dialog open={open} onOpenChange={value => { if (!busy) { onOpenChange(value); if (!value) setEditing(null); } }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl" showCloseButton={!busy}>
      <DialogHeader>
        <DialogTitle>Manufacturers</DialogTitle>
        <DialogDescription>Manage the companies paid for your factory orders. The default is preselected when recording a payment.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input aria-label="Search manufacturers" placeholder="Search manufacturers…" className="max-w-sm" value={search} onChange={event => setSearch(event.target.value)} />
        <Button disabled={busy || editing !== null} onClick={() => begin()}><Plus aria-hidden="true" />Add manufacturer</Button>
      </div>
      {editing !== null && <form className="space-y-4 rounded-xl border bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="space-y-4">
          <h3 className="font-semibold">{editing === "new" ? "New manufacturer" : "Edit manufacturer"}</h3>
          <label className="block space-y-1"><span className="text-sm font-medium">Manufacturer name</span>
            <Input required maxLength={150} autoFocus value={name} onChange={event => setName(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-6 text-sm">
            {editing !== "new" && <label className="flex items-center gap-2">
              <input type="checkbox" disabled={editingDefault} checked={active} onChange={event => { setActive(event.target.checked); if (!event.target.checked) setIsDefault(false); }} />Active
            </label>}
            <label className="flex items-center gap-2"><input type="checkbox" disabled={!active || editingDefault} checked={isDefault} onChange={event => setIsDefault(event.target.checked)} />Use as default</label>
          </div>
          {editingDefault && <p className="text-xs text-muted-foreground">Set another manufacturer as default before deactivating this one.</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={!name.trim()}>{busy ? "Saving…" : "Save manufacturer"}</Button></div>
        </fieldset>
      </form>}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Manufacturer</th><th className="p-3">Status</th><th className="p-3">Default</th><th className="p-3 text-right">Action</th></tr></thead>
          <tbody>{visible.map(row => <tr key={row.id} className="border-t"><td className="p-3 font-medium">{row.name}</td><td className="p-3">{row.active ? "Active" : "Inactive"}</td><td className="p-3">{row.isDefault ? "Default" : "—"}</td><td className="p-3 text-right"><Button size="sm" variant="outline" disabled={busy || editing !== null} onClick={() => begin(row)}>Edit</Button></td></tr>)}</tbody>
        </table>
        {!visible.length && <p className="p-5 text-sm text-muted-foreground">No matching manufacturers.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
