"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { technicianCustomerDelivery } from "@/app/api/technician.api";
import type { CustomerDelivery } from "@/app/api/warehouse.api";
import { isApiError } from "@/app/api/_base";
import { Button } from "@/components/ui/button";
import { CustomerDeliveryReceipt } from "@/app/warehouse/customer-deliveries/customer-delivery-receipt";

export function TechnicianCustomerDeliveryReceiptClient({ id, actorId }: { id: number; actorId: number }) {
  const { user, isLoading } = useAuth();
  const sameAccount = user?.id === actorId && user?.role?.name === "technician";
  const [delivery, setDelivery] = useState<CustomerDelivery | null>(null);
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isLoading || !sameAccount) return;
    let canceled = false;
    setLoading(true); setError(""); setDelivery(null);
    void technicianCustomerDelivery(id).then(result => {
      if (canceled) return;
      if (result.id !== id || result.source !== "TRANSIT") throw new Error("The delivery receipt could not be verified.");
      setDelivery(result);
    }).catch(reason => {
      if (canceled) return;
      setError(isApiError(reason) && reason.status === 404 ? "This delivery receipt is not available for your account." : reason instanceof Error ? reason.message : "Unable to load the delivery receipt.");
    }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [id, isLoading, sameAccount, attempt]);

  if (isLoading) return <p role="status">Verifying your session…</p>;
  if (!sameAccount) return <p role="alert" className="rounded-xl border bg-amber-50 p-4">Your account has changed. <Link href="/technician" className="underline">Return to technician home</Link> to continue.</p>;
  return <div className="space-y-5">
    <header className="space-y-3"><h1 className="text-2xl font-semibold">Delivery #{id}</h1><div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="min-h-11"><Link href="/technician">Technician home</Link></Button><Button asChild variant="outline" className="min-h-11"><Link href="/technician/customer-deliveries/new">Another delivery</Link></Button><Button className="min-h-11" disabled={loading || !delivery} onClick={() => window.print()}><Printer className="mr-2 size-4" />Print / Save PDF</Button></div></header>
    {loading && <p role="status">Loading signed receipt…</p>}
    {error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><Button variant="outline" className="min-h-11" onClick={() => setAttempt(value => value + 1)}>Try again</Button></div>}
    {delivery && <><p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Delivery recorded. These parts have been handed over to the recipient.</p><div data-customer-delivery-print><CustomerDeliveryReceipt delivery={delivery} /></div><style>{`
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
    `}</style></>}
  </div>;
}
