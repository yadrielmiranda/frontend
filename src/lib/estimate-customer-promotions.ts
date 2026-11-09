import type { EstimateWithRelations } from "@/lib/types";

// Solo controla la presentación del reporte del cliente; no modifica precios.
export function customerCanSeePromotions(estimate: EstimateWithRelations) {
  // El enlace público recibe la decisión del servidor, sin datos del dealer.
  if (typeof estimate.customerPromotionsVisible === "boolean") {
    return estimate.customerPromotionsVisible;
  }
  // Saved client quotes remain client quotes after their owner becomes a dealer.
  return estimate.dealerModeSnapshot !== "EXTERNAL";
}
