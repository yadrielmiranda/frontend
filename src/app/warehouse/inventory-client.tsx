"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StoreSelect } from "./store-select";
import { TransferForm } from "./transfer-form";
import { Download, RefreshCw, Search, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  warehouseInventory,
  warehouseHistory,
  warehouseParts,
  warehouseUnit,
  warehouseRequestKey,
  warehouseStores,
  type WarehouseStore,
  type Inventory,
  type WarehouseUnit,
  type WarehouseMovement,
} from "@/app/api/warehouse.api";
import {
  CountNotice,
  dateLabel,
  errorMessage,
  movementLabels,
  Pagination,
  UnitSummary,
  MovementLocation,
  storeBreakdown,
} from "./warehouse-shared";

const states: Record<string, string> = {
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  IN_TRANSIT: "In transit",
  RELEASED: "Released",
  PENDING: "Awaiting receipt",
  NEEDS_PARTS: "Set expected parts",
};
const views = {
  on_hand: "In warehouse",
  in_transit: "In transit",
  complete: "Complete in warehouse",
  partial: "Partial in warehouse",
  all: "All imported units",
};
const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
};

export function InventoryClient({
  initial,
  initialSearch,
  initialView,
  initialStores,
  initialStoreId,
  admin,
}: {
  initial: Inventory;
  initialSearch: string;
  initialView: string;
  initialStores: WarehouseStore[];
  initialStoreId: string;
  admin: boolean;
}) {
  const [data, setData] = useState(initial),
    [search, setSearch] = useState(initialSearch),
    [view, setView] = useState(initialView),
    [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<WarehouseUnit | null>(null);
  const [stores, setStores] = useState(initialStores), [storeId, setStoreId] = useState(initialStoreId);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setBusy(true);
    try {
      const [next, nextStores] = await Promise.all([warehouseInventory({ search, view, page, storeId }), warehouseStores()]);
      if (id === sequence.current) {
        setData(next);
        setStores(nextStores);
        setError("");
      }
    } catch (e) {
      if (id === sequence.current) setError(errorMessage(e));
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }, [search, view, page, storeId]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => {
      clearTimeout(timer);
      sequence.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [refresh]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const rows: WarehouseUnit[] = [];
      for (let current = 1; ; current++) {
        const result = await warehouseInventory({
          search,
          view,
          page: current,
          pageSize: 100,
          storeId,
        });
        rows.push(...result.items);
        if (current * 100 >= result.total) break;
      }
      const content = [
        [
          "Order",
          "Customer",
          "PO",
          "Mark",
          "Product",
          "System",
          "Configuration",
          "Line number",
          "Expected parts",
          "In transit",
          "In warehouse",
          "Store breakdown",
          "Unassigned",
          "Released",
        ],
        ...rows.map((r) => [
          r.orderNumber,
          r.customer,
          r.poNumber,
          r.mark,
          r.product,
          r.system,
          r.configuration,
          r.lineNumber,
          r.expectedParts,
          r.inTransit,
          r.onHand,
          storeBreakdown(r),
          r.unassigned,
          r.released,
        ]),
      ]
        .map((r) => r.map(csvCell).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `warehouse-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-5">
      <CountNotice id={data.activeCountId} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["In warehouse", data.summary.onHand],
          ["In transit", data.summary.inTransit],
          ["Released", data.summary.released],
          ["Unassigned (included in warehouse)", data.summary.unassigned],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border bg-white p-3 shadow-sm sm:p-5"
          >
            <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">physical parts</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Totals across all stores. Location filters below apply to the unit list.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/warehouse/receipts">Pending receipt</Link></Button>
          <Button asChild>
            <Link href="/warehouse/scan">
              <ScanBarcode className="mr-2 h-4 w-4" />
              Scan parts
            </Link>
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            {exporting ? (
              "Exporting…"
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search inventory"
            maxLength={150}
            className="pl-9"
            placeholder="Order, customer, mark, PO or barcode"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={view}
          onValueChange={(value) => {
            setView(value);
            if (value === "in_transit") setStoreId("all");
            setPage(1);
          }}
        >
          <SelectTrigger
            aria-label="Inventory filter"
            className="w-full sm:w-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(views).map(([value, label]) => (
              <SelectItem value={value} key={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-full lg:w-56">
          <StoreSelect stores={stores} value={storeId} allowAll allowUnassigned includeInactive disabled={view === "in_transit"} label="Inventory store filter"
            onChange={(value) => { setStoreId(value); setPage(1); }} />
        </div>
        <Button
          variant="outline"
          aria-label="Refresh inventory"
          onClick={refresh}
          disabled={busy}
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border bg-white">
        {data.items.length === 0 ? (
          <div className="space-y-2 px-5 py-12 text-center">
            <p className="font-medium">No units match this view.</p>
            <p className="text-sm text-muted-foreground">
              Use All imported units to find pieces awaiting receipt. Import the
              factory JSON from an order to register its barcodes.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {[
                      "Order / customer",
                      "PO",
                      "Piece",
                      "Line number",
                      "Expected",
                      "Transit",
                      "On hand",
                      "Locations",
                      "Released",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((row) => (
                    <tr key={row.lineNumber} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link
                          className="font-medium underline"
                          href={`/orders/${row.orderId}`}
                        >
                          #{row.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.customer}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono">
                        {row.poNumber || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {row.mark || "—"} · {row.product}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.system} · {row.configuration}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          className="font-mono text-red-700 underline"
                          onClick={() => setSelected(row)}
                        >
                          {row.lineNumber}
                        </button>
                      </td>
                      <td className="px-4 py-4">{row.expectedParts ?? "—"}</td>
                      <td className="px-4 py-4">{row.inTransit}</td>
                      <td className="px-4 py-4 font-semibold">{row.onHand}</td>
                      <td className="min-w-40 max-w-64 px-4 py-4 text-xs text-muted-foreground">{storeBreakdown(row) || "—"}</td>
                      <td className="px-4 py-4">{row.released}</td>
                      <td className="px-4 py-4">
                        <State unit={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">
              {data.items.map((row) => (
                <button
                  key={row.lineNumber}
                  className="block w-full space-y-3 p-4 text-left hover:bg-slate-50"
                  onClick={() => setSelected(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {row.mark || "—"} · {row.product}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Order #{row.orderNumber} · {row.customer}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        PO: <span className="font-mono text-foreground">{row.poNumber || "—"}</span>
                      </p>
                    </div>
                    <State unit={row} />
                  </div>
                  <p className="font-mono text-sm text-red-700">
                    {row.barcode}
                  </p>
                  {row.onHand > 0 && <p className="text-xs text-muted-foreground">{storeBreakdown(row)}</p>}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span>
                      On hand{" "}
                      <b>
                        {row.onHand}/{row.expectedParts ?? "?"}
                      </b>
                    </span>
                    <span>
                      Transit <b>{row.inTransit}</b>
                    </span>
                    <span>
                      Released <b>{row.released}</b>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <Pagination {...data} onPage={setPage} disabled={busy} />
      {selected && (
        <UnitDetails
          key={selected.lineNumber}
          initial={selected}
          admin={admin}
          stores={stores}
          activeCountId={data.activeCountId}
          onClose={() => setSelected(null)}
          onChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
function State({ unit }: { unit: WarehouseUnit }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs ${unit.state === "COMPLETE" ? "bg-emerald-50 text-emerald-700" : unit.state === "NEEDS_PARTS" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}
    >
      {states[unit.state]}
    </span>
  );
}
function UnitDetails({
  initial,
  admin,
  stores,
  activeCountId,
  onClose,
  onChanged,
}: {
  initial: WarehouseUnit;
  admin: boolean;
  stores: WarehouseStore[];
  activeCountId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [unit, setUnit] = useState(initial),
    [history, setHistory] = useState<WarehouseMovement[]>([]),
    [expected, setExpected] = useState(String(initial.expectedParts ?? ""));
  const [reason, setReason] = useState(""),
    [editing, setEditing] = useState(initial.expectedParts === null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const request = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      warehouseUnit(initial.lineNumber),
      warehouseHistory({ lineNumber: initial.lineNumber, pageSize: 20 }),
    ])
      .then(([next, rows]) => {
        if (live) {
          setUnit(next);
          setExpected(String(next.expectedParts ?? ""));
          setHistory(rows.items);
        }
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => { if (live) setBusy(false); });
    return () => {
      live = false;
    };
  }, [initial.lineNumber]);
  async function save() {
    setBusy(true);
    setError("");
    const signature = JSON.stringify([expected, reason, unit.version]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: warehouseRequestKey() };
    try {
      const result = await warehouseParts(
        unit,
        Number(expected),
        reason,
        request.current!.key,
      );
      setUnit(result.stock);
      setEditing(false);
      setReason("");
      onChanged();
      const rows = await warehouseHistory({
        lineNumber: unit.lineNumber,
        pageSize: 20,
      });
      setHistory(rows.items);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy && !moving) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Factory unit {unit.lineNumber}</SheetTitle>
          <SheetDescription>
            Stock and movement history for this barcode.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 p-4">
          <UnitSummary unit={unit} />
          <CountNotice id={activeCountId} />
          <Button variant="outline" disabled={busy || moving} onClick={async () => {
            setError(""); setBusy(true);
            try {
              const [next, rows] = await Promise.all([warehouseUnit(unit.lineNumber), warehouseHistory({ lineNumber: unit.lineNumber, pageSize: 20 })]);
              setUnit(next); setExpected(String(next.expectedParts ?? "")); setHistory(rows.items);
            } catch (e) { setError(errorMessage(e)); }
            finally { setBusy(false); }
          }}>Refresh unit</Button>
          <TransferForm key={`${unit.lineNumber}:${unit.version}`} unit={unit} stores={stores}
            disabled={busy || Boolean(activeCountId)} onPendingChange={setMoving}
            onSaved={(result) => {
              setUnit(result.stock); onChanged();
              warehouseHistory({ lineNumber: unit.lineNumber, pageSize: 20 }).then((rows) => setHistory(rows.items)).catch((e) => setError(errorMessage(e)));
            }} />
          {admin && (
            <div className="space-y-3 border-t pt-4">
              {!editing ? (
                <Button variant="outline" disabled={moving || Boolean(activeCountId)} onClick={() => setEditing(true)}>
                  Edit expected parts
                </Button>
              ) : (
                <>
                  <Label htmlFor="expected-parts">
                    Expected physical parts
                  </Label>
                  <Input
                    id="expected-parts"
                    type="number"
                    min={1}
                    max={200}
                    step={1}
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    disabled={busy}
                  />
                  <Label htmlFor="parts-reason">Reason</Label>
                  <Input
                    id="parts-reason"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include every separate part with this barcode, including the
                    frame. This does not receive any stock.
                  </p>
                  <Button
                    onClick={save}
                    disabled={
                      busy || moving || Boolean(activeCountId) ||
                      !Number.isInteger(Number(expected)) ||
                      Number(expected) < 1 ||
                      Number(expected) > 200 ||
                      reason.trim().length < 3
                    }
                  >
                    {busy ? "Saving…" : "Save expected parts"}
                  </Button>
                </>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <h3 className="font-semibold">Recent movements</h3>
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">No movements yet.</p>
            )}
            {history.map((m) => (
              <div key={m.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {movementLabels[m.type]}
                  {m.reversed ? " · Reversed" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(m.createdAt)} · {m.actor}
                </p>
                <p className="mt-1">
                  Warehouse: {m.onHandAfter} · Transit: {m.transitAfter} ·
                  Released: {m.releasedAfter}
                </p>
                <MovementLocation movement={m} />
                {m.reason && <p className="mt-1 break-words">{m.reason}</p>}
              </div>
            ))}
            <Link
              className="text-sm font-medium text-red-700 underline"
              href={`/warehouse/history?lineNumber=${unit.lineNumber}`}
            >
              View full history
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
