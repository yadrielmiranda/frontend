"use client";

import { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { pieceListText } from "../../piece-list-language";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";
import { buildEnergyDescription } from "@/lib/energy-ratings";
import { garageDesignDescription, pieceFrameColor, pieceHasSolidGarageDesign } from "../../piece-garage-design";

type PieceWithRelations = EstimateWithRelations["pieces"][number];

function getOptionName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;

  if (typeof obj.name === "string" && obj.name.trim()) return obj.name.trim();
  if (typeof obj.label === "string" && obj.label.trim())
    return obj.label.trim();

  return null;
}

function getMuntinPatternName(piece: PieceWithRelations): string | null {
  const p = piece as any;

  const directCandidates = [
    p.pieceMuntin?.pattern?.name,
    p.pieceMuntin?.patternName,
    p.pieceMuntin?.name,
    p.muntinPattern?.name,
    p.pattern?.name,
    p.gridPattern?.name,
    p.muntin?.pattern?.name,
    p.muntin?.patternName,
    p.muntin?.name,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function buildGridLine(piece: PieceWithRelations, locale: CompanyLocale): string {
  const p = piece as any;
  const patternName = getMuntinPatternName(piece);
  const label = locale === "es" ? pieceListText(locale)("Muntin Pattern") : "Grid";

  const muntin = p.pieceMuntin ?? p.muntin;
  const panels = Array.isArray(muntin?.panels) ? muntin.panels : [];

  if (!muntin) {
    return `${label}: ${locale === "es" ? "Ninguno" : "None"}`;
  }

  if (patternName) {
    const typeName = getOptionName(muntin.type);
    const patternDescription = typeName ? `${patternName} · ${typeName}` : patternName;
    if (panels.length === 0) {
      return `${label}: ${patternDescription}`;
    }

    const panelDetails = panels
      .map((panel: any) => {
        const panelLabel =
          typeof panel?.panelLabel === "string" && panel.panelLabel.trim()
            ? panel.panelLabel.trim()
            : typeof panel?.panelCode === "string" && panel.panelCode.trim()
              ? panel.panelCode.trim()
              : `Panel ${panel?.panelIndex ?? ""}`.trim();

        const h = Number(panel?.horizontalLites ?? 1);
        const v = Number(panel?.verticalLites ?? 1);

        return `${panelLabel} ${h}x${v}`;
      })
      .join(" | ");

    return panelDetails
      ? `${label}: ${patternDescription} - ${panelDetails}`
      : `${label}: ${patternDescription}`;
  }

  return `${label}: ${pieceListText(locale)("Yes")}`;
}

export type PieceReportDetails = {
  productName: string;
  systemLine: string;
  summaryLine: string;
  detailLines: string[];
};

function formatOptionalDimension(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return formatInchesFromEighthStep(value as string | number);
}

function buildSizeLabel(piece: PieceWithRelations, locale: CompanyLocale): string {
  const width = formatOptionalDimension(piece.width);
  const height = formatOptionalDimension(piece.height);
  const unit = locale === "es" ? "pulg" : "in";

  if (width && height) return `${width} x ${height} ${unit}`;
  if (width) return `${width} ${unit}`;
  if (height) return `${height} ${unit}`;
  return locale === "es" ? "Sin especificar" : "Not specified";
}

function buildSpecialDimensionLines(piece: PieceWithRelations, locale: CompanyLocale): string[] {
  const t = pieceListText(locale);
  const es = locale === "es";
  const unit = es ? "pulg" : "in";
  const lines: string[] = [];
  const dimensionParts: string[] = [];
  const heightLeft = formatOptionalDimension(piece.heightLeft);
  const heightRight = formatOptionalDimension(piece.heightRight);
  const legHeight = formatOptionalDimension(piece.legHeight);
  const sashHeight = formatOptionalDimension(piece.sashHeight);
  const windowHeight = formatOptionalDimension(piece.windowHeight);

  if (heightLeft) dimensionParts.push(`${es ? t("Height Left") : "HL"}: ${heightLeft} ${unit}`);
  if (heightRight) dimensionParts.push(`${es ? t("Height Right") : "HR"}: ${heightRight} ${unit}`);
  if (legHeight) dimensionParts.push(`${es ? t("Leg Height") : "Leg"}: ${legHeight} ${unit}`);
  if (sashHeight) dimensionParts.push(`${t("Sash")}: ${sashHeight} ${unit}`);
  if (windowHeight) dimensionParts.push(`${es ? t("Window Height") : "Window"}: ${windowHeight} ${unit}`);

  if (dimensionParts.length > 0) {
    lines.push(dimensionParts.join(" | "));
  }

  const doorWidth = formatOptionalDimension(piece.doorWidth);
  const doorHeight = formatOptionalDimension(piece.doorHeight);
  if (doorWidth || doorHeight) {
    lines.push(
      `${t("Door")}: ${doorWidth ?? "?"}${doorHeight ? ` x ${doorHeight}` : ""} ${unit}`,
    );
  }

  const sideliteParts: string[] = [];
  const leftSideliteWidth = formatOptionalDimension(piece.leftSideliteWidth);
  const rightSideliteWidth = formatOptionalDimension(piece.rightSideliteWidth);
  if (leftSideliteWidth) {
    sideliteParts.push(`${t("Left Sidelite")}: ${leftSideliteWidth} ${unit}`);
  }
  if (rightSideliteWidth) {
    sideliteParts.push(`${t("Right Sidelite")}: ${rightSideliteWidth} ${unit}`);
  }
  if (sideliteParts.length > 0) lines.push(sideliteParts.join(" | "));

  const panelParts: string[] = [];
  if (piece.leftPanels != null)
    panelParts.push(`${t("Left Panels")}: ${piece.leftPanels}`);
  if (piece.rightPanels != null) {
    panelParts.push(`${t("Right Panels")}: ${piece.rightPanels}`);
  }
  if (piece.panelCount != null) panelParts.push(`${t("Panels")}: ${piece.panelCount}`);
  if (panelParts.length > 0) lines.push(panelParts.join(" | "));

  if (
    Array.isArray(piece.horizontalHeights) &&
    piece.horizontalHeights.length > 0
  ) {
    lines.push(
      `${es ? t("Horizontal Positions") : "Horizontal Heights"}: ${piece.horizontalHeights
        .map((value) => `${formatInchesFromEighthStep(value)} ${unit}`)
        .join(" | ")}`,
    );
  }

  return lines;
}

export function buildPieceReportDetails(
  piece: PieceWithRelations,
  locale: CompanyLocale = "en",
): PieceReportDetails {
  const t = pieceListText(locale);
  const es = locale === "es";
  const p = piece as any;
  const productName = piece.prod?.name?.trim() || t("Product");
  const hasSolidDesign = pieceHasSolidGarageDesign(piece, piece.syst);
  const systemLine = [piece.bran?.name, piece.syst?.name]
    .filter(Boolean)
    .join(" - ");
  const activeName =
    getOptionName(p.activeOption) ??
    getOptionName(p.actOpt) ??
    getOptionName(p.active);
  const summaryParts = [
    piece.conf?.conf ? `${es ? t("Configuration") : "Config"}: ${piece.conf.conf}` : null,
    `${t("Size")}: ${buildSizeLabel(piece, locale)}`,
    activeName ? `${t("Active")}: ${activeName}` : null,
  ].filter((value): value is string => Boolean(value));

  const glassTokens = [p.cryst?.glass, p.tin?.color, p.coat?.name].filter(
    (value): value is string =>
      typeof value === "string" &&
      Boolean(value.trim()) &&
      value.trim().toLowerCase() !== "none",
  );
  const detailLines: string[] = [
    `${t("Frame Color")}: ${pieceFrameColor(piece, p.fColor, piece.syst, locale).color?.trim() || (es ? "Sin especificar" : "Not specified")}`,
  ];
  const designLine = garageDesignDescription(piece, piece.syst, locale);
  if (designLine) detailLines.push(designLine);
  if (piece.doorDesignSnapshot) detailLines.push(`${t("Door Design")}: ${piece.doorDesignSnapshot.code}`);

  if (!hasSolidDesign && glassTokens.length > 0) {
    detailLines.push(`${t("Glass")}: ${glassTokens.join(" + ")}`);
  }

  const preparationName =
    getOptionName(p.preparationOption) ??
    getOptionName(p.prepOpt) ??
    getOptionName(p.preparation);
  const sillName = getOptionName(p.sillOption) ?? getOptionName(p.sill);
  const reinforcementName =
    getOptionName(p.reinforcementOption) ?? getOptionName(p.reinforcement);

  if (preparationName) detailLines.push(`${t("Preparation")}: ${preparationName}`);
  if (sillName) detailLines.push(`${t("Sill")}: ${sillName}`);
  if (reinforcementName) {
    detailLines.push(`${t("Reinforcement")}: ${reinforcementName}`);
  }

  detailLines.push(...buildSpecialDimensionLines(piece, locale));

  const optionParts = [
    `${t("Screen")}: ${piece.screen ? t("Yes") : "No"}`,
    buildGridLine(piece, locale),
    ...(!hasSolidDesign ? [`${t("Privacy")}: ${piece.privacyOption?.name ?? (es ? "Ninguna" : "None")}`] : []),
  ];
  if (piece.highBottom) optionParts.push(`${t("High Bottom")}: ${t("Yes")}`);
  detailLines.push(optionParts.join(" | "));

  if (p.dpPosPsf != null && p.dpNegPsf != null) {
    detailLines.push(
      `PSF: ${formatPsf(p.dpPosPsf)} / ${formatPsf(p.dpNegPsf)}`,
    );
  }

  const energyLine = hasSolidDesign ? null : buildEnergyDescription(piece.energySnapshot, piece.prod?.kind, locale);
  if (energyLine) detailLines.push(energyLine);

  return {
    productName,
    systemLine,
    summaryLine: summaryParts.join(" | "),
    detailLines,
  };
}

/**
 * Construye las líneas de descripción “profesional” de una pieza
 * (igual para vista interna y vista pública).
 */
export function buildPieceDescriptionLines(
  piece: PieceWithRelations,
  locale: CompanyLocale = "en",
): string[] {
  const details = buildPieceReportDetails(piece, locale);
  return [
    details.productName,
    details.systemLine,
    details.summaryLine,
    ...details.detailLines,
  ].filter((line) => line.trim());
}
