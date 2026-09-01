"use client";

import { PieceDiagram } from "@/components/piece-diagram";
import { formatMoney } from "@/lib/formatters";
import type { EstimateWithRelations } from "@/lib/types";

import { buildPieceReportDetails } from "./piece-decription";

type PieceWithRelations = EstimateWithRelations["pieces"][number];

type PieceReportCardProps = {
  piece: PieceWithRelations;
  displayMark: string;
} & (
  | {
      showPrices: false;
      unitPrice?: never;
      subtotal?: never;
    }
  | {
      showPrices?: true;
      unitPrice: number;
      subtotal: number;
    }
);

function PieceReportDiagram({
  piece,
  displayMark,
}: {
  piece: PieceWithRelations;
  displayMark: string;
}) {
  const diagramMetadata = piece.diagramMetadata;

  return (
    <div
      className="flex h-[205px] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-2 lg:h-[195px]"
      aria-label={`Diagram for ${displayMark}`}
    >
      <div className="h-full w-full" data-piece-diagram-id={piece.id}>
        <PieceDiagram
          variant="report"
          diagramFamily={piece.prod?.diagramFamily}
          systemName={piece.syst?.name}
          brandName={piece.bran?.name}
          configuration={piece.conf?.conf}
          diagramSpec={piece.conf?.diagramSpec}
          dimensionMode={diagramMetadata?.dimensionMode ?? "STANDARD"}
          piece={piece}
          frameColorHex={piece.fColor?.hexCode}
          glassTintHex={piece.tin?.hexCode}
          hasCoating={diagramMetadata?.hasCoating ?? false}
          hasPrivacy={diagramMetadata?.hasPrivacy ?? false}
          screenEnabled={Boolean(piece.screen)}
          activeOptionName={piece.activeOption?.name}
          preparationOptionName={piece.preparationOption?.name}
          showDimensions={false}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
  success = false,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
  success?: boolean;
}) {
  const valueClassName = success
    ? strong
      ? "whitespace-nowrap text-right text-xl font-bold tabular-nums text-emerald-700"
      : "whitespace-nowrap text-right text-sm font-semibold tabular-nums text-emerald-700"
    : strong
      ? "whitespace-nowrap text-right text-base font-bold tabular-nums text-black"
      : "whitespace-nowrap text-right text-sm font-semibold tabular-nums text-black";

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${
          success ? "text-emerald-700" : "text-black"
        }`}
      >
        {label}
      </span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export function PieceReportCard(props: PieceReportCardProps) {
  const { piece, displayMark } = props;
  const details = buildPieceReportDetails(piece);
  const showPrices = props.showPrices !== false;

  return (
    <article
      className="relative break-inside-avoid-page overflow-hidden rounded-xl border border-slate-200 bg-white [page-break-inside:avoid]"
      data-estimate-piece-card={piece.id}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_220px]">
        <div className="p-3">
          <span
            className="mb-0.5 inline-flex min-w-12 items-center justify-center rounded-md bg-[var(--report-brand-color)] px-3 py-1.5 text-center text-xs font-bold text-[var(--report-brand-contrast)]"
            data-piece-mark-badge
          >
            {displayMark}
          </span>
          <PieceReportDiagram piece={piece} displayMark={displayMark} />
        </div>

        <div className="min-w-0 px-4 pb-4 pt-1 lg:py-4">
          <h4 className="text-lg font-bold leading-tight text-black">
            {details.productName}
          </h4>
          {details.systemLine ? (
            <p className="mt-1 text-sm font-bold text-[var(--report-brand-color)]">
              {details.systemLine}
            </p>
          ) : null}

          <p className="mt-4 text-sm font-bold leading-snug text-black">
            {details.summaryLine}
          </p>
          <div className="mt-1.5 space-y-1">
            {details.detailLines.map((line) => (
              <p key={line} className="text-xs leading-snug text-black">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-slate-200 bg-white px-4 py-4 lg:justify-between lg:gap-0 lg:border-l lg:border-t-0">
          <PriceRow label="Qty" value={piece.qty} />
          {showPrices ? (
            <>
              <PriceRow
                label="Unit Price"
                value={formatMoney(props.unitPrice)}
              />
              <PriceRow
                label="Subtotal"
                value={formatMoney(props.subtotal)}
                strong
                success
              />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
