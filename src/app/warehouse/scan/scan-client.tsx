"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StoreSelect } from "../store-select";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  warehouseScan,
  warehouseUndo,
  warehouseInventory,
  warehouseRequestKey,
  warehouseStores,
  type WarehouseStore,
  type WarehouseAction,
  type ScanResult,
} from "@/app/api/warehouse.api";
import { ScanPad } from "../scan-pad";
import { FactoryPickups } from "@/app/technician/factory-pickups";
import {
  CountNotice,
  UnitSummary,
  errorMessage,
  movementLabels,
  MovementLocation,
} from "../warehouse-shared";

const actions: {
  value: WarehouseAction;
  label: string;
  description: string;
}[] = [
  {
    value: "COLLECT",
    label: "Collect from factory",
    description:
      "Plan the POs for this factory visit, then scan their parts in any order. Confirm arrival at a store or directly at the installation in Pending receipt.",
  },
  {
    value: "RECEIVE",
    label: "Receive at warehouse",
    description:
      "Choose the destination store, then scan each arriving part. To receive selected units without rescanning, use Pending receipt. Direct receipts are also supported.",
  },
  {
    value: "RELEASE",
    label: "Release from warehouse",
    description:
      "Choose the source store, then scan each part leaving it. Complete pickup or delivery from the order after the handover.",
  },
];
export function ScanClient({
  actorId,
  isAdmin,
  activeCountId,
  initialStores,
}: {
  actorId: number;
  isAdmin: boolean;
  activeCountId: number | null;
  initialStores: WarehouseStore[];
}) {
  const [action, setAction] = useState<WarehouseAction>("RECEIVE"),
    [last, setLast] = useState<ScanResult | null>(null),
    [pending, setPending] = useState(false);
  const [countId, setCountId] = useState(activeCountId),
    [undoing, setUndoing] = useState(false),
    [undone, setUndone] = useState(false),
    [error, setError] = useState("");
  const [stores, setStores] = useState(initialStores), [storeId, setStoreId] = useState("");
  const [scanFocus, setScanFocus] = useState(false), [scannerRevision, setScannerRevision] = useState(0);
  const [offline, setOffline] = useState(false), [pickupRevision, setPickupRevision] = useState(0);
  const undoKey = useRef(""), focusRoot = useRef<HTMLDivElement>(null);
  const locationValid = action === "COLLECT" ||
    (action === "RELEASE" && storeId === "unassigned") ||
    stores.some((s) => String(s.id) === storeId && (action === "RELEASE" || s.isActive));
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("warehouse-scan-focus", { detail: scanFocus }));
    if (scanFocus && window.matchMedia("(max-width: 639px)").matches) {
      requestAnimationFrame(() =>
        focusRoot.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
    return () => {
      if (scanFocus)
        window.dispatchEvent(new CustomEvent("warehouse-scan-focus", { detail: false }));
    };
  }, [scanFocus]);
  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);
  useEffect(() => {
    const refresh = () =>
      Promise.all([warehouseInventory({ pageSize: 1 }), warehouseStores()])
        .then(([r, nextStores]) => { setCountId(r.activeCountId); setStores(nextStores); })
        .catch(() => undefined);
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  function leaveScanFocus() {
    setScanFocus(false);
    if (action === "COLLECT") setPickupRevision((value) => value + 1);
    else setScannerRevision((value) => value + 1);
  }
  async function undo() {
    if (!last) return;
    setUndoing(true);
    setError("");
    if (!undoKey.current) undoKey.current = warehouseRequestKey();
    try {
      const result = await warehouseUndo(last.movement.id, undoKey.current);
      setLast(result);
      setUndone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUndoing(false);
    }
  }
  const activeAction = actions.find((option) => option.value === action)!;
  const activeStoreName = storeId === "unassigned"
    ? "Unassigned"
    : stores.find((store) => String(store.id) === storeId)?.name;
  return (
    <div ref={focusRoot} className="scroll-mt-24 space-y-5 sm:scroll-mt-0">
      {scanFocus && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Scanning</p>
              <p className="mt-1 font-semibold text-slate-950">{activeAction.label}</p>
              {action !== "COLLECT" && activeStoreName && (
                <p className="mt-1 text-xs text-slate-600">
                  {action === "RECEIVE" ? "To" : "From"}: {activeStoreName}
                </p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={leaveScanFocus} disabled={pending || undoing}>
              Change operation
            </Button>
          </div>
        </section>
      )}
      <div className={scanFocus ? "hidden sm:block" : ""}>
        <CountNotice id={countId} />
      </div>
      <h2 className={`text-xl font-semibold ${scanFocus ? "hidden sm:block" : ""}`}>Scan parts</h2>
      <div
        className={`${scanFocus ? "hidden sm:grid" : "grid"} gap-3 sm:grid-cols-3`}
        role="group"
        aria-label="Warehouse operation"
      >
        {actions.filter((option) => isAdmin || option.value !== "COLLECT").map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={action === option.value}
            disabled={pending || undoing}
            onClick={() => {
              setScanFocus(false);
              setAction(option.value);
              setStoreId("");
              setLast(null);
              setError("");
            }}
            className={`rounded-xl border p-4 text-left text-sm font-semibold disabled:opacity-60 ${action === option.value ? "border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-white hover:bg-slate-50"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className={`text-sm text-muted-foreground ${scanFocus ? "hidden sm:block" : ""}`}>
        {activeAction.description}
      </p>
      {action !== "COLLECT" && (
        <div className={`space-y-2 sm:max-w-sm ${scanFocus ? "hidden sm:block" : ""}`}>
          <p className="text-sm font-medium">{action === "RECEIVE" ? "Destination store" : "Source store"}</p>
          <StoreSelect stores={stores} value={storeId} onChange={setStoreId}
            allowUnassigned={action === "RELEASE"} includeInactive={action === "RELEASE"}
            disabled={pending || undoing} label={action === "RECEIVE" ? "Destination store" : "Source store"} />
          {!stores.some((s) => s.isActive) && <p className="text-sm text-muted-foreground">An administrator must create an active store in <Link href="/warehouse/stores" className="underline">Stores</Link> before receiving parts.</p>}
        </div>
      )}
      {action === "RECEIVE" && <Link href="/warehouse/receipts" className={`text-sm font-medium underline ${scanFocus ? "hidden sm:inline-block" : "inline-block"}`}>Receive selected or all pending units without rescanning</Link>}
      {action === "COLLECT" && isAdmin && (
        <FactoryPickups
          key={`${actorId}:warehouse-pickup:${pickupRevision}`}
          actorId={actorId}
          surface="warehouse"
          offline={offline}
          blocked={Boolean(countId)}
          onBusy={setPending}
          onScanModeChange={setScanFocus}
        />
      )}
      {action !== "COLLECT" && (locationValid || pending) && <ScanPad
        key={`${action}:${storeId}:${scannerRevision}`}
        scope={`${action}:${storeId}`}
        disabled={Boolean(countId) || undoing}
        onRead={(barcode, key) => warehouseScan(
          barcode,
          action,
          key,
          storeId === "unassigned" ? null : Number(storeId),
        )}
        onPendingChange={setPending}
        mobileFocus
        onScanModeChange={setScanFocus}
        onSaved={(result) => {
          setLast(result);
          setUndone(false);
          setError("");
          undoKey.current = "";
        }}
      />}
      {last && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4 sm:p-6">
          <p
            role="status"
            className="flex items-center gap-2 text-sm font-semibold text-emerald-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            {undone
              ? "Reading reversed."
              : `${movementLabels[last.movement.type]} saved.${last.replayed ? " Already recorded; no duplicate added." : ""}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Last saved reading ·{" "}
            {new Date(last.movement.createdAt).toLocaleTimeString()}
          </p>
          <MovementLocation movement={last.movement} />
          <UnitSummary unit={last.stock} />
          {!undone && (
            <Button
              variant="outline"
              onClick={undo}
              disabled={pending || undoing || Boolean(countId)}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {undoing ? "Reversing…" : "Undo last reading"}
            </Button>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
