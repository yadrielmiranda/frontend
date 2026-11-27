import type { CompanyLocale } from "@/components/company/company-content";

const spanishStatuses = new Map([
  ["active", "Activa"], ["ordered", "Con orden"], ["expired", "Vencida"],
  ["pending order review", "Orden pendiente de revisión"], ["canceled", "Cancelada"],
  ["signed", "Firmada"], ["approved", "Aprobada"], ["unknown", "Desconocido"],
  ["installation requested", "Instalación solicitada"],
  ["awaiting installation deposit", "Pendiente del depósito de instalación"],
  ["awaiting remeasurement schedule", "Pendiente de programar la nueva medición"],
  ["remeasurement scheduled", "Nueva medición programada"],
  ["awaiting remeasurement", "Pendiente de nueva medición"],
  ["installation quote under review", "Cotización de instalación en revisión"],
  ["awaiting internal approval", "Pendiente de aprobación interna"],
  ["awaiting customer approval", "Pendiente de aprobación del cliente"],
  ["installation approved", "Instalación aprobada"],
  ["awaiting permit payment", "Pendiente del pago del permiso"],
  ["permit processing", "Permiso en trámite"],
  ["awaiting order payment", "Pendiente del pago de la orden"],
  ["order placed", "Orden realizada"], ["awaiting required payment", "Pendiente del pago requerido"],
  ["ready to schedule installation", "Lista para programar la instalación"],
  ["scheduling", "En programación"], ["installation scheduled", "Instalación programada"],
  ["installation in progress", "Instalación en curso"], ["installed", "Instalada"],
  ["installation canceled", "Instalación cancelada"], ["estimate canceled", "Cotización cancelada"],
  ["permit revision in progress", "Revisión por cambios del permiso en curso"],
  ["remeasurement quote in progress", "Cotización de la nueva medición en preparación"],
  ["awaiting permit revision approval", "Pendiente de aprobación de los cambios del permiso"],
  ["awaiting extra-work approval", "Pendiente de aprobación del trabajo adicional"],
  ["awaiting first order installment", "Pendiente de la primera cuota de la orden"],
  ["awaiting required installments", "Pendiente del pago de las cuotas requeridas"],
  ["installed · balance due", "Instalada · Saldo pendiente"],
]);

export function estimateStatusLabel(value: string, locale: CompanyLocale) {
  return locale === "es" ? spanishStatuses.get(value.trim().toLowerCase()) ?? value : value;
}

export type EstimateStatusBadgeAppearance = {
  label: string;
  className: string;
};

export function getEstimateStatusBadgeAppearance(
  statusName: string | null | undefined,
): EstimateStatusBadgeAppearance {
  const label = statusName?.trim() || "Unknown";
  const normalized = label.toLowerCase();

  if (normalized === "active") {
    return {
      label: "Active",
      className: "bg-green-100 text-green-800",
    };
  }

  if (normalized === "pending order review") return { label: "Pending order review", className: "bg-amber-100 text-amber-900" };

  if (normalized === "ordered") {
    return {
      label: "Ordered",
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (normalized === "expired") {
    return {
      label: "Expired",
      className: "bg-red-100 text-red-800",
    };
  }

  return {
    label,
    className: "bg-gray-100 text-gray-800",
  };
}
