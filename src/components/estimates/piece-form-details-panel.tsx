"use client";

import React from "react";
import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  MuntinPattern,
  MuntinType,
} from "@/lib/types";
import type { PieceFormValues } from "./types";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";
import { PieceDiagram } from "@/components/piece-diagram";

interface PieceFormDetailsPanelProps {
  piece: PieceFormValues;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];
}

function findNameById<T extends { id: number }>(
  items: T[],
  id: number | string | null | undefined,
  getter: (item: T) => string,
) {
  const found = items.find((item) => item.id === Number(id));
  return found ? getter(found) : null;
}

function formatDimension(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return formatInchesFromEighthStep(String(value));
}

export function PieceFormDetailsPanel({
  piece,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  muntinPatterns,
  muntinTypes,
}: PieceFormDetailsPanelProps) {
  const productName = findNameById(
    productsWithBrands,
    piece.idProd,
    (p) => p.name,
  );

  const system = systemsWithConfigs.find((s) => s.id === Number(piece.idSyst));
  const systemName = system?.name ?? null;
  const brandName = system?.brandProduct?.brand?.name ?? null;

  const configName =
    system?.sysconfs?.find((sc) => sc.idConfig === Number(piece.idConf))?.config
      ?.conf ?? null;

  const frameColor = findNameById(frameColors, piece.idFC, (fc) => fc.color);
  const glass = findNameById(crystals, piece.idCryst, (c) => c.glass);
  const tint = findNameById(tints, piece.idTint, (t) => t.color);
  const coating = findNameById(coatings, piece.idCoat, (c) => c.name);

  const activeName =
    system?.sysconfs
      ?.find((sc) => sc.idConfig === Number(piece.idConf))
      ?.activeOptions?.find((o) => o.optionId === Number(piece.idActiveOption))
      ?.option?.name ?? null;

  const preparationName =
    system?.sysconfs
      ?.find((sc) => sc.idConfig === Number(piece.idConf))
      ?.preparationOptions?.find(
        (o) => o.optionId === Number(piece.idPreparationOption),
      )?.option?.name ?? null;

  const sillName =
    system?.sysconfs
      ?.find((sc) => sc.idConfig === Number(piece.idConf))
      ?.sillOptions?.find((o) => o.optionId === Number(piece.idSillOption))
      ?.option?.name ?? null;

  const reinforcementName =
    system?.sysconfs
      ?.find((sc) => sc.idConfig === Number(piece.idConf))
      ?.reinforcementOptions?.find(
        (o) => o.optionId === Number(piece.idReinforcementOption),
      )?.option?.name ?? null;

  const pattern = muntinPatterns.find(
    (p) => p.id === Number(piece.muntin?.idPattern),
  );

  const muntinType = muntinTypes.find(
    (t) => t.id === Number(piece.muntin?.idType),
  );

  const width = formatDimension(piece.width);
  const height = formatDimension(piece.height);
  const heightLeft = formatDimension(piece.heightLeft);
  const heightRight = formatDimension(piece.heightRight);
  const legHeight = formatDimension(piece.legHeight);

  const dpPlus = piece.dpPosPsf == null ? null : formatPsf(piece.dpPosPsf, 1);
  const dpMinus = piece.dpNegPsf == null ? null : formatPsf(piece.dpNegPsf, 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border-t px-4 py-4 text-sm">
      {/* LEFT: PRODUCT DETAILS */}
      <div className="rounded-md border bg-white p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Product Details
        </h4>

        <div className="space-y-1 text-slate-700">
          <p>
            <strong>Product:</strong> {productName ?? "—"}
          </p>
          <p>
            <strong>Brand:</strong> {brandName ?? "—"}
          </p>
          <p>
            <strong>System:</strong> {systemName ?? "—"}
          </p>
          <p>
            <strong>Configuration:</strong> {configName ?? "—"}
          </p>
          <p>
            <strong>Frame Color:</strong> {frameColor ?? "—"}
          </p>

          <p>
            <strong>Size:</strong>{" "}
            {[width && `${width} W`, height && `${height} H`]
              .filter(Boolean)
              .join(" x ") || "—"}
          </p>

          {heightLeft && (
            <p>
              <strong>Height Left:</strong> {heightLeft}
            </p>
          )}
          {heightRight && (
            <p>
              <strong>Height Right:</strong> {heightRight}
            </p>
          )}
          {legHeight && (
            <p>
              <strong>Leg Height:</strong> {legHeight}
            </p>
          )}

          <p>
            <strong>Qty:</strong> {piece.qty}
          </p>

          <p>
            <strong>Glass:</strong>{" "}
            {[glass, tint, coating].filter(Boolean).join(" + ") || "—"}
          </p>

          <p>
            <strong>Privacy:</strong> {piece.privacy ? "Yes" : "No"}
          </p>

          <p>
            <strong>Screen:</strong> {piece.screen ? "Yes" : "No"}
          </p>

          {activeName && (
            <p>
              <strong>Active:</strong> {activeName}
            </p>
          )}

          {preparationName && (
            <p>
              <strong>Preparation:</strong> {preparationName}
            </p>
          )}

          {sillName && (
            <p>
              <strong>Sill:</strong> {sillName}
            </p>
          )}

          {reinforcementName && (
            <p>
              <strong>Reinforcement:</strong> {reinforcementName}
            </p>
          )}

          <p>
            <strong>Muntin Pattern:</strong> {pattern?.name ?? "—"}
          </p>

          <p>
            <strong>Muntin Type:</strong> {muntinType?.name ?? "None"}
          </p>

          {piece.muntin?.panels?.length ? (
            <div className="pt-2">
              <strong>Panels:</strong>
              <div className="mt-1 space-y-1">
                {piece.muntin.panels.map((panel) => (
                  <p key={panel.panelIndex} className="text-xs text-slate-600">
                    {panel.panelLabel}: {panel.horizontalLites}H x{" "}
                    {panel.verticalLites}V
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <p>
            <strong>DP:</strong>{" "}
            {dpPlus || dpMinus ? `${dpPlus ?? "—"} / ${dpMinus ?? "—"}` : "—"}
          </p>
        </div>
      </div>

      {/* RIGHT: PRODUCT IMAGE */}
      <div className="rounded-md border bg-white p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
          Product Image
        </h4>

        <div className="flex items-center justify-center min-h-[180px]">
          <div className="w-full max-w-[260px]">
            <PieceDiagram
              width={Number(piece.width) || 0}
              height={Number(piece.height) || 0}
              productName={productName ?? undefined}
              configuration={configName ?? undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
