"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { materialSale, type MaterialPayment, type MaterialSale } from "@/app/api/materials.api";
import { getPublicCompanyBranding } from "@/app/api/brandings.api";
import { MaterialNotice, money, materialPanelClass } from "./materials-shared";
import { renderMaterialInvoice } from "./material-invoice";
import { materialDocumentTitle, materialPublicSaleStatus } from "./material-sale-status";

export { materialPublicSaleStatus } from "./material-sale-status";

export function MaterialSaleSummary({ sale, publicView = false, loadSale }: { sale: MaterialSale; publicView?: boolean; loadSale?: () => Promise<MaterialSale> }) {
  const [printError, setPrintError] = useState("");
  const [printing, setPrinting] = useState(false);
  const printLock = useRef(false);
  const canPrint = !publicView || Boolean(loadSale);
  async function printInvoice() {
    if (printLock.current || !canPrint) return;
    const popup = window.open("", "_blank", "width=1000,height=850");
    if (!popup) { setPrintError("Allow pop-ups to open your invoice."); return; }
    popup.opener = null;
    popup.document.title = "Preparing order document";
    popup.document.body.textContent = "Loading the latest order details…";
    printLock.current = true; setPrinting(true); setPrintError("");
    try {
      const [currentSale, company] = await Promise.all([loadSale ? loadSale() : materialSale(sale.id), getPublicCompanyBranding()]);
      if (currentSale.id !== sale.id) throw new Error("Unable to verify this order. Refresh the page and try again.");
      if (!popup.closed) { renderMaterialInvoice(popup.document, currentSale, company); popup.focus(); }
    } catch (error) {
      popup.close();
      setPrintError(error instanceof Error ? error.message : "Unable to load your invoice. Please try again.");
    } finally { printLock.current = false; setPrinting(false); }
  }
  return <section className={materialPanelClass}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold">{sale.code}</h2><p className="mt-1 text-sm text-muted-foreground">{sale.customerName}</p></div><div className="space-y-2 text-sm sm:text-right"><p>{publicView ? materialPublicSaleStatus(sale) : sale.status.replaceAll("_", " ")}</p><p className="text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>{canPrint && <Button variant="outline" size="sm" disabled={printing} onClick={printInvoice}>{printing ? "Preparing document…" : `Print ${materialDocumentTitle(sale).toLowerCase()}`}</Button>}</div></div>
    <MaterialNotice error={printError} />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 pr-4">Material</th><th className="py-2 pr-4 text-right">Qty</th><th className="py-2 pr-4 text-right">Price</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{sale.lines.map(line => <tr key={line.id} className="border-b last:border-0"><td className="py-3 pr-4"><p className="font-medium">{line.productName}</p><p className="text-xs text-muted-foreground">{line.presentationName} · {line.productCode}{!publicView && line.storeName ? ` · ${line.storeName}` : ""}</p></td><td className="py-3 pr-4 text-right">{line.quantity}</td><td className="py-3 pr-4 text-right">{money(line.unitPrice)}</td><td className="py-3 text-right">{money(line.lineTotal)}</td></tr>)}</tbody></table></div>
    <dl className="ml-auto max-w-xs space-y-2 text-sm"><div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>{Number(sale.discountAmount) > 0 && <div className="flex justify-between gap-4"><dt>Discount</dt><dd>−{money(sale.discountAmount)}</dd></div>}<div className="flex justify-between gap-4"><dt>Sales tax ({sale.taxRate}%)</dt><dd>{money(sale.taxAmount)}</dd></div><div className="flex justify-between gap-4 border-t pt-2 font-semibold"><dt>Total</dt><dd>{money(sale.total)}</dd></div><div className="flex justify-between gap-4"><dt>Paid</dt><dd>{money(sale.paidAmount)}</dd></div><div className="flex justify-between gap-4 text-lg font-semibold"><dt>Balance</dt><dd>{money(sale.balance)}</dd></div></dl>
    {!publicView && sale.note && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{sale.note}</p>}
  </section>;
}

export function MaterialSaleReceipts({ sale, publicView = false }: { sale: MaterialSale; publicView?: boolean }) {
  const [error, setError] = useState("");
  function print(payment: MaterialPayment) {
    const popup = window.open("", "_blank", "width=800,height=650");
    if (!popup) { setError("Allow pop-ups to open the receipt."); return; }
    const doc = popup.document; doc.title = `${payment.receiptCode} · ${sale.code}`;
    const style = doc.createElement("style"); style.textContent = "body{font:15px Arial,sans-serif;max-width:720px;margin:40px auto;padding:20px;color:#17202a}p{line-height:1.5}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}button{padding:10px 20px}@media print{button{display:none}@page{margin:16mm}}"; doc.head.appendChild(style);
    const button = doc.createElement("button"); button.textContent = "Print receipt"; button.onclick = () => popup.print(); doc.body.appendChild(button);
    const heading = doc.createElement("h1"); heading.textContent = `Payment receipt ${payment.receiptCode}`; doc.body.appendChild(heading);
    for (const text of [`Sale: ${sale.code}`, `Customer: ${sale.customerName}`, `Date: ${new Date(payment.paidAt ?? payment.createdAt).toLocaleString()}`, `Payment method: ${payment.paymentMethod}`, `Amount received: ${money(payment.amount)}`, ...(Number(payment.refundedAmount) > 0 ? [`Refunded: ${money(payment.refundedAmount)}`] : []), `Sale total: ${money(sale.total)}`, `Current balance: ${money(sale.balance)}`]) { const p = doc.createElement("p"); p.textContent = text; doc.body.appendChild(p); }
    const table = doc.createElement("table");
    for (const line of sale.lines) { const row = doc.createElement("tr"); for (const text of [line.productName, line.presentationName, String(line.quantity), money(line.lineTotal)]) { const cell = doc.createElement("td"); cell.textContent = text; row.appendChild(cell); } table.appendChild(row); } doc.body.appendChild(table);
  }
  return <section className={materialPanelClass}><h3 className="font-semibold">Payments and receipts</h3><MaterialNotice error={error} /><div className="divide-y">{sale.payments.map(payment => <article key={payment.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"><div className="space-y-1"><p className="font-medium">{money(payment.amount)} · {payment.paymentMethod}</p><p className="text-xs text-muted-foreground">{payment.status} · {new Date(payment.paidAt ?? payment.createdAt).toLocaleString()}</p>{Number(payment.refundedAmount) > 0 && <p className="text-xs">Refunded: {money(payment.refundedAmount)}</p>}{!publicView && payment.reference && <p className="text-xs text-muted-foreground">Reference: {payment.reference}</p>}</div>{payment.status === "PAID" && <Button variant="outline" size="sm" onClick={() => print(payment)}>Receipt {payment.receiptCode}</Button>}</article>)}</div>{!sale.payments.length && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}</section>;
}
