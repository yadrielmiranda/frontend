"use client";

import React from "react";
import type { CompanyLocale } from "@/components/company/company-content";
import { pieceListText } from "./piece-list-language";
import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Privacy,
  MuntinPattern,
  MuntinType,
} from "@/lib/types";
import type { PieceFormValues } from "./types";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";
import { buildEnergyDescription } from "@/lib/energy-ratings";
import { pieceFrameColor, pieceGarageDesign, pieceHasSolidGarageDesign } from "./piece-garage-design";
import { PieceDiagram } from "@/components/piece-diagram";
import { resolveFormMuntinForDiagram } from "@/components/piece-diagram/muntin-data";
import { formatDoorDimensions, usesOpeningWidth } from "./piece-dimension-description";
import { getMuntinInputMode, muntinPatternRequiresType } from "./muntin-availability";

interface PieceFormDetailsPanelProps {
  locale?: CompanyLocale;
  piece: PieceFormValues;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  privacies: Privacy[];
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
  locale = "en",
  piece,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  privacies,
  muntinPatterns,
  muntinTypes,
}: PieceFormDetailsPanelProps) {
  const t = pieceListText(locale);
  const selectedProduct =
    productsWithBrands.find((product) => product.id === Number(piece.idProd)) ??
    null;

  const productName = selectedProduct?.name ?? null;
  const muntinAllowed = selectedProduct?.kind !== "LINEAR_MATERIAL" && selectedProduct?.allowMuntin !== false;

  const system = systemsWithConfigs.find((s) => s.id === Number(piece.idSyst));
  const hasSolidDesign = pieceHasSolidGarageDesign(piece, system);
  const selectedDesign = pieceGarageDesign(piece, system, locale);
  const systemName = system?.name ?? null;
  const brandName = system?.brandProduct?.brand?.name ?? null;

  const configName =
    system?.sysconfs?.find((sc) => sc.idConfig === Number(piece.idConf))?.config
      ?.conf ?? null;

  const selectedSysConf = system?.sysconfs?.find(
    (sc) => sc.idConfig === Number(piece.idConf),
  );

  const requiresWindowHeight =
    selectedSysConf?.config?.requiresWindowHeight === true;

  const widthLabel = usesOpeningWidth(selectedSysConf)
    ? t("Opening Width")
    : t("Width");

  const heightLabel = requiresWindowHeight
    ? t("Open Height")
    : selectedSysConf?.requiresDoorHeight
      ? t("Opening Height")
      : t("Height");

  const muntinLayout = selectedSysConf?.config?.muntinLayout ?? [];

  const panelLabelByIndex = new Map(
    Array.isArray(muntinLayout)
      ? muntinLayout.map((panel) => [
          Number(panel.panelIndex),
          panel.panelLabel || panel.panelCode || `Panel ${panel.panelIndex}`,
        ])
      : [],
  );

  const selectedFrameColor =
    frameColors.find((fc) => fc.id === Number(piece.idFC)) ?? null;

  const effectiveFrame = pieceFrameColor(piece, selectedFrameColor, system, locale);
  const frameColor = effectiveFrame.color;
  const frameColorHex = effectiveFrame.hexCode;
  const glass = findNameById(crystals, piece.idCryst, (c) => c.glass);
  const selectedTint = tints.find((t) => t.id === Number(piece.idTint)) ?? null;

  const tint = selectedTint?.color ?? null;
  const glassTintHex = hasSolidDesign ? null : selectedTint?.hexCode ?? null;
  const selectedCoating =
    coatings.find((c) => c.id === Number(piece.idCoat)) ?? null;

  const coating = selectedCoating?.name ?? null;
  const selectedCoatingAssociation = selectedCoating?.brandCoatings?.find(
    (association) => association.idBrand === Number(piece.idBrand),
  );
  const hasCoating = !hasSolidDesign && selectedCoatingAssociation?.surchargeEnabled === true;

  const selectedPrivacy =
    privacies.find((privacy) => privacy.id === Number(piece.idPrivacy)) ?? null;
  const privacy = selectedPrivacy?.name ?? null;
  const selectedPrivacyAssociation = selectedPrivacy?.brandPrivacies?.find(
    (association) => association.idBrand === Number(piece.idBrand),
  );
  const hasPrivacy = !hasSolidDesign && selectedPrivacyAssociation?.surchargeEnabled === true;

  const activeName =
    selectedSysConf?.activeOptions?.find(
      (o) => o.optionId === Number(piece.idActiveOption),
    )?.option?.name ??
    null;

  const preparationName =
    selectedSysConf?.preparationOptions?.find(
      (o) => o.optionId === Number(piece.idPreparationOption),
    )?.option?.name ?? null;

  const sillName =
    selectedSysConf?.sillOptions?.find(
      (o) => o.optionId === Number(piece.idSillOption),
    )?.option?.name ?? null;

  const reinforcementName =
    selectedSysConf?.reinforcementOptions?.find(
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
  const sashHeight = formatDimension(piece.sashHeight);
  const windowHeight = formatDimension(piece.windowHeight);
  const legHeight = formatDimension(piece.legHeight);

  const doorSize = formatDoorDimensions(piece.doorWidth, piece.doorHeight, piece.height, locale);
  const leftSideliteWidth = formatDimension(piece.leftSideliteWidth);
  const rightSideliteWidth = formatDimension(piece.rightSideliteWidth);

  const horizontalPositions =
    Array.isArray(piece.horizontalHeights) && piece.horizontalHeights.length > 0
      ? piece.horizontalHeights
          .map((value) => formatDimension(value))
          .filter(Boolean)
      : [];

  const dpPlus = piece.dpPosPsf == null ? null : formatPsf(piece.dpPosPsf, 1);
  const dpMinus = piece.dpNegPsf == null ? null : formatPsf(piece.dpNegPsf, 1);
  const energyDescription = hasSolidDesign ? null : buildEnergyDescription(piece.energySnapshot, selectedProduct?.kind, locale);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 border-t bg-slate-50 p-3 text-sm md:grid-cols-2 md:gap-4 md:p-4">
      {/* LEFT: PRODUCT DETAILS */}
      <div className="min-w-0 rounded-md border bg-white p-4 [overflow-wrap:anywhere]">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("Product Details")}
        </h4>

        <div className="space-y-1 text-slate-700">
          <p>
            <strong>{t("Product")}:</strong> {productName ?? "—"}
          </p>
          <p>
            <strong>{t("Brand")}:</strong> {brandName ?? "—"}
          </p>
          <p>
            <strong>{t("System")}:</strong> {systemName ?? "—"}
          </p>
          <p>
            <strong>{t("Configuration")}:</strong> {configName ?? "—"}
          </p>
          <p>
            <strong>{t("Frame Color")}:</strong> {frameColor ?? "—"}
          </p>

          <p>
            <strong>{t("Size")}:</strong>{" "}
            {[
              width && `${width} ${widthLabel}`,
              height && `${height} ${heightLabel}`,
            ]
              .filter(Boolean)
              .join(" x ") || "—"}
          </p>

          {heightLeft && (
            <p>
              <strong>{t("Height Left")}:</strong> {heightLeft}
            </p>
          )}

          {heightRight && (
            <p>
              <strong>{t("Height Right")}:</strong> {heightRight}
            </p>
          )}

          {sashHeight && (
            <p>
              <strong>{t("Sash Height")}:</strong> {sashHeight}
            </p>
          )}

          {windowHeight && (
            <p>
              <strong>{t("Window Height")}:</strong> {windowHeight}
            </p>
          )}

          {legHeight && (
            <p>
              <strong>{t("Leg Height")}:</strong> {legHeight}
            </p>
          )}

          {doorSize && (
            <p>
              <strong>{t("Door Size")}:</strong>{" "}
              {doorSize}
            </p>
          )}

          {leftSideliteWidth && (
            <p>
              <strong>{t("Left Sidelite Width")}:</strong> {leftSideliteWidth}
            </p>
          )}

          {rightSideliteWidth && (
            <p>
              <strong>{t("Right Sidelite Width")}:</strong> {rightSideliteWidth}
            </p>
          )}

          {piece.leftPanels && (
            <p>
              <strong>{t("Left Panels")}:</strong> {piece.leftPanels}
            </p>
          )}

          {piece.rightPanels && (
            <p>
              <strong>{t("Right Panels")}:</strong> {piece.rightPanels}
            </p>
          )}

          {piece.panelCount && (
            <p>
              <strong>{t("Panel Count")}:</strong> {piece.panelCount}
            </p>
          )}

          {horizontalPositions.length > 0 && (
            <p>
              <strong>{t("Horizontal Positions")}:</strong>{" "}
              {horizontalPositions.join(", ")} {t("from bottom")}
            </p>
          )}

          <p>
            <strong>{t("Qty")}:</strong> {piece.qty}
          </p>

          {!hasSolidDesign && <p>
            <strong>{t("Glass")}:</strong>{" "}
            {[glass, tint, coating].filter(Boolean).join(" + ") || "—"}
          </p>}

          {!hasSolidDesign && <p>
            <strong>{t("Privacy")}:</strong> {privacy ?? "—"}
          </p>}

          <p>
            <strong>{t("Screen")}:</strong> {piece.screen ? t("Yes") : "No"}
          </p>

          {piece.highBottom && (
            <p>
              <strong>{t("High Bottom")}:</strong> {t("Yes")}
            </p>
          )}
          {piece.doorDesignSnapshot && <p><strong>{t("Door Design")}:</strong> {piece.doorDesignSnapshot.code}</p>}
          {selectedDesign && (
            <>
              <p>
                <strong>{t("Design")}:</strong> {selectedDesign.design.name}
              </p>
              <p>
                <strong>{t("Design Color")}:</strong> {selectedDesign.color.name}
              </p>
            </>
          )}

          {activeName && (
            <p>
              <strong>{t("Active")}:</strong> {activeName}
            </p>
          )}

          {preparationName && (
            <p>
              <strong>{t("Preparation")}:</strong> {preparationName}
            </p>
          )}

          {sillName && (
            <p>
              <strong>{t("Sill")}:</strong> {sillName}
            </p>
          )}

          {reinforcementName && (
            <p>
              <strong>{t("Reinforcement")}:</strong> {reinforcementName}
            </p>
          )}

          {muntinAllowed && <p>
            <strong>{t("Muntin Pattern")}:</strong> {pattern?.name ?? "—"}
          </p>}

          {muntinAllowed && getMuntinInputMode(pattern) !== "NONE" && (
            <>
              {muntinPatternRequiresType(pattern) && <p>
                <strong>{t("Muntin Type")}:</strong> {muntinType?.name ?? "—"}
              </p>}

              {getMuntinInputMode(pattern) === "GRID" && piece.muntin?.panels?.length ? (
                <div>
                  <strong>{t("Panels")}:</strong>
                  <div className="mt-1 space-y-1">
                    {piece.muntin.panels.map((panel) => {
                      const label =
                        panel.panelLabel ||
                        panelLabelByIndex.get(Number(panel.panelIndex)) ||
                        panel.panelCode ||
                        `Panel ${panel.panelIndex}`;

                      return (
                        <p
                          key={panel.panelIndex}
                          className="text-xs text-slate-600"
                        >
                          {label}: {panel.horizontalLites}H x{" "}
                          {panel.verticalLites}V
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {getMuntinInputMode(pattern) === "PRESET" && (
                <p className="text-xs text-slate-600">{t("Pattern included in the specification; drawing preview unavailable.")}</p>
              )}
            </>
          )}

          <p>
            <strong>DP:</strong>{" "}
            {dpPlus || dpMinus ? `${dpPlus ?? "—"} / ${dpMinus ?? "—"}` : "—"}
          </p>
          {energyDescription && (
            <p>
              {energyDescription.startsWith("NFRC: ") ? (
                <><strong>NFRC:</strong>{" "}{energyDescription.slice("NFRC: ".length)}</>
              ) : energyDescription}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: PRODUCT IMAGE */}
      <div className="min-w-0 overflow-hidden rounded-md border bg-white p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
          {t("Product Image")}
        </h4>

        <div className="flex h-[clamp(240px,70vw,380px)] min-w-0 items-center justify-center md:h-[clamp(280px,24vw,380px)]">
          <div className="h-full min-w-0 w-full max-w-[640px]">
            <PieceDiagram
              locale={locale}
              diagramFamily={selectedProduct?.diagramFamily}
              systemName={systemName}
              brandName={brandName}
              configuration={configName ?? undefined}
              diagramSpec={selectedSysConf?.config?.diagramSpec}
              dimensionMode={selectedSysConf?.dimensionMode}
              piece={piece}
              garageDesign={selectedDesign}
              frenchDoorDesignKey={piece.doorDesignSnapshot?.artworkKey}
              garageMaxSectionHeightIn={system?.garageMaxSectionHeightIn == null ? undefined : Number(system.garageMaxSectionHeightIn)}
              muntin={muntinAllowed ? resolveFormMuntinForDiagram(piece.muntin, muntinPatterns, muntinTypes) : null}
              frameColorHex={frameColorHex}
              glassTintHex={glassTintHex}
              hasCoating={hasCoating}
              hasPrivacy={hasPrivacy}
              screenEnabled={Boolean(piece.screen)}
              activeOptionName={activeName}
              preparationOptionName={preparationName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
