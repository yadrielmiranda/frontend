"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { materialHistory, type MaterialMovement, type MaterialPage } from "@/app/api/materials.api";
import type { WarehouseStore } from "@/app/api/warehouse.api";
import { MaterialField, errorText, materialInputClass, quantity } from "../materials-shared";
import {
  emptyMaterialHistoryFilters, materialHistoryQuery, materialMovementKinds,
  materialMovementLabel, type MaterialHistoryFilters,
} from "./material-history-filters";

export function MaterialHistoryClient({ initial, stores }: {
  initial: MaterialPage<MaterialMovement>; stores: WarehouseStore[];
}) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState<MaterialHistoryFilters>(emptyMaterialHistoryFilters);
  const [applied, setApplied] = useState<MaterialHistoryFilters>(emptyMaterialHistoryFilters);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const serial = useRef(0);
  useEffect(() => () => { serial.current++; }, []);

  const update = (field: keyof MaterialHistoryFilters, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const dirty = Object.keys(draft).some(key => draft[key as keyof MaterialHistoryFilters].trim() !== applied[key as keyof MaterialHistoryFilters]);
  const filtered = Object.values(applied).some(Boolean);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  async function load(filters: MaterialHistoryFilters, page = 1) {
    const current = ++serial.current;
    const selected = { ...filters, search: filters.search.trim(), recipient: filters.recipient.trim() };
    setError("");
    try {
      const query = materialHistoryQuery(selected, page);
      setBusy(true);
      const result = await materialHistory(query);
      if (current !== serial.current) return;
      setData(result);
      setApplied(selected);
    } catch (e) {
      if (current === serial.current) setError(errorText(e));
    } finally {
      if (current === serial.current) setBusy(false);
    }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Material history</h2><p className="mt-1 text-sm text-muted-foreground">Review receipts, withdrawals, transfers and stock changes across all materials.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/warehouse/materials"><ArrowLeft className="mr-2 h-4 w-4" />All materials</Link></Button>
        <Button variant="outline" disabled={busy} onClick={() => void load(applied, data.page)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
    </div>

    <form aria-label="Material history filters" className="space-y-4 rounded-xl border bg-white p-4 sm:p-5" onSubmit={event => { event.preventDefault(); void load(draft); }}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MaterialField label="Technician / recipient" hint="Search the name saved with the withdrawal."><Input aria-label="Technician or recipient" placeholder="Name of the person or team" maxLength={200} value={draft.recipient} onChange={event => update("recipient", event.target.value)} /></MaterialField>
        <MaterialField label="Material"><Input aria-label="Material name or code" placeholder="Search by name or product code" maxLength={150} value={draft.search} onChange={event => update("search", event.target.value)} /></MaterialField>
        <MaterialField label="Store"><select aria-label="Store" className={materialInputClass} value={draft.storeId} onChange={event => update("storeId", event.target.value)}><option value="">All stores</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}{!store.isActive ? " (inactive)" : ""}</option>)}</select></MaterialField>
        <MaterialField label="Movement type"><select aria-label="Movement type" className={materialInputClass} value={draft.kind} onChange={event => update("kind", event.target.value)}><option value="">All movements</option>{materialMovementKinds.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></MaterialField>
        <MaterialField label="From date"><Input aria-label="From date" type="date" value={draft.from} onChange={event => update("from", event.target.value)} /></MaterialField>
        <MaterialField label="Through date"><Input aria-label="Through date" type="date" value={draft.to} onChange={event => update("to", event.target.value)} /></MaterialField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Dates use your local time. Leave them blank to see the full history.</p>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || (!filtered && !dirty)} onClick={() => { setDraft(emptyMaterialHistoryFilters); void load(emptyMaterialHistoryFilters); }}>Clear filters</Button><Button type="submit" disabled={busy}><Search className="mr-2 h-4 w-4" />Apply filters</Button></div>
      </div>
      {dirty && <p className="text-sm text-muted-foreground">Select Apply filters to update the results below.</p>}
    </form>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} The previous results are still shown.</p>}
    <section aria-label="Material movements" aria-busy={busy} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{quantity(data.total)} {data.total === 1 ? "movement" : "movements"}</h3><span className="text-xs text-muted-foreground">Newest first</span></div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground [&>span]:max-w-full [&>span]:break-words" aria-label="Applied filters">
        {!filtered && <span>Showing all material movements</span>}
        {applied.recipient && <span className="rounded-full border bg-white px-3 py-1">Recipient: {applied.recipient}</span>}
        {applied.search && <span className="rounded-full border bg-white px-3 py-1">Material: {applied.search}</span>}
        {applied.storeId && <span className="rounded-full border bg-white px-3 py-1">Store: {stores.find(store => String(store.id) === applied.storeId)?.name ?? `#${applied.storeId}`}</span>}
        {applied.kind && <span className="rounded-full border bg-white px-3 py-1">{materialMovementLabel(applied.kind)}</span>}
        {applied.from && <span className="rounded-full border bg-white px-3 py-1">From: {applied.from}</span>}
        {applied.to && <span className="rounded-full border bg-white px-3 py-1">Through: {applied.to}</span>}
      </div>
      {busy && <p role="status" className="text-sm text-muted-foreground">Loading material history…</p>}
      {!data.items.length && !busy && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">{filtered ? "No material movements match these filters." : "No material movements recorded yet."}</p>}
      <div className="space-y-3">{data.items.map(movement => {
        const unit = movement.product?.baseUnit?.name.toLowerCase() ?? "base units";
        return <article key={movement.id} className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs text-muted-foreground">{movement.product?.code ?? `Material #${movement.productId}`}</p><Link href={`/warehouse/materials/${movement.productId}`} className="mt-1 block break-words font-semibold text-slate-950 underline-offset-4 hover:underline">{movement.product?.name ?? `Material #${movement.productId}`}</Link><p className="mt-1 text-sm text-muted-foreground">{movement.store?.name ?? "Store unavailable"}</p></div>
            <div className="space-y-1 text-sm"><span className="inline-block rounded-full border bg-slate-50 px-3 py-1 font-medium">{materialMovementLabel(movement.kind)}</span><time className="block text-xs text-muted-foreground" dateTime={movement.createdAt}>{new Date(movement.createdAt).toLocaleString()}</time></div>
          </div>
          <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">{movement.kind === "ADJUST" ? "Counted quantity" : "Quantity"}</p><p className="mt-1 font-medium">{movement.kind === "COUNT_ADJUSTMENT" ? "Inventory count" : `${quantity(movement.quantity)} ${movement.presentation?.name ?? unit}`}</p></div>
            <div><p className="text-xs text-muted-foreground">Stock change</p><p className={`mt-1 font-medium ${movement.deltaBaseUnits < 0 ? "text-red-700" : movement.deltaBaseUnits > 0 ? "text-emerald-700" : ""}`}>{movement.deltaBaseUnits > 0 ? "+" : ""}{quantity(movement.deltaBaseUnits)} {unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Store balance after movement</p><p className="mt-1 font-medium">{quantity(movement.baseUnitsAfter)} {unit}</p></div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm [&>p]:max-w-full [&>p]:break-words">
            {movement.recipient && <p><span className="text-muted-foreground">Received by:</span> <strong className="font-medium">{movement.recipient}</strong></p>}
            <p><span className="text-muted-foreground">Recorded by:</span> {movement.actor || (movement.actorId ? `user #${movement.actorId}` : "system")}</p>
          </div>
          {(movement.note || movement.supplier || movement.reference) && <div className="space-y-1 break-words text-sm text-muted-foreground">
            {movement.note && <p className="whitespace-pre-wrap">{movement.note}</p>}
            {movement.supplier && <p>Supplier: {movement.supplier}</p>}
            {movement.reference && <p>Reference: {movement.reference}</p>}
          </div>}
          <p className="text-xs text-muted-foreground">Movement #{movement.id}</p>
        </article>;
      })}</div>
      {data.total > data.pageSize && <nav aria-label="Material history pages" className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>Page {data.page} of {pages}</p><div className="flex gap-2"><Button variant="outline" disabled={busy || data.page <= 1} onClick={() => void load(applied, data.page - 1)}>Previous</Button><Button variant="outline" disabled={busy || data.page >= pages} onClick={() => void load(applied, data.page + 1)}>Next</Button></div></nav>}
    </section>
  </div>;
}
