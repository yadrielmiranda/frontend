"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";

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

function buildGridLine(piece: PieceWithRelations): string {
  const p = piece as any;
  const patternName = getMuntinPatternName(piece);

  const muntin = p.pieceMuntin ?? p.muntin;
  const panels = Array.isArray(muntin?.panels) ? muntin.panels : [];

  if (!muntin) {
    return "Grid: None";
  }

  if (patternName) {
    if (panels.length === 0) {
      return `Grid: ${patternName}`;
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
      ? `Grid: ${patternName} - ${panelDetails}`
      : `Grid: ${patternName}`;
  }

  return "Grid: Yes";
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

function buildSizeLabel(piece: PieceWithRelations): string {
  const width = formatOptionalDimension(piece.width);
  const height = formatOptionalDimension(piece.height);

  if (width && height) return `${width} x ${height} in`;
  if (width) return `${width} in`;
  if (height) return `${height} in`;
  return "Not specified";
}

function buildSpecialDimensionLines(piece: PieceWithRelations): string[] {
  const lines: string[] = [];
  const dimensionParts: string[] = [];
  const heightLeft = formatOptionalDimension(piece.heightLeft);
  const heightRight = formatOptionalDimension(piece.heightRight);
  const legHeight = formatOptionalDimension(piece.legHeight);
  const sashHeight = formatOptionalDimension(piece.sashHeight);
  const windowHeight = formatOptionalDimension(piece.windowHeight);

  if (heightLeft) dimensionParts.push(`HL: ${heightLeft} in`);
  if (heightRight) dimensionParts.push(`HR: ${heightRight} in`);
  if (legHeight) dimensionParts.push(`Leg: ${legHeight} in`);
  if (sashHeight) dimensionParts.push(`Sash: ${sashHeight} in`);
  if (windowHeight) dimensionParts.push(`Window: ${windowHeight} in`);

  if (dimensionParts.length > 0) {
    lines.push(dimensionParts.join(" | "));
  }

  const doorWidth = formatOptionalDimension(piece.doorWidth);
  const doorHeight = formatOptionalDimension(piece.doorHeight);
  if (doorWidth || doorHeight) {
    lines.push(
      `Door: ${doorWidth ?? "?"}${doorHeight ? ` x ${doorHeight}` : ""} in`,
    );
  }

  const sideliteParts: string[] = [];
  const leftSideliteWidth = formatOptionalDimension(piece.leftSideliteWidth);
  const rightSideliteWidth = formatOptionalDimension(piece.rightSideliteWidth);
  if (leftSideliteWidth) {
    sideliteParts.push(`Left Sidelite: ${leftSideliteWidth} in`);
  }
  if (rightSideliteWidth) {
    sideliteParts.push(`Right Sidelite: ${rightSideliteWidth} in`);
  }
  if (sideliteParts.length > 0) lines.push(sideliteParts.join(" | "));

  const panelParts: string[] = [];
  if (piece.leftPanels != null)
    panelParts.push(`Left Panels: ${piece.leftPanels}`);
  if (piece.rightPanels != null) {
    panelParts.push(`Right Panels: ${piece.rightPanels}`);
  }
  if (piece.panelCount != null) panelParts.push(`Panels: ${piece.panelCount}`);
  if (panelParts.length > 0) lines.push(panelParts.join(" | "));

  if (
    Array.isArray(piece.horizontalHeights) &&
    piece.horizontalHeights.length > 0
  ) {
    lines.push(
      `Horizontal Heights: ${piece.horizontalHeights
        .map((value) => `${formatInchesFromEighthStep(value)} in`)
        .join(" | ")}`,
    );
  }

  return lines;
}

export function buildPieceReportDetails(
  piece: PieceWithRelations,
): PieceReportDetails {
  const p = piece as any;
  const productName = piece.prod?.name?.trim() || "Product";
  const systemLine = [piece.bran?.name, piece.syst?.name]
    .filter(Boolean)
    .join(" - ");
  const activeName =
    getOptionName(p.activeOption) ??
    getOptionName(p.actOpt) ??
    getOptionName(p.active);
  const summaryParts = [
    piece.conf?.conf ? `Config: ${piece.conf.conf}` : null,
    `Size: ${buildSizeLabel(piece)}`,
    activeName ? `Active: ${activeName}` : null,
  ].filter((value): value is string => Boolean(value));

  const glassTokens = [p.cryst?.glass, p.tin?.color, p.coat?.name].filter(
    (value): value is string =>
      typeof value === "string" &&
      Boolean(value.trim()) &&
      value.trim().toLowerCase() !== "none",
  );
  const detailLines: string[] = [
    `Frame Color: ${p.fColor?.color?.trim() || "Not specified"}`,
  ];

  if (glassTokens.length > 0) {
    detailLines.push(`Glass: ${glassTokens.join(" + ")}`);
  }

  const preparationName =
    getOptionName(p.preparationOption) ??
    getOptionName(p.prepOpt) ??
    getOptionName(p.preparation);
  const sillName = getOptionName(p.sillOption) ?? getOptionName(p.sill);
  const reinforcementName =
    getOptionName(p.reinforcementOption) ?? getOptionName(p.reinforcement);

  if (preparationName) detailLines.push(`Preparation: ${preparationName}`);
  if (sillName) detailLines.push(`Sill: ${sillName}`);
  if (reinforcementName) {
    detailLines.push(`Reinforcement: ${reinforcementName}`);
  }

  detailLines.push(...buildSpecialDimensionLines(piece));

  const optionParts = [
    `Screen: ${piece.screen ? "Yes" : "No"}`,
    buildGridLine(piece),
    `Privacy: ${piece.privacyOption?.name ?? "None"}`,
  ];
  if (piece.highBottom) optionParts.push("High Bottom: Yes");
  detailLines.push(optionParts.join(" | "));

  if (p.dpPosPsf != null && p.dpNegPsf != null) {
    detailLines.push(
      `PSF: ${formatPsf(p.dpPosPsf)} / ${formatPsf(p.dpNegPsf)}`,
    );
  }

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
): string[] {
  const details = buildPieceReportDetails(piece);
  return [
    details.productName,
    details.systemLine,
    details.summaryLine,
    ...details.detailLines,
  ].filter((line) => line.trim());
}

