"use client";

import { useEffect, useRef, useState } from "react";
import type { CustomerDelivery } from "@/app/api/warehouse.api";
import { Button } from "@/components/ui/button";
import { PoName } from "@/app/warehouse/unit-origin";
import { CustomerDeliveryClient } from "@/app/warehouse/customer-deliveries/customer-delivery-client";
import { TechnicianCustomerDeliveryClient } from "./customer-deliveries/customer-delivery-client";
import { emptyPickupCustomerDelivery, loadPickupCustomerDelivery, type PickupDeliverySurface } from "./pickup-customer-delivery-data";

export function PickupCustomerDelivery({ actorId, surface, runId, poKey, poNumber, poName, blocked, onClose, onComplete }: {
  actorId: number; surface: PickupDeliverySurface; runId: number; poKey: string; poNumber: string; poName?: string; blocked: boolean;
  onClose: () => void; onComplete: (delivery: CustomerDelivery) => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPickupCustomerDelivery>> | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const closePickupDelivery = useRef(onClose);
  closePickupDelivery.current = onClose;
  useEffect(() => {
    let canceled = false;
    setError(""); setData(null);
    // Recover the original signed request even if its stock or pickup access has changed.
    // The delivery form validates storage and rechecks identity before its idempotent retry.
    const hasPendingDelivery = () => {
      try { return Boolean(sessionStorage.getItem(`${surface}-customer-delivery:${actorId}`)); }
      catch { return true; } // Let the form explain unavailable storage.
    };
    if (hasPendingDelivery()) {
      setData(emptyPickupCustomerDelivery(surface));
      return () => { canceled = true; };
    }
    void loadPickupCustomerDelivery(surface, runId, poKey, poNumber)
      .then(value => {
        if (canceled) return;
        // Storage may have changed while loading. Preserve any signed request for recovery.
        if (hasPendingDelivery()) {
          setData(emptyPickupCustomerDelivery(surface));
          return;
        }
        const chosen = value.options.items.find(po => po.key === poKey);
        if (!chosen || chosen.availableParts <= 0 || !chosen.lines.some(line => line.inTransit > 0)) {
          closePickupDelivery.current();
          return;
        }
        setData(value);
      })
      .catch(reason => { if (!canceled) setError(reason instanceof Error ? reason.message : "The delivery could not be opened."); });
    return () => { canceled = true; };
  }, [surface, actorId, runId, poKey, poNumber, revision]);

  const embedded = { pickupRunId: runId, blocked: blocked || Boolean(data?.options.countOpen), onClose, onComplete };
  return <section className="space-y-4">
    <p className="text-sm font-semibold text-slate-600">Factory pickup #{runId} · PO {poNumber}<PoName unit={{ poName }} /></p>
    {error ? <div className="space-y-3 rounded-xl border bg-white p-4">
      <p role="alert" className="text-sm text-red-800">{error}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onClose}>Back to pickup</Button><Button onClick={() => setRevision(value => value + 1)}>Try again</Button></div>
    </div> : !data ? <p role="status">Loading collected parts…</p> : data.surface === "warehouse"
      ? <CustomerDeliveryClient actorId={actorId} actorRole="admin" initial={data.inventory} initialStores={[]}
          initialSource="TRANSIT" initialStoreId="" initialPoKey={poKey} autoReviewPo embedded={embedded} />
      : <TechnicianCustomerDeliveryClient actorId={actorId} initial={data.options} initialPoKey={poKey} embedded={embedded} />}
  </section>;
}
