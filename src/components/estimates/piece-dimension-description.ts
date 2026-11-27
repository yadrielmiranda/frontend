import { formatInchesFromEighthStep } from "@/lib/dimensions";
import type { CompanyLocale } from "@/components/company/company-content";
import type { DimensionMode, FrameColor, ProductWithBrands, SystemWithConfigs } from "@/lib/types";
import { garageDesignDescription, pieceFrameColor } from "./piece-garage-design";
import { pieceListText } from "./piece-list-language";
import type { PieceFormValues } from "./types";

type Dimension = string | number | null | undefined;

export function usesOpeningWidth(config?: {
  dimensionMode?: DimensionMode;
  requiresDoorWidth?: boolean;
} | null): boolean {
  return config?.dimensionMode === "WINDOW_WALL" || config?.requiresDoorWidth === true;
}

function dimensionText(value: Dimension): string {
  if (typeof value === "string" && !value.trim()) return "";
  return formatInchesFromEighthStep(value);
}

export function formatDimensionPair(
  width: Dimension,
  height: Dimension,
  widthLabel = "W",
  heightLabel = "H",
): string {
  const widthText = dimensionText(width);
  const heightText = dimensionText(height);
  return [widthText && `${widthText} ${widthLabel}`, heightText && `${heightText} ${heightLabel}`]
    .filter(Boolean).join(" x ");
}

export function formatDoorDimensions(doorWidth: Dimension, doorHeight: Dimension, height: Dimension, locale: CompanyLocale = "en"): string {
  // Compare the saved numeric dimensions, not rounded display strings. A
  // distinct door/transom height must remain visible even if formatting rounds.
  const repeatsHeight = dimensionText(doorHeight) !== "" && dimensionText(height) !== ""
    && Number(doorHeight) === Number(height);
  const t = pieceListText(locale);
  return formatDimensionPair(doorWidth, repeatsHeight ? null : doorHeight, t("W"), t("H"));
}

export function describeListedPiece(piece: PieceFormValues, product: ProductWithBrands | undefined,
  system: SystemWithConfigs | undefined, frameColor: FrameColor | undefined, locale: CompanyLocale): string {
  const t = pieceListText(locale);
  const config = system?.sysconfs?.find(row => Number(row.config?.id ?? row.idConfig) === Number(piece.idConf));
  const openingHeight = config?.config?.requiresWindowHeight || config?.requiresDoorHeight;
  const size = formatDimensionPair(piece.width, piece.height,
    t(usesOpeningWidth(config) ? "Open W" : "W"), t(openingHeight ? "Open H" : "H"));
  const parts: string[] = [];
  if (product?.name) parts.push(product.name);
  if (size) {
    const dimensions = [size];
    if (piece.sashHeight) dimensions.push(`${t("Sash")} ${formatInchesFromEighthStep(piece.sashHeight)}`);
    if (piece.windowHeight) dimensions.push(`${t("Window H")} ${formatInchesFromEighthStep(piece.windowHeight)}`);
    parts.push(dimensions.join(" / "));
  }
  if (piece.heightLeft) parts.push(`${formatInchesFromEighthStep(piece.heightLeft)} ${t("HL")}`);
  if (piece.heightRight) parts.push(`${formatInchesFromEighthStep(piece.heightRight)} ${t("HR")}`);
  if (piece.legHeight) parts.push(`${formatInchesFromEighthStep(piece.legHeight)} ${t("LegH")}`);
  const door = formatDoorDimensions(piece.doorWidth, piece.doorHeight, piece.height, locale);
  if (door) parts.push(`${t("Door")} ${door}`);
  if (piece.leftSideliteWidth) parts.push(`${t("Left Sidelite")} ${formatInchesFromEighthStep(piece.leftSideliteWidth)}`);
  if (piece.rightSideliteWidth) parts.push(`${t("Right Sidelite")} ${formatInchesFromEighthStep(piece.rightSideliteWidth)}`);
  if (piece.leftPanels) parts.push(`${t("Left Panels")} ${piece.leftPanels}`);
  if (piece.rightPanels) parts.push(`${t("Right Panels")} ${piece.rightPanels}`);
  if (piece.panelCount) parts.push(`${t("Panels")} ${piece.panelCount}`);
  if (Array.isArray(piece.horizontalHeights) && piece.horizontalHeights.length > 0) {
    const positions = piece.horizontalHeights.map(height => formatInchesFromEighthStep(String(height)));
    parts.push(`${t("Horizontals @")} ${positions.join(", ")}`);
  }
  const frame = pieceFrameColor(piece, frameColor, system, locale);
  if (frame.color) parts.push(frame.color);
  const design = garageDesignDescription(piece, system, locale);
  if (design) parts.push(design);
  return parts.join(" - ") || t("Piece description");
}
