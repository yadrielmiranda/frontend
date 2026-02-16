"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";

type PieceWithRelations = EstimateWithRelations["pieces"][number];

/**
 * Construye las líneas de descripción “profesional” de una pieza
 * (igual para vista interna y vista pública).
 */
export function buildPieceDescriptionLines(piece: PieceWithRelations): string[] {
  const header = [
    piece.prod?.name,
    piece.bran?.name,
    piece.syst?.name,
    piece.conf?.conf,
  ]
    .filter(Boolean)
    .join(" ");

  const w = piece.width != null ? formatInchesFromEighthStep(piece.width) : "?";
  const h = piece.height != null ? formatInchesFromEighthStep(piece.height) : "?";

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
  if ((piece as any).cryst?.glass) glassTokens.push((piece as any).cryst.glass);
  if ((piece as any).tin?.color) glassTokens.push((piece as any).tin.color);
  if ((piece as any).coat?.name) glassTokens.push((piece as any).coat.name);

  const glassLine = glassTokens.length > 0 ? `Glass: ${glassTokens.join(" + ")}` : "";

  const optionsLine = [
    `Screen: ${piece.screen ? "Yes" : "No"}`,
    `Muntin: ${piece.muntin ? "Yes" : "No"}`,
    `Privacy: ${piece.privacy ? "Yes" : "No"}`,
  ].join(" | ");

  const pos = (piece as any).dpPosPsf;
  const neg = (piece as any).dpNegPsf;
  const psfLine =
    pos != null && neg != null ? `PSF: ${formatPsf(pos)} ${formatPsf(neg)}` : "";

  return [header, sizeLine, glassLine, optionsLine, psfLine].filter(
    (l) => l && l.trim() !== ""
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
