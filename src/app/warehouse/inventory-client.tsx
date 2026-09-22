"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StoreSelect } from "./store-select";
import { TransferForm } from "./transfer-form";
import {
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  ScanBarcode,
} from "lucide-react";
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
  warehouseInventoryByPo,
  warehouseHistory,
  warehouseParts,
  warehouseUnit,
  warehouseRequestKey,
  warehouseStores,
  type WarehouseStore,
  type Inventory,
  type WarehousePoGroup,
  type WarehousePoInventory,
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
type InventoryMode = "po" | "piece";

function locationQuantity(unit: WarehouseUnit, storeId: string) {
  if (storeId === "all") return unit.onHand;
  if (storeId === "unassigned") return unit.unassigned;
  return unit.stores.find((store) => String(store.id) === storeId)?.onHand ?? 0;
}

function expectedParts(units: WarehouseUnit[]) {
  return units.every((unit) => unit.expectedParts !== null)
    ? units.reduce((total, unit) => total + (unit.expectedParts ?? 0), 0)
    : null;
}

function poLocations(units: WarehouseUnit[]) {
  const locations = new Map<string, number>();
  for (const unit of units) {
    for (const store of unit.stores)
      locations.set(store.name, (locations.get(store.name) ?? 0) + store.onHand);
    if (unit.unassigned > 0)
      locations.set("Unassigned", (locations.get("Unassigned") ?? 0) + unit.unassigned);
  }
  return [...locations.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, quantity]) => `${name}: ${quantity}`)
    .join(" · ");
}

function poMetrics(group: WarehousePoGroup, storeId: string) {
  return {
    pieces: group.units.length,
    parts: expectedParts(group.units),
    transit: group.units.reduce((sum, unit) => sum + unit.inTransit, 0),
    onHand: group.units.reduce(
      (sum, unit) => sum + locationQuantity(unit, storeId),
      0,
    ),
    released: group.units.reduce((sum, unit) => sum + unit.released, 0),
    locations: poLocations(group.units),
  };
}

function PieceDescription({ unit }: { unit: WarehouseUnit }) {
  return (
    <div>
      <p className="font-medium">{unit.product}</p>
      <p className="text-xs text-muted-foreground">
        {unit.system} · {unit.configuration}
      </p>
    </div>
  );
}

