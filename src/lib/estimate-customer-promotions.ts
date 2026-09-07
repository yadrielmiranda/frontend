import type { EstimateWithRelations } from "@/lib/types";
import { isDealerRole } from "@/lib/rbac";

// Solo controla la presentación del reporte del cliente; no modifica precios.
export function customerCanSeePromotions(estimate: EstimateWithRelations) {
  // El enlace público recibe la decisión del servidor, sin datos del dealer.
  if (typeof estimate.customerPromotionsVisible === "boolean") {
    return estimate.customerPromotionsVisible;
  }
  if (!isDealerRole(estimate.user?.role?.name)) return true;

  const isActive = estimate.status?.name === "Active" && !estimate.order;
  const mode = isActive
    ? estimate.user?.dealerMode ?? estimate.dealerModeSnapshot ?? "EXTERNAL"
    : estimate.dealerModeSnapshot ?? estimate.user?.dealerMode ?? "EXTERNAL";

  return mode === "INTERNAL";
}
