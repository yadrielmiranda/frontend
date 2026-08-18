"use client";

import type { ReactNode } from "react";
import type { EstimateWithRelations } from "@/lib/types";
import { formatDateEn } from "@/lib/formatters";
import { isDealerRole } from "@/lib/rbac";

function buildBrandingModel(estimate: EstimateWithRelations) {
  const branding = estimate.branding ?? null;

  const brandingName = branding?.name ?? "Impact Plus";
  const brandingAddressLine =
    branding?.street || branding?.city || branding?.state || branding?.postalCode
      ? [branding?.street, branding?.city, branding?.state, branding?.postalCode]
          .filter(Boolean)
          .join(", ")
      : null;

  const brandingEmail = branding?.email ?? null;
  const brandingPhone = branding?.phone ?? null;
  const brandingWebsite = branding?.website ?? null;

  const logoSrc =
    branding?.logoUrl
      ? `${branding.logoUrl}?v=${encodeURIComponent(branding.updatedAt ?? "")}`
      : null;

  return {
    brandingName,
    brandingAddressLine,
    brandingEmail,
    brandingPhone,
    brandingWebsite,
    logoSrc,
  };
}

export function EstimateReportShell({
  estimate,
  children,
  reportLabel,
  internal = false,
}: {
  estimate: EstimateWithRelations;
  children: ReactNode;
  reportLabel?: string;
  internal?: boolean;
}) {
  const b = buildBrandingModel(estimate);
  const customerName = [
    estimate.customerFirstName,
    estimate.customerLastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const accountName = [estimate.user?.firstName, estimate.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const ownerIsDealer = isDealerRole(estimate.user?.role?.name);
  const preparedFor =
    customerName ||
    (ownerIsDealer ? estimate.name : accountName || estimate.name);
  const projectName =
    estimate.name?.trim() && estimate.name.trim() !== preparedFor
      ? estimate.name.trim()
      : null;
  const contactEmail = ownerIsDealer
    ? estimate.customerEmail || null
    : estimate.customerEmail || estimate.user?.email || null;
  const contactPhone = ownerIsDealer
    ? estimate.customerPhone || null
    : estimate.customerPhone || estimate.user?.phone || null;
  const contactAddress = [
    estimate.customerStreet || (ownerIsDealer ? null : estimate.user?.street),
    estimate.customerCity || (ownerIsDealer ? null : estimate.user?.city),
    estimate.customerState || (ownerIsDealer ? null : estimate.user?.state),
    estimate.customerPostalCode ||
      (ownerIsDealer ? null : estimate.user?.postalCode),
  ]
    .filter(Boolean)
    .join(", ");
  const statusName = estimate.status?.name ?? null;

  return (
    <div
      id="printable-area"
      className="bg-white rounded-lg shadow-md p-6 sm:p-10 font-sans"
    >
      <header className="flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Estimate</h1>
          <p className="text-gray-500 mt-1">Number: {estimate.number}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {statusName ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {statusName}
              </span>
            ) : null}

            {internal && reportLabel ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                Internal · {reportLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          {b.logoSrc ? (
            <div className="flex justify-end mb-2">
              <img
                src={b.logoSrc}
                alt="Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          ) : null}

          <h2 className="text-xl font-semibold text-gray-700">{b.brandingName}</h2>

          {b.brandingAddressLine ? (
            <p className="text-sm text-gray-500">{b.brandingAddressLine}</p>
          ) : null}

          {b.brandingEmail ? (
            <p className="text-sm text-gray-500">{b.brandingEmail}</p>
          ) : null}

          {b.brandingPhone ? (
            <p className="text-sm text-gray-500">{b.brandingPhone}</p>
          ) : null}

          {b.brandingWebsite ? (
            <p className="text-sm text-gray-500">{b.brandingWebsite}</p>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Prepared For
          </h3>
          <p className="font-medium text-gray-800 text-lg">{preparedFor}</p>
          {projectName ? (
            <p className="mt-1 text-sm text-gray-600">Project: {projectName}</p>
          ) : null}
          {contactEmail ? (
            <p className="mt-2 text-sm text-gray-500">{contactEmail}</p>
          ) : null}
          {contactPhone ? (
            <p className="text-sm text-gray-500">{contactPhone}</p>
          ) : null}
          {contactAddress ? (
            <p className="text-sm text-gray-500">{contactAddress}</p>
          ) : null}
        </div>

        <div className="md:text-right">
          <p className="text-sm text-gray-500 mt-1">
            Date: {formatDateEn(estimate.date)}
          </p>
          {estimate.expiresAt ? (
            <p className="mt-1 text-sm text-gray-500">
              Valid through: {formatDateEn(estimate.expiresAt)}
            </p>
          ) : null}
        </div>
      </section>

      {children}

      <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
        <p>
          {estimate.expiresAt
            ? `This estimate is valid through ${formatDateEn(estimate.expiresAt)}.`
            : "This estimate is valid for 30 days."}{" "}
          Thank you for your business.
        </p>
      </footer>
    </div>
  );
}
