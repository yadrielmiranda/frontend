import type { Branding } from "@/app/api/brandings.api";
import type { MaterialSale } from "@/app/api/materials.api";
import { materialDocumentTitle, materialPublicSaleStatus } from "./material-sale-status";

type InvoiceCompany = Pick<Branding, "name" | "street" | "city" | "state" | "postalCode" | "phone" | "email" | "website">;

export const materialInvoiceStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #edf1f5; color: #142033; font: 13px/1.5 Arial, sans-serif; }
  .toolbar { max-width: 900px; margin: 24px auto 16px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 16px; }
  .toolbar p { margin: 0; color: #536177; font-size: 12px; }
  button { border: 0; border-radius: 6px; padding: 12px 20px; background: #121a2c; color: white; font: bold 13px Arial, sans-serif; cursor: pointer; }
  .document { max-width: 900px; margin: 0 auto 32px; padding: 46px; background: white; border-top: 5px solid #cf1724; }
  .header { display: flex; justify-content: space-between; gap: 28px; padding-bottom: 25px; border-bottom: 1px solid #d8dfe8; }
  .seller { flex: 1; min-width: 0; }
  .seller-name { font-size: 20px; font-weight: bold; margin: 0 0 9px; color: #121a2c; }
  .seller p, .customer p, .reference p { margin: 2px 0; overflow-wrap: anywhere; }
  .reference { max-width: 45%; text-align: right; }
  h1 { font-size: 28px; line-height: 1.15; margin: 0 0 10px; }
  .reference .code { font-size: 15px; font-weight: bold; }
  .muted { color: #647187; }
  .details { display: flex; justify-content: space-between; gap: 24px; margin: 25px 0; }
  .customer { max-width: 58%; }
  .label { text-transform: uppercase; font-size: 10px; font-weight: bold; letter-spacing: 1px; color: #647187; margin: 0 0 7px; }
  .customer-name { font-weight: bold; font-size: 15px; }
  .status { min-width: 165px; }
  .status p { margin: 3px 0; }
  .status-value { font-weight: bold; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th { background: #f2f4f7; color: #526078; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  th, td { padding: 12px 10px; vertical-align: top; border-bottom: 1px solid #e3e8ee; overflow-wrap: anywhere; }
  th:first-child, td:first-child { padding-left: 0; width: 52%; }
  th:not(:first-child), td:not(:first-child) { text-align: right; }
  th:nth-child(2) { width: 10%; }
  th:nth-child(3), th:nth-child(4) { width: 19%; }
  .product { font-weight: bold; margin-bottom: 3px; }
  .presentation { color: #647187; font-size: 11px; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .totals { width: 330px; max-width: 100%; margin: 24px 0 0 auto; break-inside: avoid; page-break-inside: avoid; }
  .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; }
  .total-row dd { margin: 0; text-align: right; }
  .grand-total { border-top: 1px solid #d8dfe8; margin-top: 5px; padding-top: 12px; font-weight: bold; font-size: 17px; }
  .balance { font-weight: bold; }
  .pickup { padding: 16px; margin-top: 30px; border: 1px solid #d8dfe8; border-radius: 6px; break-inside: avoid; page-break-inside: avoid; }
  .pickup h2 { font-size: 14px; margin: 0 0 6px; }
  .pickup p { margin: 4px 0; }
  .footer { border-top: 1px solid #e3e8ee; padding-top: 14px; margin-top: 26px; font-size: 10px; color: #647187; break-inside: avoid; page-break-inside: avoid; }
  @media screen and (max-width: 640px) { .document { padding: 22px; } .header, .details { flex-direction: column; } .reference { max-width: 100%; text-align: left; } .customer { max-width: 100%; } .toolbar { align-items: flex-start; flex-direction: column; } }
  @media print { @page { size: auto; margin: 15mm; } body { background: white; font-size: 10pt; } .toolbar { display: none; } .document { max-width: none; margin: 0; padding: 18px 0 0; border-top: 3px solid #cf1724; } .header, .details, .pickup, .footer { break-inside: avoid; page-break-inside: avoid; } th { background: #f2f4f7; print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
`;

/** All customer, company and product values are written as text, never parsed as HTML. */
export function renderMaterialInvoice(doc: Document, sale: MaterialSale, company: InvoiceCompany | null, generatedAt = new Date()) {
  const title = materialDocumentTitle(sale);
  const currency = (sale.currency || "USD").toUpperCase();
  const amount = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
  const date = (value: string) => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  function element(tag: string, className?: string, text?: string) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function paragraph(parent: HTMLElement, text: string | null | undefined, className?: string) {
    if (text) parent.appendChild(element("p", className, text));
  }
  doc.documentElement.lang = "en";
  doc.head.replaceChildren();
  doc.body.replaceChildren();
  doc.title = `${title} ${sale.code}`;
  const meta = doc.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; doc.head.appendChild(meta);
  const style = element("style"); style.textContent = materialInvoiceStyles; doc.head.appendChild(style);
  const toolbar = element("div", "toolbar");
  paragraph(toolbar, "Print this document or choose Save as PDF in your print options.");
  const print = element("button", undefined, "Print / Save PDF"); print.onclick = () => doc.defaultView?.print(); toolbar.appendChild(print); doc.body.appendChild(toolbar);

  const document = element("main", "document"); doc.body.appendChild(document);
  const header = element("header", "header"); document.appendChild(header);
  const seller = element("div", "seller"); header.appendChild(seller);
  paragraph(seller, company?.name?.trim() || "Authentic Evolution Co", "seller-name");
  paragraph(seller, company?.street);
  paragraph(seller, [company?.city, [company?.state, company?.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  paragraph(seller, company?.phone);
  paragraph(seller, company?.email);
  paragraph(seller, company?.website);
  const reference = element("div", "reference"); header.appendChild(reference);
  reference.appendChild(element("h1", undefined, title));
  paragraph(reference, sale.code, "code");
  paragraph(reference, `Order date: ${date(sale.createdAt)}`, "muted");
  paragraph(reference, `Currency: ${currency}`, "muted");

  const details = element("div", "details"); document.appendChild(details);
  const customer = element("section", "customer"); details.appendChild(customer);
  paragraph(customer, "Bill to", "label");
  paragraph(customer, sale.customerName, "customer-name");
  paragraph(customer, sale.customerEmail);
  paragraph(customer, sale.customerPhone);
  const status = element("section", "status"); details.appendChild(status);
  paragraph(status, "Order status", "label");
  paragraph(status, materialPublicSaleStatus(sale), "status-value");
  const paymentStatus = sale.paymentStatus === "PAID" && Number(sale.balance) <= 0 ? "Paid" : Number(sale.paidAmount) > 0 ? "Partially paid" : "Unpaid";
  paragraph(status, `Payment: ${paymentStatus}`);
  if (sale.deliveredAt) paragraph(status, `Delivered: ${date(sale.deliveredAt)}`, "muted");

  const table = element("table"); table.setAttribute("aria-label", "Order items"); document.appendChild(table);
  const head = element("thead"), heading = element("tr"); head.appendChild(heading); table.appendChild(head);
  for (const label of ["Material", "Qty", "Unit price", "Amount"]) { const th = element("th", undefined, label); th.setAttribute("scope", "col"); heading.appendChild(th); }
  const body = element("tbody"); table.appendChild(body);
  for (const line of sale.lines) {
    const row = element("tr"), product = element("td"); body.appendChild(row); row.appendChild(product);
    product.appendChild(element("div", "product", line.productName));
    product.appendChild(element("div", "presentation", `${line.presentationName} · ${line.productCode}`));
    for (const value of [Number(line.quantity).toLocaleString("en-US"), amount(line.unitPrice), amount(line.lineTotal)]) row.appendChild(element("td", undefined, value));
  }
  const totals = element("dl", "totals"); document.appendChild(totals);
  function total(label: string, value: string | number, className = "") {
    const row = element("div", `total-row ${className}`);
    row.appendChild(element("dt", undefined, label)); row.appendChild(element("dd", undefined, amount(value))); totals.appendChild(row);
  }
  total("Subtotal", sale.subtotal);
  if (Number(sale.discountAmount) > 0) total("Discount", -Number(sale.discountAmount));
  total(`Sales tax (${sale.taxRate}%)`, sale.taxAmount);
  total("Total", sale.total, "grand-total");
  total("Paid", sale.paidAmount);
  total("Balance due", sale.balance, "balance");

  const pickup = element("section", "pickup"); document.appendChild(pickup);
  pickup.appendChild(element("h2", undefined, sale.status === "DELIVERED" ? "Order collected" : "Warehouse pickup"));
  if (sale.status === "CANCELED") paragraph(pickup, "This order has been canceled and cannot be collected.");
  else if (sale.status === "DRAFT") paragraph(pickup, "This is a draft order summary. The order must be confirmed and fully paid before pickup.");
  else if (sale.status === "DELIVERED") paragraph(pickup, "This order has already been delivered.");
  else if (sale.status !== "CONFIRMED") paragraph(pickup, "This order is awaiting confirmation and is not ready for pickup.");
  else {
    paragraph(pickup, `Show order number ${sale.code} on your phone or bring this document when collecting your materials.`);
    if (Number(sale.balance) > 0) paragraph(pickup, "Full payment is required before pickup.");
  }
  paragraph(pickup, "Warehouse staff will verify the current payment and delivery status in the system before handing over materials.", "muted");
  const footer = element("footer", "footer"); document.appendChild(footer);
  paragraph(footer, `Order reference: ${sale.code} · Generated ${generatedAt.toLocaleString("en-US")}`);
  paragraph(footer, "Amounts and status reflect the order at the time this document was generated.");
}