function PoInventoryTable({
  data,
  storeId,
  expanded,
  onToggle,
  onSelect,
}: {
  data: WarehousePoInventory;
  storeId: string;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (unit: WarehouseUnit) => void;
}) {
  const allStores = storeId === "all";
  const columns = allStores ? 8 : 7;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "PO",
                "Order / customer",
                "Pieces",
                "Parts",
                "Transit",
                "On hand",
                ...(allStores ? ["Locations"] : []),
                "Released",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.items.map((group) => {
              const open = expanded.has(group.key),
                metrics = poMetrics(group, storeId);
              return (
                <Fragment key={group.key}>
                  <tr className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 font-mono font-semibold text-red-700 hover:underline"
                        onClick={() => onToggle(group.key)}
                        aria-expanded={open}
                      >
                        {open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {group.poNumber || "—"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      {group.orderId ? (
                        <Link
                          className="font-medium underline"
                          href={`/orders/${group.orderId}`}
                        >
                          #{group.orderNumber}
                        </Link>
                      ) : (
                        <span className="font-medium">—</span>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.customer}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold">{metrics.pieces}</td>
                    <td className="px-4 py-4">{metrics.parts ?? "—"}</td>
                    <td className="px-4 py-4">{metrics.transit}</td>
                    <td className="px-4 py-4 font-semibold">{metrics.onHand}</td>
                    {allStores && (
                      <td className="min-w-40 max-w-72 px-4 py-4 text-xs text-muted-foreground">
                        {metrics.locations || "—"}
                      </td>
                    )}
                    <td className="px-4 py-4">{metrics.released}</td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={columns} className="p-0">
                        <div className="border-t px-4 py-3">
                          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Pieces in PO {group.poNumber || "—"}
                          </p>
                          <div className="overflow-x-auto rounded-lg border bg-white">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                  {[
                                    "Mark",
                                    "Piece",
                                    "Line number",
                                    "Expected",
                                    "Transit",
                                    "On hand",
                                    ...(allStores ? ["Locations"] : []),
                                    "Released",
                                    "Status",
                                  ].map((heading) => (
                                    <th key={heading} className="px-3 py-2 font-medium">
                                      {heading}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {group.units.map((unit) => (
                                  <tr key={unit.lineNumber}>
                                    <td className="px-3 py-3 font-medium">
                                      {unit.mark || "—"}
                                    </td>
                                    <td className="px-3 py-3">
                                      <PieceDescription unit={unit} />
                                    </td>
                                    <td className="px-3 py-3">
                                      <button
                                        type="button"
                                        className="font-mono text-red-700 underline"
                                        onClick={() => onSelect(unit)}
                                      >
                                        {unit.lineNumber}
                                      </button>
                                    </td>
                                    <td className="px-3 py-3">
                                      {unit.expectedParts ?? "—"}
                                    </td>
                                    <td className="px-3 py-3">{unit.inTransit}</td>
                                    <td className="px-3 py-3 font-semibold">
                                      {locationQuantity(unit, storeId)}
                                    </td>
                                    {allStores && (
                                      <td className="min-w-40 px-3 py-3 text-xs text-muted-foreground">
                                        {storeBreakdown(unit) || "—"}
                                      </td>
                                    )}
                                    <td className="px-3 py-3">{unit.released}</td>
                                    <td className="px-3 py-3">
                                      <State unit={unit} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y md:hidden">
        {data.items.map((group) => {
          const open = expanded.has(group.key),
            metrics = poMetrics(group, storeId);
          return (
            <article key={group.key} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-mono font-semibold text-red-700"
                    onClick={() => onToggle(group.key)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    PO {group.poNumber || "—"}
                  </button>
                  <p className="mt-1 text-sm">
                    {group.orderId ? (
                      <Link className="underline" href={`/orders/${group.orderId}`}>
                        #{group.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {group.customer}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span>Pieces <b>{metrics.pieces}</b></span>
                <span>Parts <b>{metrics.parts ?? "—"}</b></span>
                <span>On hand <b>{metrics.onHand}</b></span>
                <span>Transit <b>{metrics.transit}</b></span>
                <span>Released <b>{metrics.released}</b></span>
              </div>
              {allStores && metrics.locations && (
                <p className="text-xs text-muted-foreground">
                  {metrics.locations}
                </p>
              )}
              {open && (
                <div className="space-y-2 border-t pt-3">
                  {group.units.map((unit) => (
                    <button
                      type="button"
                      key={unit.lineNumber}
                      className="block w-full rounded-lg border bg-slate-50 p-3 text-left"
                      onClick={() => onSelect(unit)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Mark {unit.mark || "—"}
                          </p>
                          <p className="font-medium">{unit.product}</p>
                          <p className="text-xs text-muted-foreground">
                            {unit.system} · {unit.configuration}
                          </p>
                        </div>
                        <State unit={unit} />
                      </div>
                      <p className="mt-2 font-mono text-sm text-red-700">
                        {unit.lineNumber}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <span>Expected <b>{unit.expectedParts ?? "—"}</b></span>
                        <span>Transit <b>{unit.inTransit}</b></span>
                        <span>On hand <b>{locationQuantity(unit, storeId)}</b></span>
                      </div>
                      {allStores && unit.onHand > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {storeBreakdown(unit)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function PieceInventoryTable({
  data,
  storeId,
  onSelect,
}: {
  data: Inventory;
  storeId: string;
  onSelect: (unit: WarehouseUnit) => void;
}) {
  const allStores = storeId === "all";
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Order / customer",
                "PO",
                "Mark",
                "Piece",
                "Line number",
                "Expected",
                "Transit",
                "On hand",
                ...(allStores ? ["Locations"] : []),
                "Released",
                "Status",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.items.map((row) => (
              <tr key={row.lineNumber} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  {row.orderId ? (
                    <Link
                      className="font-medium underline"
                      href={`/orders/${row.orderId}`}
                    >
                      #{row.orderNumber}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.customer}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-mono">
                  {row.poNumber || "—"}
                </td>
                <td className="px-4 py-4 font-medium">{row.mark || "—"}</td>
                <td className="px-4 py-4">
                  <PieceDescription unit={row} />
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className="font-mono text-red-700 underline"
                    onClick={() => onSelect(row)}
                  >
                    {row.lineNumber}
                  </button>
                </td>
                <td className="px-4 py-4">{row.expectedParts ?? "—"}</td>
                <td className="px-4 py-4">{row.inTransit}</td>
                <td className="px-4 py-4 font-semibold">
                  {locationQuantity(row, storeId)}
                </td>
                {allStores && (
                  <td className="min-w-40 max-w-64 px-4 py-4 text-xs text-muted-foreground">
                    {storeBreakdown(row) || "—"}
                  </td>
                )}
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
            type="button"
            key={row.lineNumber}
            className="block w-full space-y-3 p-4 text-left hover:bg-slate-50"
            onClick={() => onSelect(row)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Mark {row.mark || "—"}
                </p>
                <p className="font-semibold">{row.product}</p>
                <p className="text-xs text-muted-foreground">
                  {row.system} · {row.configuration}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Order #{row.orderNumber} · {row.customer}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PO: <span className="font-mono text-foreground">{row.poNumber || "—"}</span>
                </p>
              </div>
              <State unit={row} />
            </div>
            <p className="font-mono text-sm text-red-700">{row.barcode}</p>
            {allStores && row.onHand > 0 && (
              <p className="text-xs text-muted-foreground">{storeBreakdown(row)}</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span>
                On hand{" "}
                <b>
                  {locationQuantity(row, storeId)}/{row.expectedParts ?? "?"}
                </b>
              </span>
              <span>Transit <b>{row.inTransit}</b></span>
              <span>Released <b>{row.released}</b></span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export function InventoryClient({
  initial,
  initialSearch,
  initialView,
  initialStores,
  initialStoreId,
  admin,
}: {
  initial: WarehousePoInventory;
  initialSearch: string;
  initialView: string;
  initialStores: WarehouseStore[];
  initialStoreId: string;
  admin: boolean;
}) {
  const [poData, setPoData] = useState<WarehousePoInventory | null>(initial),
    [pieceData, setPieceData] = useState<Inventory | null>(null),
    [mode, setMode] = useState<InventoryMode>("po"),
    [search, setSearch] = useState(initialSearch),
    [view, setView] = useState(initialView),
    [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<WarehouseUnit | null>(null),
    [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stores, setStores] = useState(initialStores),
    [storeId, setStoreId] = useState(initialStoreId);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setBusy(true);
    try {
      const query = {
        search,
        view,
        page,
        storeId,
        pageSize: mode === "po" ? 20 : 50,
      };
      const [next, nextStores] = await Promise.all([
        mode === "po" ? warehouseInventoryByPo(query) : warehouseInventory(query),
        warehouseStores(),
      ]);
      if (id === sequence.current) {
        if (mode === "po") setPoData(next as WarehousePoInventory);
        else setPieceData(next as Inventory);
        setStores(nextStores);
        setError("");
      }
    } catch (e) {
      if (id === sequence.current) setError(errorMessage(e));
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }, [search, view, page, storeId, mode]);
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
        ...rows.map((row) => [
          row.orderNumber,
          row.customer,
          row.poNumber,
          row.mark,
          row.product,
          row.system,
          row.configuration,
          row.lineNumber,
          row.expectedParts,
          row.inTransit,
          row.onHand,
          storeBreakdown(row),
          row.unassigned,
          row.released,
        ]),
      ]
        .map((row) => row.map(csvCell).join(","))
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

  const currentData = mode === "po" ? poData : pieceData,
    summaryData = currentData ?? (mode === "po" ? pieceData : poData) ?? initial;
  return (
    <div className="space-y-5">
      <CountNotice id={summaryData.activeCountId} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["In warehouse", summaryData.summary.onHand],
          ["In transit", summaryData.summary.inTransit],
          ["Released", summaryData.summary.released],
          ["Unassigned (included in warehouse)", summaryData.summary.unassigned],
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
      <p className="text-xs text-muted-foreground">
        Totals across all stores. Location filters below apply to the inventory list.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Inventory</h2>
          <div className="inline-flex rounded-lg border bg-white p-1">
            {(["po", "piece"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === value
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => {
                  if (mode === value) return;
                  setMode(value);
                  setPage(1);
                  setExpanded(new Set());
                  if (value === "piece") setPieceData(null);
                  else setPoData(null);
                }}
              >
                {value === "po" ? "By PO" : "By Piece"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/warehouse/receipts">Pending receipt</Link>
          </Button>
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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setExpanded(new Set());
            }}
          />
        </div>
        <Select
          value={view}
          onValueChange={(value) => {
            setView(value);
            if (value === "in_transit") setStoreId("all");
            setPage(1);
            setExpanded(new Set());
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
          <StoreSelect
            stores={stores}
            value={storeId}
            allowAll
            allowUnassigned
            includeInactive
            disabled={view === "in_transit"}
            label="Inventory store filter"
            onChange={(value) => {
              setStoreId(value);
              setPage(1);
              setExpanded(new Set());
            }}
          />
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
        {!currentData ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading inventory…
          </div>
        ) : currentData.items.length === 0 ? (
          <div className="space-y-2 px-5 py-12 text-center">
            <p className="font-medium">No units match this view.</p>
            <p className="text-sm text-muted-foreground">
              Use All imported units to find pieces awaiting receipt. Import the
              factory JSON from an order to register its barcodes.
            </p>
          </div>
        ) : mode === "po" ? (
          <PoInventoryTable
            data={currentData as WarehousePoInventory}
            storeId={storeId}
            expanded={expanded}
            onToggle={(key) =>
              setExpanded((current) => {
                const next = new Set(current);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            onSelect={setSelected}
          />
        ) : (
          <PieceInventoryTable
            data={currentData as Inventory}
            storeId={storeId}
            onSelect={setSelected}
          />
        )}
      </div>
      {currentData && (
        <Pagination
          {...currentData}
          onPage={(nextPage) => {
            setPage(nextPage);
            setExpanded(new Set());
          }}
          disabled={busy}
          label={mode === "po" ? "POs" : "records"}
        />
      )}
      {selected && (
        <UnitDetails
          key={selected.lineNumber}
          initial={selected}
          admin={admin}
          stores={stores}
          activeCountId={summaryData.activeCountId}
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
