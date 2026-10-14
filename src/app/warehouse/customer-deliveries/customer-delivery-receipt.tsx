import type { CustomerDelivery, CustomerDeliveryItem } from "@/app/api/warehouse.api";

export type CustomerDeliveryPreview = Pick<CustomerDelivery,
  "source" | "storeId" | "storeName" | "firstName" | "lastName" |
  "signatureStrokes" | "items" | "totalPieces" | "totalParts"
>;

export type CustomerDeliveryReceiptData = CustomerDeliveryPreview &
  Partial<Pick<CustomerDelivery, "id" | "actor" | "createdAt">>;

function groupItems(items: CustomerDeliveryItem[]) {
  const groups = new Map<string, { poNumber: string; source: CustomerDeliveryItem["source"]; orderNumber: string; items: CustomerDeliveryItem[] }>();
  for (const item of items) {
    const key = JSON.stringify([item.source, item.orderNumber, item.poNumber]);
    const group = groups.get(key) ?? { poNumber: item.poNumber, source: item.source, orderNumber: item.orderNumber, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

function pieceDescription(item: CustomerDeliveryItem) {
  return item.description.trim() || [item.product, item.system, item.configuration].filter(Boolean).join(" · ") || "Piece";
}

/** Only the quantities in this delivery are shown, including partial deliveries. */
export function CustomerDeliveryReceipt({
  delivery,
  showSignature = true,
}: {
  delivery: CustomerDeliveryReceiptData;
  showSignature?: boolean;
}) {
  const groups = groupItems(delivery.items);
  const date = delivery.createdAt ? new Date(delivery.createdAt) : null;
  return (
    <article className="customer-delivery-document space-y-6 rounded-2xl border bg-white p-5 text-slate-950 sm:p-7">
      <header className="delivery-document-header space-y-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{delivery.id === undefined ? "Review your delivery" : "Goods received"}</p>
            <h2 className="mt-1 text-2xl font-semibold">Customer delivery receipt</h2>
          </div>
          {delivery.id !== undefined && <p className="rounded-lg border px-3 py-2 text-sm font-semibold">Delivery #{delivery.id}</p>}
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Delivered from</dt><dd className="mt-1 font-medium">{delivery.source === "TRANSIT" ? "Direct from factory" : delivery.storeName || "Unassigned warehouse stock"}</dd></div>
          {date && !Number.isNaN(date.getTime()) && <div><dt className="text-slate-500">Recorded on</dt><dd className="mt-1"><time dateTime={delivery.createdAt}>{date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time></dd></div>}
          {delivery.actor && <div><dt className="text-slate-500">Recorded by</dt><dd className="mt-1 break-words">{delivery.actor}</dd></div>}
        </dl>
      </header>

      <div className="space-y-6">
        {groups.map(([key, group]) => {
          const pieces = new Set(group.items.map(item => item.lineNumber)).size;
          const parts = group.items.reduce((sum, item) => sum + item.quantity, 0);
          return <section key={key} className="delivery-po-group">
            <div className="delivery-po-heading flex flex-wrap items-center justify-between gap-2 rounded-t-lg bg-slate-50 px-3 py-3">
              <h3 className="break-words font-semibold">{group.poNumber ? `PO ${group.poNumber}` : "PO not assigned"}</h3>
              <span className="text-xs text-slate-600">{group.source === "EXTERNAL" ? "External PO" : group.orderNumber ? `Order ${group.orderNumber}` : "System order"}</span>
            </div>
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Pieces and physical parts delivered for {group.poNumber ? `PO ${group.poNumber}` : "this order"}</caption>
              <thead className="border-b text-xs text-slate-500"><tr><th scope="col" className="px-3 py-2 font-medium">Piece</th><th scope="col" className="w-24 px-2 py-2 font-medium sm:w-32">Line number</th><th scope="col" className="w-20 px-3 py-2 text-right font-medium">Parts</th></tr></thead>
              <tbody>{group.items.map(item => <tr key={`${item.lineNumber}:${item.barcode}`} className="border-b align-top">
                <td className="break-words px-3 py-3"><p className="font-medium">{pieceDescription(item)}</p>{item.mark && <p className="mt-1 text-xs text-slate-500">Mark: {item.mark}</p>}</td>
                <td className="break-words px-2 py-3 font-mono text-xs">{item.lineNumber}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">{item.quantity.toLocaleString()}</td>
              </tr>)}</tbody>
            </table>
            <p className="mt-2 text-right text-xs text-slate-600">{pieces.toLocaleString()} {pieces === 1 ? "piece" : "pieces"} · {parts.toLocaleString()} physical {parts === 1 ? "part" : "parts"}</p>
          </section>;
        })}
      </div>

      <dl className="delivery-totals flex flex-wrap justify-end gap-x-8 gap-y-2 border-t pt-4 text-sm">
        <div className="flex gap-3"><dt>Total pieces</dt><dd className="font-semibold tabular-nums">{delivery.totalPieces.toLocaleString()}</dd></div>
        <div className="flex gap-3"><dt>Total physical parts</dt><dd className="font-semibold tabular-nums">{delivery.totalParts.toLocaleString()}</dd></div>
      </dl>

      {showSignature && <section className="delivery-signature space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Received by</h3>{delivery.id !== undefined && <p className="text-xs text-slate-500">Delivery #{delivery.id} · {delivery.totalPieces.toLocaleString()} pieces · {delivery.totalParts.toLocaleString()} parts</p>}</div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">First name</dt><dd className="mt-1 break-words font-medium">{delivery.firstName}</dd></div>
          <div><dt className="text-slate-500">Last name</dt><dd className="mt-1 break-words font-medium">{delivery.lastName}</dd></div>
        </dl>
        <div className="max-w-xl">
          <p className="mb-2 text-sm text-slate-500">Recipient signature</p>
          <svg viewBox="0 0 1000 300" role="img" aria-label={`Signature of ${delivery.firstName} ${delivery.lastName}`} className="h-auto w-full rounded-lg border bg-white">
            {delivery.signatureStrokes.map((stroke, index) => <polyline key={index} points={stroke.map(point => `${point.x * 1000},${point.y * 300}`).join(" ")} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
          </svg>
        </div>
        <p className="text-sm text-slate-600">I acknowledge receipt of the pieces and physical parts listed above.</p>
      </section>}
    </article>
  );
}
