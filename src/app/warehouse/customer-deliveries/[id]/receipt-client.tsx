"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { warehouseCustomerDelivery, type CustomerDelivery } from "@/app/api/warehouse.api";
import { CustomerDeliveryReceipt } from "../customer-delivery-receipt";

export function CustomerDeliveryReceiptClient({ id, initialIdentity }: { id: number; initialIdentity: { id: number; role: string } }) {
  const { user, isLoading } = useAuth();
  const [delivery, setDelivery] = useState<CustomerDelivery | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const sameAccount = user?.id === initialIdentity.id && user?.role?.name === initialIdentity.role;

  useEffect(() => {
    if (isLoading || !sameAccount) return;
    let canceled = false;
    setLoading(true); setError(""); setDelivery(null);
    void warehouseCustomerDelivery(id).then(value => {
      if (canceled) return;
      if (value.id !== id) throw new Error("The delivery could not be verified. Please try again.");
      setDelivery(value);
    }).catch(reason => {
      if (canceled) return;
      setError(isApiError(reason) && reason.status === 404 ? "This delivery receipt could not be found." : reason instanceof Error ? reason.message : "Unable to load the delivery receipt. Please try again.");
    }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [id, isLoading, sameAccount, attempt]);

  if (isLoading) return <p role="status" className="py-8 text-sm text-muted-foreground">Verifying your session…</p>;
  if (!sameAccount) return <div role="alert" className="rounded-xl border p-5 text-sm">Your account has changed. <Link href="/warehouse" className="font-medium underline">Return to Warehouse</Link> to continue.</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">Delivery #{id}</h1>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/warehouse/history">History</Link></Button>
        <Button asChild variant="outline"><Link href="/warehouse">Inventory</Link></Button>
        <Button disabled={loading || !delivery} onClick={() => window.print()}><Printer className="mr-2 size-4" />Print / Save PDF</Button>
      </div>
    </div>
    {loading && <p role="status" className="rounded-xl border p-6 text-sm text-muted-foreground">Loading delivery receipt…</p>}
    {error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="mr-2 size-4" />Try again</Button></div>}
    {delivery && <div data-customer-delivery-print><CustomerDeliveryReceipt delivery={delivery} /></div>}
    {delivery && <style>{`
      @media print {
        @page { size: auto; margin: 14mm; }
        html, body { height: auto !important; min-height: 0 !important; background: white !important; }
        body *:not(:has([data-customer-delivery-print])):not([data-customer-delivery-print]):not([data-customer-delivery-print] *) { display: none !important; }
        body *:has([data-customer-delivery-print]) { display: block !important; position: static !important; width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; }
        [data-customer-delivery-print] { margin: 0 !important; }
        .customer-delivery-document { border: 0 !important; border-radius: 0 !important; padding: 0 !important; font-size: 10pt; color: black !important; }
        .customer-delivery-document h2 { font-size: 18pt; }
        .customer-delivery-document table { width: 100%; }
        .customer-delivery-document thead { display: table-header-group; }
        .customer-delivery-document tr, .delivery-document-header, .delivery-totals, .delivery-signature { break-inside: avoid; }
        .delivery-po-heading { break-after: avoid; }
        .delivery-signature svg { max-width: 115mm; }
      }
    `}</style>}
  </div>;
}
