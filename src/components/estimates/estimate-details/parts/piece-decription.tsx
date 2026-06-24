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

  const muntin = p.muntin;
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

/**
 * Construye las líneas de descripción “profesional” de una pieza
 * (igual para vista interna y vista pública).
 */
export function buildPieceDescriptionLines(
  piece: PieceWithRelations,
): string[] {
  const p = piece as any;

  const header = [
    piece.prod?.name,
    piece.bran?.name,
    piece.syst?.name,
    piece.conf?.conf,
  ]
    .filter(Boolean)
    .join(" ");

  const w = piece.width != null ? formatInchesFromEighthStep(piece.width) : "?";
  const h =
    piece.height != null ? formatInchesFromEighthStep(piece.height) : "?";

  const sizeParts: string[] = [`${w} x ${h}`];

  if (piece.heightLeft != null) {
    sizeParts.push(`HL ${formatInchesFromEighthStep(piece.heightLeft)}`);
  }
  if (piece.heightRight != null) {
    sizeParts.push(`HR ${formatInchesFromEighthStep(piece.heightRight)}`);
  }
  if (piece.legHeight != null) {
    sizeParts.push(`Leg ${formatInchesFromEighthStep(piece.legHeight)}`);
  }

  const sizeLine = `Size: ${sizeParts.join(" / ")}`;

  const glassTokens: string[] = [];
  if (p.cryst?.glass) glassTokens.push(p.cryst.glass);
  if (p.tin?.color) glassTokens.push(p.tin.color);
  if (p.coat?.name) glassTokens.push(p.coat.name);

  const glassLine =
    glassTokens.length > 0 ? `Glass: ${glassTokens.join(" + ")}` : "";

  const detailLines: string[] = [];

  const activeName =
    getOptionName(p.activeOption) ??
    getOptionName(p.actOpt) ??
    getOptionName(p.active);

  if (activeName) {
    detailLines.push(`Active: ${activeName}`);
  }

  const preparationName =
    getOptionName(p.preparationOption) ??
    getOptionName(p.prepOpt) ??
    getOptionName(p.preparation);

  if (preparationName) {
    detailLines.push(`Preparation: ${preparationName}`);
  }

  const sillName = getOptionName(p.sillOption) ?? getOptionName(p.sill);

  if (sillName) {
    detailLines.push(`Sill: ${sillName}`);
  }

  const reinforcementName =
    getOptionName(p.reinforcementOption) ?? getOptionName(p.reinforcement);

  if (reinforcementName) {
    detailLines.push(`Reinforcement: ${reinforcementName}`);
  }

  detailLines.push(`Screen: ${piece.screen ? "Yes" : "No"}`);

  if (piece.highBottom) {
    detailLines.push("High Bottom: Yes");
  }

  detailLines.push(buildGridLine(piece));
  detailLines.push(`Privacy: ${piece.privacy ? "Yes" : "No"}`);

  const pos = p.dpPosPsf;
  const neg = p.dpNegPsf;
  const psfLine =
    pos != null && neg != null
      ? `PSF: ${formatPsf(pos)} ${formatPsf(neg)}`
      : "";

  return [header, sizeLine, glassLine, ...detailLines, psfLine].filter(
    (l) => l && l.trim() !== "",
  );
}

export function PieceDescriptionCell({ piece }: { piece: PieceWithRelations }) {
  const lines = buildPieceDescriptionLines(piece);

  return (
    <>
      {lines.map((line, idx) => (
        <p
          key={idx}
          className={
            idx === 0
              ? "font-semibold text-gray-800"
              : "text-gray-600 text-xs mt-1"
          }
        >
          {line}
        </p>
      ))}
    </>
  );
}
