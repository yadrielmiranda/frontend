"use client";

import { useId, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, CircleDot, X } from "lucide-react";
import type { CustomerDeliveryRun, CustomerDeliveryRunOrder } from "@/app/api/customer-delivery-runs.api";
import type { CustomerDeliveryItem, FactoryPartType } from "@/app/api/warehouse.api";
import { Button } from "@/components/ui/button";
import { factoryPartsText } from "../factory-parts";
import { PoName, poDisplayName } from "../unit-origin";
import { deliveryPoProgress, deliveryProgressTotals, type DeliveryPieceProgress, type DeliveryPieceState } from "./customer-delivery-progress-data";

const states = ["COMPLETE", "PARTIAL", "PENDING"] as const;
const styles = {
  COMPLETE: { label: "Complete", icon: CheckCircle2, card: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-100 text-emerald-800" },
  PARTIAL: { label: "Partial", icon: CircleDot, card: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-900" },
  PENDING: { label: "Pending", icon: Circle, card: "border-slate-300 bg-slate-50", badge: "bg-slate-200 text-slate-700" },
} satisfies Record<DeliveryPieceState, { label: string; icon: typeof Circle; card: string; badge: string }>;

const recordedLabel = (run: CustomerDeliveryRun, manual: boolean) =>
  run.status === "CLOSED" ? "Delivered" : manual ? "Recorded" : "Scanned";

export function DeliveryProgressSummary({ run, manual = false }: { run: CustomerDeliveryRun; manual?: boolean }) {
  const totals = deliveryProgressTotals(run);
  return <div className="space-y-2" role="group" aria-label="Delivery progress">
    <dl className="grid grid-cols-3 gap-2 text-sm">
      <div className="min-w-0 rounded-lg bg-blue-50 px-3 py-2 text-blue-950">
        <dt className="text-xs text-blue-800">{recordedLabel(run, manual)}</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{totals.scanned.toLocaleString()}</dd>
      </div>
      <div className="min-w-0 rounded-lg bg-slate-100 px-3 py-2 text-slate-950">
        <dt className="text-xs text-slate-600">Expected</dt>
        <dd className={`mt-1 font-semibold ${totals.unknown ? "text-sm" : "text-lg tabular-nums"}`}>{totals.expected === null ? "To confirm" : totals.expected.toLocaleString()}</dd>
      </div>
      <div className={`min-w-0 rounded-lg px-3 py-2 ${totals.pending > 0 || totals.unknown ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"}`}>
        <dt className="text-xs">Pending</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{totals.pending.toLocaleString()}{totals.unknown ? "+" : ""}</dd>
      </div>
    </dl>
    <p className="text-xs text-slate-500">Physical parts{totals.pieces > 0 ? ` · ${totals.pieces.toLocaleString()} ${totals.pieces === 1 ? "piece" : "pieces"}` : ""}</p>
    {totals.unknown && <p className="text-xs text-amber-800">Some expected quantities still need confirmation.</p>}
  </div>;
}

type RemovePart = (item: CustomerDeliveryItem, allocation: { storeId: number | null; storeName: string }, partType: FactoryPartType) => void;

function PieceCounts({ pieces }: { pieces: DeliveryPieceProgress[] }) {
  const counts = { COMPLETE: 0, PARTIAL: 0, PENDING: 0 };
  for (const piece of pieces) counts[piece.state]++;
  return <span className="flex flex-wrap gap-1.5" role="group" aria-label="Piece progress">
    {states.map((state) => {
      const { icon: Icon, badge, label } = styles[state];
      return <span key={state} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${badge}`}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{counts[state]}</span> {label}
      </span>;
    })}
  </span>;
}

function Piece({ piece, run, manual, removePartDisabled, onRemovePart }: {
  piece: DeliveryPieceProgress;
  run: CustomerDeliveryRun;
  manual: boolean;
  removePartDisabled: boolean;
  onRemovePart: RemovePart;
}) {
  const { item } = piece;
  const style = styles[piece.state];
  const pendingItem = run.pendingItems.find((pending) => pending.lineNumber === item.lineNumber && pending.source === item.source && pending.poNumber === item.poNumber && pending.orderNumber === item.orderNumber);
  const detail = [item.system, item.configuration].filter(Boolean).join(" · ");
  const description = item.description.trim();
  const recorded = recordedLabel(run, manual).toLowerCase();
  return <li className={`space-y-2 rounded-xl border border-l-4 p-3 ${style.card}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Mark {item.mark || "—"}</p>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>{style.label}</span>
    </div>
    <div className="min-w-0 space-y-1">
      <p className="break-words font-semibold text-slate-950">{item.product || description || "Piece"}</p>
      {detail && <p className="break-words text-xs text-slate-600">{detail}</p>}
      {description && description !== item.product && <p className="break-words text-sm text-slate-700">{description}</p>}
      <p className="break-words font-mono text-xs text-slate-500">Line {item.lineNumber}</p>
    </div>
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-slate-800">
      <p><strong className="tabular-nums">{piece.scanned.toLocaleString()}{piece.expected === null ? "" : ` / ${piece.expected.toLocaleString()}`}</strong> parts {recorded}</p>
      {(piece.pending > 0 || piece.unknown) && <p className="font-medium text-amber-900">{piece.pending.toLocaleString()}{piece.unknown ? "+" : ""} pending</p>}
    </div>
    {piece.unknown && <p className="text-xs text-amber-800">Expected quantity needs confirmation.</p>}
    {piece.scanned > 0 && factoryPartsText(item.parts) && <p className="text-xs text-slate-600">{recordedLabel(run, manual)}: {factoryPartsText(item.parts)}</p>}
    {pendingItem && factoryPartsText(pendingItem.parts) && <p className="text-xs font-medium text-amber-900">Pending: {factoryPartsText(pendingItem.parts)}</p>}
    {piece.allocations.length > 0 && <div className="space-y-2 pt-1">
      {piece.allocations.map((allocation) => <div key={allocation.storeId ?? "unassigned"} className="space-y-2 rounded-lg border border-white/80 bg-white/75 p-2.5">
        <p className="text-xs text-slate-600"><strong>From {allocation.storeName}</strong> · {allocation.quantity.toLocaleString()} {allocation.quantity === 1 ? "part" : "parts"}{factoryPartsText(allocation.parts) ? ` · ${factoryPartsText(allocation.parts)}` : ""}</p>
        {run.status === "ACTIVE" && <div className="flex flex-wrap gap-2">
          {(["DOOR", "FRAME", "WINDOW"] as const).filter((type) => (allocation.parts?.[type] ?? 0) > 0).map((type) => <Button
            key={type}
            type="button"
            size="sm"
            variant="outline"
            className="h-auto min-h-9 max-w-full whitespace-normal text-left"
            disabled={removePartDisabled}
            onClick={() => onRemovePart(item, allocation, type)}
          >Remove one {type === "DOOR" ? "panel" : type === "FRAME" ? "frame" : "part"} from {allocation.storeName}</Button>)}
        </div>}
      </div>)}
    </div>}
  </li>;
}

export function DeliveryPoProgress({ run, manual = false, removePoDisabled, removePartDisabled, onRemovePo, onRemovePart }: {
  run: CustomerDeliveryRun;
  manual?: boolean;
  removePoDisabled: boolean;
  removePartDisabled: boolean;
  onRemovePo: (order: CustomerDeliveryRunOrder) => void;
  onRemovePart: RemovePart;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const id = useId();
  const groups = deliveryPoProgress(run);
  if (!groups.length) return <p className="text-sm text-muted-foreground">No POs added yet.</p>;
  return <div className="space-y-3">
    {groups.map(({ order, pieces, scanned, pending, unknown, expected }, index) => {
      const open = Boolean(expanded[`${run.id}:${order.key}`]);
      const panelId = `${id}-po-${index}`;
      const headingId = `${panelId}-heading`;
      return <section key={order.key} className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-start gap-1 p-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            id={headingId}
            className="min-w-0 flex-1 space-y-2 rounded-lg p-2 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => setExpanded((previous) => ({ ...previous, [`${run.id}:${order.key}`]: !open }))}
          >
            <span className="flex items-start gap-2">
              {open ? <ChevronDown className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <ChevronRight className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block break-words font-semibold">PO {order.poNumber}<PoName unit={order} /></span>
                <span className="block text-xs text-slate-500">{order.source === "EXTERNAL" ? "External PO" : `Order ${order.orderNumber}`}</span>
              </span>
            </span>
            <span className="block pl-7 text-sm text-slate-700"><strong className="tabular-nums">{scanned.toLocaleString()}{expected === null ? "" : ` / ${expected.toLocaleString()}`}</strong> parts {recordedLabel(run, manual).toLowerCase()} · {pending.toLocaleString()}{unknown ? "+" : ""} pending</span>
            {unknown && <span className="block pl-7 text-xs text-amber-800">Expected total to be confirmed</span>}
            <span className="block pl-7"><PieceCounts pieces={pieces} /></span>
          </button>
          {run.status === "ACTIVE" && <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-slate-500 hover:text-red-700"
            aria-label={`Remove PO ${order.poNumber}`}
            title={(order.canRemove ?? order.totalParts === 0) ? `Remove PO ${order.poNumber}` : "Correct this PO's recorded parts before removing it."}
            disabled={removePoDisabled || !(order.canRemove ?? order.totalParts === 0)}
            onClick={() => onRemovePo(order)}
          ><X className="size-4" aria-hidden="true" /></Button>}
        </div>
        <div id={panelId} role="region" aria-labelledby={headingId} hidden={!open} className="border-t p-3">
          {open && (pieces.length ? <ul className="space-y-3" aria-label={`Pieces for PO ${order.poNumber}${poDisplayName(order) ? ` · ${poDisplayName(order)}` : ""}`}>
            {pieces.map((piece) => <Piece key={piece.key} piece={piece} run={run} manual={manual} removePartDisabled={removePartDisabled} onRemovePart={onRemovePart} />)}
          </ul> : <p className="text-sm text-slate-600">No remaining parts for this PO.</p>)}
        </div>
      </section>;
    })}
  </div>;
}
