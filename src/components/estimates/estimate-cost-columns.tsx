"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Estimate, EstimateInstallationReportSummary } from "@/lib/types";
import { formatMoney, roundMoney } from "@/lib/formatters";

type EstimateCosts = Pick<Estimate, "priceT" | "taxAmount" | "installationJob" | "manualDiscountSummary"> & {
  installationSummary?: EstimateInstallationReportSummary | null;
};

function installationAmount(estimate: EstimateCosts): number | null {
  const summary = estimate.installationSummary;
  if (!summary || summary.installationTotal == null) return null;

  // Mantiene la misma vista de costos del dueño en Estimates y Orders.
  const discount = estimate.manualDiscountSummary?.payer === "ACCOUNT_OWNER"
    ? estimate.manualDiscountSummary : null;
  const installation = Number(discount?.installation.total ?? summary.installationTotal);
  const permit = summary.permitIncluded ? Number(discount?.permit.total ?? summary.permitFee ?? 0) : 0;
  const city = summary.permitIncluded && summary.cityFee != null ? Number(discount?.city.total ?? summary.cityFee) : 0;
  return roundMoney(installation + permit + city);
}

export function getEstimateCostColumns<T>(getEstimate: (row: T) => EstimateCosts): ColumnDef<T>[] {
  return [
    {
      id: "priceT",
      accessorFn: (item) => {
        const estimate = getEstimate(item);
        return Number(estimate.manualDiscountSummary?.payer === "ACCOUNT_OWNER"
          ? estimate.manualDiscountSummary.material.subtotal : estimate.priceT);
      },
      header: () => <div className="text-center">Material</div>,
      cell: ({ row }) => <div className="whitespace-nowrap text-center font-medium tabular-nums">{formatMoney(row.getValue<number>("priceT"))}</div>,
    },
    {
      id: "taxAmount",
      accessorFn: (item) => {
        const estimate = getEstimate(item);
        return Number(estimate.manualDiscountSummary?.payer === "ACCOUNT_OWNER"
          ? estimate.manualDiscountSummary.material.tax : estimate.taxAmount);
      },
      header: () => <div className="text-center">Tax</div>,
      cell: ({ row }) => <div className="whitespace-nowrap text-center font-medium tabular-nums">{formatMoney(row.getValue<number>("taxAmount"))}</div>,
    },
    {
      id: "installationAmount",
      accessorFn: (item) => installationAmount(getEstimate(item)),
      header: () => <div className="whitespace-nowrap text-center">Installation &amp; services</div>,
      cell: ({ row }) => {
        const estimate = getEstimate(row.original);
        const summary = estimate.installationSummary;
        const amount = row.getValue<number | null>("installationAmount");
        const hasInstallation = Boolean(estimate.installationJob && estimate.installationJob.status !== "CANCELED");
        const preliminary = summary && (summary.quoteStatus !== "APPROVED" || summary.status === "DEPOSIT_PAYMENT_PENDING");
        return (
          <div className="whitespace-nowrap text-center tabular-nums">
            <span className="font-medium">{amount == null ? (hasInstallation ? "Pending" : "Not included") : formatMoney(amount)}</span>
            {amount != null && preliminary && <p className="text-xs text-slate-500">Preliminary</p>}
            {summary?.permitIncluded && summary.cityFee == null && <p className="text-xs text-amber-700">City Fee pending</p>}
          </div>
        );
      },
    },
  ];
}
