import type { MaterialSale } from "@/app/api/materials.api";

export function materialPublicSaleStatus(sale: MaterialSale) {
  if (sale.status === "CANCELED") return "Canceled";
  if (sale.status === "DELIVERED") return "Delivered";
  if (sale.status === "DRAFT") return "Draft";
  if (sale.status === "CONFIRMED") {
    return sale.paymentStatus === "PAID" && Number(sale.balance) <= 0
      ? "Ready for pickup" : "Pending payment";
  }
  return "Awaiting confirmation";
}

export function materialDocumentTitle(sale: MaterialSale) {
  return sale.status === "CONFIRMED" || sale.status === "DELIVERED" ? "Invoice" : "Order summary";
}
