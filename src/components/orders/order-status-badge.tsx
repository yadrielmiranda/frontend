"use client";

import type { CompanyLocale } from "@/components/company/company-content";

const spanishStatuses = new Map([
  ["pending", "Pendiente"],
  ["in production", "En producción"],
  ["awaiting release", "Pendiente de liberación"],
  ["preparing for pickup", "En preparación para recogida"],
  ["ready to pick up", "Lista para recoger"],
  ["picked up", "Recogida"],
  ["delivered", "Entregada"],
  ["installation in progress", "Instalación en curso"],
  ["installed", "Instalada"],
]);

export function orderStatusLabel(name: string, locale: CompanyLocale) {
  return locale === "es" ? spanishStatuses.get(name.toLowerCase().trim()) ?? name : name;
}

export function OrderStatusBadge({ name, locale = "en" }: { name?: string | null; locale?: CompanyLocale }) {
  const statusName = (name ?? "").trim();

  let colorClasses = "bg-gray-100 text-gray-800";
  
  if (statusName === "Pending") colorClasses = "bg-gray-100 text-gray-800";
  if (statusName === "In production") colorClasses = "bg-yellow-100 text-yellow-800";
  if (statusName === "Awaiting release") colorClasses = "bg-orange-100 text-orange-800";
  if (statusName === "Preparing for pickup") colorClasses = "bg-cyan-100 text-cyan-800";
  if (statusName === "Delivered") colorClasses = "bg-green-100 text-green-800";
  if (statusName === "Picked up") colorClasses = "bg-emerald-100 text-emerald-800";
  if (statusName === "Ready to pick up") colorClasses = "bg-blue-100 text-blue-800";
  if (statusName === "Installation in progress") colorClasses = "bg-purple-100 text-purple-800";
  if (statusName === "Installed") colorClasses = "bg-emerald-100 text-emerald-800";

  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorClasses}`}>
      {orderStatusLabel(statusName, locale) || "-"}
    </span>
  );
}
