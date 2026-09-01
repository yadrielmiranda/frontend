"use client";

import type { CSSProperties, ReactNode } from "react";
import type { EstimateWithRelations } from "@/lib/types";
import { formatDateEn } from "@/lib/formatters";
import {
  getReadableTextColor,
  normalizeBrandingColor,
} from "@/lib/branding-color";
import { getEstimateStatusBadgeAppearance } from "@/lib/estimate-status";
import { isDealerRole } from "@/lib/rbac";

function buildBrandingModel(estimate: EstimateWithRelations) {
  const branding = estimate.branding ?? null;

  const brandingName = branding?.name?.trim() || null;
  const brandingLocality = [branding?.city, branding?.state]
    .filter(Boolean)
    .join(", ");
  const brandingCityLine = [brandingLocality, branding?.postalCode]
    .filter(Boolean)
    .join(" ");
  const brandingAddressLine =
    branding?.street ||
    branding?.city ||
    branding?.state ||
    branding?.postalCode
      ? [branding?.street, brandingCityLine].filter(Boolean).join(", ")
      : null;

  const brandingEmail = branding?.email ?? null;
  const brandingPhone = branding?.phone ?? null;
  const brandingWebsite = branding?.website ?? null;
  const brandingColor = normalizeBrandingColor(branding?.brandingColor);
  const brandingContrastColor = getReadableTextColor(brandingColor);

  const logoSrc = branding?.logoUrl
    ? `${branding.logoUrl}?v=${encodeURIComponent(branding.updatedAt ?? "")}`
    : null;

  return {
    brandingName,
    brandingAddressLine,
    brandingEmail,
    brandingPhone,
    brandingWebsite,
    brandingColor,
    brandingContrastColor,
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
  const customerName = [estimate.customerFirstName, estimate.customerLastName]
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
  const statusAppearance = statusName
    ? getEstimateStatusBadgeAppearance(statusName)
    : null;
  const reportStyle = {
    "--report-brand-color": b.brandingColor,
    "--report-brand-contrast": b.brandingContrastColor,
  } as CSSProperties;

  return (
    <div
      id="printable-area"
      style={reportStyle}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white font-sans shadow-sm [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none"
      data-estimate-report={estimate.id}
    >
      <div className="p-5 sm:p-8">
        <header className="grid items-start gap-6 border-b border-slate-200 pb-6 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-[0.08em] text-[var(--report-brand-color)] sm:text-4xl">
              Estimate
            </h1>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-black">
              Number
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <p className="text-xl font-bold text-[var(--report-brand-color)]">
                {estimate.number}
              </p>
              {statusAppearance ? (
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusAppearance.className}`}
                >
                  {statusAppearance.label}
                </span>
              ) : null}
            </div>

            {internal && reportLabel ? (
              <span className="mt-3 inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase text-white">
                Internal - {reportLabel}
              </span>
            ) : null}
          </div>

          <div className="flex min-h-36 items-center justify-center lg:min-w-72">
            {b.logoSrc ? (
              <img
                src={b.logoSrc}
                alt="Logo"
                className="h-40 w-72 object-contain"
              />
            ) : null}
          </div>

          <div className="text-left lg:text-right">
            {b.brandingName ? (
              <h2 className="text-xl font-bold text-[var(--report-brand-color)]">
                {b.brandingName}
              </h2>
            ) : null}
            {b.brandingAddressLine ? (
              <p className="mt-2 text-xs text-black">
                {b.brandingAddressLine}
              </p>
            ) : null}
            {b.brandingEmail ? (
              <p className="mt-1 text-xs text-black">{b.brandingEmail}</p>
            ) : null}
            {b.brandingWebsite ? (
              <p className="mt-1 text-xs text-black">{b.brandingWebsite}</p>
            ) : null}
            {b.brandingPhone ? (
              <p className="mt-1 text-xs text-black">{b.brandingPhone}</p>
            ) : null}
          </div>
        </header>

        <section className="my-6 grid gap-5 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-4 md:grid-cols-[1.1fr_1.5fr_auto] md:items-center">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-black">
              Prepared For
            </h3>
            <p className="mt-1 text-lg font-bold text-[var(--report-brand-color)]">
              {preparedFor}
            </p>
            {projectName ? (
              <p className="mt-1 text-xs text-black">
                Project: {projectName}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 text-xs text-black">
            {contactEmail ? <p>{contactEmail}</p> : null}
            {contactPhone ? <p>{contactPhone}</p> : null}
            {contactAddress ? <p>{contactAddress}</p> : null}
          </div>

          <div className="space-y-3 md:text-right">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-black">
                Date
              </p>
              <p className="text-xs font-semibold text-[var(--report-brand-color)]">
                {formatDateEn(estimate.date)}
              </p>
            </div>
            {estimate.expiresAt ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-black">
                  Valid Through
                </p>
                <p className="text-xs font-semibold text-[var(--report-brand-color)]">
                  {formatDateEn(estimate.expiresAt)}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {children}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-[11px] text-black">
          <p>
            {estimate.expiresAt
              ? `This estimate is valid through ${formatDateEn(estimate.expiresAt)}.`
              : "This estimate is valid for 30 days."}{" "}
            Thank you for your business.
          </p>
        </footer>
      </div>
    </div>
  );
}
