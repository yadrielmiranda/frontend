"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  warehouseScan,
  warehouseUndo,
  warehouseInventory,
  warehouseRequestKey,
  type WarehouseAction,
  type ScanResult,
} from "@/app/api/warehouse.api";
import { ScanPad } from "../scan-pad";
import {
  CountNotice,
  UnitSummary,
  errorMessage,
  movementLabels,
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
      "Scan each part as it is collected. It will be in transit until received at the warehouse.",
  },
  {
    value: "RECEIVE",
    label: "Receive at warehouse",
    description:
      "Scan each arriving part. Parts in transit move into stock; direct receipts are also supported.",
  },
  {
    value: "RELEASE",
    label: "Release from warehouse",
    description:
      "Scan each part leaving the warehouse. Complete pickup or delivery from the order after the handover.",
  },
];
export function ScanClient({
  activeCountId,
}: {
  activeCountId: number | null;
}) {
  const [action, setAction] = useState<WarehouseAction>("RECEIVE"),
    [last, setLast] = useState<ScanResult | null>(null),
    [pending, setPending] = useState(false);
  const [countId, setCountId] = useState(activeCountId),
    [undoing, setUndoing] = useState(false),
    [undone, setUndone] = useState(false),
    [error, setError] = useState("");
  const undoKey = useRef("");
  useEffect(() => {
    const refresh = () =>
      warehouseInventory({ pageSize: 1 })
        .then((r) => setCountId(r.activeCountId))
        .catch(() => undefined);
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
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
  return (
    <div className="space-y-5">
      <CountNotice id={countId} />
      <h2 className="text-xl font-semibold">Scan parts</h2>
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="group"
        aria-label="Warehouse operation"
      >
        {actions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={action === option.value}
            disabled={pending || undoing}
            onClick={() => {
              setAction(option.value);
              setLast(null);
              setError("");
            }}
            className={`rounded-xl border p-4 text-left text-sm font-semibold disabled:opacity-60 ${action === option.value ? "border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-white hover:bg-slate-50"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {actions.find((a) => a.value === action)?.description}
      </p>
      <ScanPad
        key={action}
        scope={action}
        disabled={Boolean(countId) || undoing}
        onRead={(barcode, key) => warehouseScan(barcode, action, key)}
        onPendingChange={setPending}
        onSaved={(result) => {
          setLast(result);
          setUndone(false);
          setError("");
          undoKey.current = "";
        }}
      />
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
