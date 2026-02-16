"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatDateEn } from "@/lib/formatters";

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
}: {
  estimate: EstimateWithRelations;
  children: React.ReactNode;
}) {
  const b = buildBrandingModel(estimate);

  return (
    <div
      id="printable-area"
      className="bg-white rounded-lg shadow-md p-6 sm:p-10 font-sans"
    >
      <header className="flex justify-between items-start pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Estimate</h1>
          <p className="text-gray-500 mt-1">Number: {estimate.number}</p>
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
          <p className="font-medium text-gray-800 text-lg">{estimate.name}</p>
        </div>

        <div className="md:text-right">
          <p className="text-sm text-gray-500 mt-1">
            Date: {formatDateEn(estimate.date)}
          </p>
        </div>
      </section>

      {children}

      <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
        <p>This estimate is valid for 30 days. Thank you for your business.</p>
      </footer>
    </div>
  );
}
