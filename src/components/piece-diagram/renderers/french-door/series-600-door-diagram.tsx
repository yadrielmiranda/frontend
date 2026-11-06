import React, { useId } from "react";

import type { DiagramFamily, DimensionMode } from "@/lib/types";

import {
  DIMENSION_COLOR,
  dimensionMetrics,
} from "../dimension-style";
import {
  DIMENSION_LABEL_ABOVE_LINE_PX,
  DIMENSION_LABEL_BELOW_LINE_PX,
  DIMENSION_SCREEN_FONT_SIZE_PX,
  DimensionText,
  VerticalDimensionText,
  VERTICAL_DIMENSION_RESERVE_PX,
} from "../dimension-text";
import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import {
  MuntinLayer,
  type MuntinGlassPanel,
  type ResolvedMuntin,
} from "../muntin-layer";
import {
  DEFAULT_MOVEMENT_INDICATOR_COLOR,
  Serie600MovementIndicators,
  normalizeMovementIndicatorColor,
  type Serie600MovementPanel,
} from "./series-600-movement-indicators";
import { mixedDoorPattern } from "./mixed-door-pattern";
import { Series600SingleArtwork, singleFrenchDoorGeometry } from "./series-600-single-artwork";
import { Series600DoubleArtwork, doubleFrenchDoorGeometry } from "./series-600-double-artwork";
import { Series600SideliteArtwork, frenchDoorSideliteGeometry } from "./series-600-sidelite-artwork";
import { FRAME_OVERLAP_INCHES, type JoinedJambs } from "./series-600-frame-joint";
import { doorFinish } from "../door-finish";

type DiagramValue = string | number | null | undefined;
type Rect = GlassOverlayRect;

export type PieceDiagramVariant = "editor" | "report";

export type PieceDiagramVisualTemplate =
  | "ECO_SERIES_600_X_EXTERIOR"
  | "ECO_SERIES_600_XX_EXTERIOR"
  | "ECO_SERIES_600_O_SIDELITE_EXTERIOR"
  | "ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR";

export type PieceDiagramExteriorHingeSide = "left" | "right";
export type PieceDiagramActiveLeaf = "left" | "right";
export type PieceDiagramBoreCount = 2 | 3;

export type PieceDiagramSeries600XXStructureId =
  | "LEFT_ACTIVE__TWO_BORE"
  | "LEFT_ACTIVE__THREE_BORE"
  | "RIGHT_ACTIVE__TWO_BORE"
  | "RIGHT_ACTIVE__THREE_BORE";

// The full O* + X/XX + O* structure is validated by mixedDoorPattern.
export type PieceDiagramSeries600MixedConfiguration = string;

type MixedPieceBase = {
  width: string | number;
  height: string | number;
};

export type PieceDiagramSeries600MixedPiece =
  | (MixedPieceBase & { kind: "O" })
  | (MixedPieceBase & {
      kind: "X";
      exteriorHingeSide: PieceDiagramExteriorHingeSide;
    })
  | (MixedPieceBase & {
      kind: "XX";
      activeLeaf?: PieceDiagramActiveLeaf;
      boreCount?: PieceDiagramBoreCount;
      series600XXStructureId?: PieceDiagramSeries600XXStructureId;
    });

interface SharedMaterialProps {
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  muntin?: ResolvedMuntin | null;
}

export interface PieceDiagramSeries600MixedAssemblyProps
  extends SharedMaterialProps {
  configuration: PieceDiagramSeries600MixedConfiguration;
  pieces: readonly PieceDiagramSeries600MixedPiece[];
  dimensionMode?: DimensionMode;
  movementIndicatorColor?: string;
  showDimensions?: boolean;
  idNamespace?: string;
  variant?: PieceDiagramVariant;
  className?: string;
}

export interface PieceDiagramData {
  width?: DiagramValue;
  height?: DiagramValue;
  heightLeft?: DiagramValue;
  heightRight?: DiagramValue;
  legHeight?: DiagramValue;
  sashHeight?: DiagramValue;
  windowHeight?: DiagramValue;
  privacy?: boolean | null;
  doorWidth?: DiagramValue;
  doorHeight?: DiagramValue;
  leftSideliteWidth?: DiagramValue;
  rightSideliteWidth?: DiagramValue;
  leftPanels?: DiagramValue;
  rightPanels?: DiagramValue;
  panelCount?: DiagramValue;
  horizontalHeights?: number[] | null;
}

export interface PieceDiagramProps extends SharedMaterialProps {
  diagramFamily?: DiagramFamily;
  configuration?: string;
  dimensionMode?: DimensionMode;
  piece?: PieceDiagramData;
  movementIndicatorColor?: string;
  visualTemplate?: PieceDiagramVisualTemplate;
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  activeLeaf?: PieceDiagramActiveLeaf;
  boreCount?: PieceDiagramBoreCount;
  series600XXStructureId?: PieceDiagramSeries600XXStructureId;
  series600MixedPieces?: readonly PieceDiagramSeries600MixedPiece[];
  showDimensions?: boolean;
  idNamespace?: string;
  variant?: PieceDiagramVariant;
  className?: string;
}

const DEFAULT_FRAME_COLOR = "#FFFFFF";
const MIXED_HALF_OVERLAP = FRAME_OVERLAP_INCHES / 2;

const XX_STRUCTURES: Record<
  PieceDiagramSeries600XXStructureId,
  { activeLeaf: PieceDiagramActiveLeaf; boreCount: PieceDiagramBoreCount }
> = {
  LEFT_ACTIVE__TWO_BORE: { activeLeaf: "left", boreCount: 2 },
  LEFT_ACTIVE__THREE_BORE: { activeLeaf: "left", boreCount: 3 },
  RIGHT_ACTIVE__TWO_BORE: { activeLeaf: "right", boreCount: 2 },
  RIGHT_ACTIVE__THREE_BORE: { activeLeaf: "right", boreCount: 3 },
};

function parsePositiveDimension(value: DiagramValue, name: string): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/[\u2033\u201d"]/g, "");
    const decimal = Number(normalized);
    if (Number.isFinite(decimal) && decimal > 0) return decimal;

    const fraction = normalized.match(/^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/);
    if (fraction) {
      const whole = fraction[1] ? Number(fraction[1]) : 0;
      const numerator = Number(fraction[2]);
      const denominator = Number(fraction[3]);
      const parsed = whole + numerator / denominator;
      if (denominator > 0 && numerator < denominator && parsed > 0) {
        return parsed;
      }
    }
  }

  throw new Error(`${name} must be a positive dimension`);
}

function formatDimension(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function normalizeFrameColor(value?: string | null): string {
  const candidate = value?.trim() ?? DEFAULT_FRAME_COLOR;
  const short = candidate.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    return `#${short[1]
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`.toUpperCase();
  }
  const full = candidate.match(/^#([0-9a-fA-F]{6})$/);
  return full ? `#${full[1].toUpperCase()}` : DEFAULT_FRAME_COLOR;
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "") || "ae-french-door";
}

function mirroredRect(rect: Rect, width: number): Rect {
  return { ...rect, x: width - rect.x - rect.width };
}

function frenchDoorMuntinPanels(
  panels: readonly { kind: "O" | "X"; glass: Rect }[],
): MuntinGlassPanel[] {
  // Physical glass lights in exterior left-to-right order. A double door
  // contributes two lights; its surrounding sidelites keep their own indices.
  return panels.map((panel, index) => ({
    panelIndex: index + 1,
    panelCode: panel.kind,
    panelLabel: panels.length === 1 ? "Glass"
      : index === 0 ? "Left"
        : index === panels.length - 1 ? "Right"
          : index === (panels.length - 1) / 2 ? "Center"
            : `Panel ${index + 1}`,
    rect: panel.glass,
  }));
}

function resolveXXStructureId(
  explicitId?: PieceDiagramSeries600XXStructureId,
  activeLeaf: PieceDiagramActiveLeaf = "left",
  boreCount: PieceDiagramBoreCount = 2,
): PieceDiagramSeries600XXStructureId {
  if (explicitId && XX_STRUCTURES[explicitId]) return explicitId;
  return `${activeLeaf === "left" ? "LEFT" : "RIGHT"}_ACTIVE__${
    boreCount === 3 ? "THREE" : "TWO"
  }_BORE` as PieceDiagramSeries600XXStructureId;
}

type StructureMaterialProps = SharedMaterialProps & {
  width: number;
  height: number;
  frameColor: string;
  joined?: JoinedJambs;
  movementIndicatorColor?: string;
  movementIndicatorId?: string;
};

function XStructure({
  width,
  height,
  hingeSide,
  joined,
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  muntin,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & {
  hingeSide: PieceDiagramExteriorHingeSide;
}) {
  const geometry = singleFrenchDoorGeometry(width, height, hingeSide, joined);
  const baseGlass = geometry.glass;
  const indicatorGlass =
    hingeSide === "left" ? mirroredRect(baseGlass, width) : baseGlass;
  const mirror =
    hingeSide === "left" ? `translate(${width} 0) scale(-1 1)` : undefined;
  const clipId = safeId(`${movementIndicatorId ?? "x"}-frame`);

  return (
    <g
      data-configuration="X"
      data-view="EXTERIOR"
      data-hinge-side={hingeSide}
      data-glass-source="DATABASE_APPEARANCE_LAYER"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g transform={mirror} clipPath={`url(#${clipId})`}>
        <Series600SingleArtwork
          width={width}
          height={height}
          geometry={geometry}
          idNamespace={clipId}
          frameColor={frameColor}
        />
        <GlassAppearanceLayer
          rects={[baseGlass]}
          glassTintHex={glassTintHex}
          hasCoating={hasCoating}
          hasPrivacy={hasPrivacy}
        />
      </g>
      <MuntinLayer
        muntin={muntin}
        glassPanels={frenchDoorMuntinPanels([{ kind: "X", glass: indicatorGlass }])}
        frameColorHex={frameColor}
        unitsPerInch={1}
        idNamespace={`${clipId}-glass`}
      />
      {movementIndicatorColor ? (
        <Serie600MovementIndicators
          panels={[
            {
              kind: "X",
              hingeSide,
              role: "OPERABLE",
              glass: indicatorGlass,
            },
          ]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorId}
        />
      ) : null}
    </g>
  );
}

function OStructure({
  width,
  height,
  mirror = false,
  joined,
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  muntin,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & { mirror?: boolean }) {
  const geometry = frenchDoorSideliteGeometry(width, height, mirror, joined);
  const { glass } = geometry;

  return (
    <g
      data-configuration="O"
      data-product-role="SIDELITE"
      data-view="EXTERIOR"
      data-glass-source="DATABASE_APPEARANCE_LAYER"
    >
      <Series600SideliteArtwork
        width={width}
        height={height}
        geometry={geometry}
        frameColor={frameColor}
        idNamespace={safeId(movementIndicatorId ?? "o")}
      />
      <GlassAppearanceLayer
        rects={[glass]}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />
      <MuntinLayer
        muntin={muntin}
        glassPanels={frenchDoorMuntinPanels([{ kind: "O", glass }])}
        frameColorHex={frameColor}
        unitsPerInch={1}
        idNamespace={`${movementIndicatorId ?? "o"}-glass`}
      />
      {movementIndicatorColor ? (
        <Serie600MovementIndicators
          panels={[{ kind: "O", role: "FIXED", glass }]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorId}
        />
      ) : null}
    </g>
  );
}

function XXStructure({
  width,
  height,
  structureId,
  joined,
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  muntin,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & {
  structureId: PieceDiagramSeries600XXStructureId;
}) {
  const structure = XX_STRUCTURES[structureId];
  const geometry = doubleFrenchDoorGeometry(width, height, structure.activeLeaf, joined);
  const { leftGlass, rightGlass } = geometry;

  return (
    <g
      data-configuration="XX"
      data-view="EXTERIOR"
      data-active-leaf={structure.activeLeaf}
      data-bore-count={structure.boreCount}
      data-structure-id={structureId}
      data-glass-source="DATABASE_APPEARANCE_LAYER"
    >
      <Series600DoubleArtwork
        width={width}
        height={height}
        geometry={geometry}
        activeLeaf={structure.activeLeaf}
        boreCount={structure.boreCount}
        idNamespace={safeId(movementIndicatorId ?? "xx")}
        frameColor={frameColor}
      />
      <GlassAppearanceLayer
        rects={[leftGlass, rightGlass]}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />
      <MuntinLayer
        muntin={muntin}
        glassPanels={frenchDoorMuntinPanels([
          { kind: "X", glass: leftGlass },
          { kind: "X", glass: rightGlass },
        ])}
        frameColorHex={frameColor}
        unitsPerInch={1}
        idNamespace={`${movementIndicatorId ?? "xx"}-glass`}
      />
      {movementIndicatorColor ? (
        <Serie600MovementIndicators
          panels={[
            {
              kind: "X",
              hingeSide: "left",
              role: structure.activeLeaf === "left" ? "ACTIVE" : "SECONDARY",
              showArrow: structure.activeLeaf === "left",
              glass: leftGlass,
            },
            {
              kind: "X",
              hingeSide: "right",
              role:
                structure.activeLeaf === "right" ? "ACTIVE" : "SECONDARY",
              showArrow: structure.activeLeaf === "right",
              glass: rightGlass,
            },
          ]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorId}
        />
      ) : null}
    </g>
  );
}

function DimensionArrows({
  width,
  height,
  showWidth = true,
  showHeight = true,
  variant,
}: {
  width: number;
  height: number;
  showWidth?: boolean;
  showHeight?: boolean;
  variant: PieceDiagramVariant;
}) {
  const scale = variant === "report" ? 0.94 : 1;
  const metrics = dimensionMetrics(height);
  const stroke = metrics.strokeWidth * scale;
  const font = metrics.fontSize * scale;
  const widthY = height + height * 0.055;
  const heightX = width + height * 0.055;
  const arrowDepth = metrics.terminalLength * scale;
  const arrowHalf = metrics.terminalHalfWidth * scale;

  return (
    <g
      pointerEvents="none"
      aria-hidden="true"
      fill={DIMENSION_COLOR}
      stroke={DIMENSION_COLOR}
      data-layer="FRENCH_DOOR_DIMENSIONS"
    >
      {showWidth ? (
        <g>
          <line x1={0} y1={widthY} x2={width} y2={widthY} strokeWidth={stroke} />
          <path
            d={`M 0 ${widthY} L ${arrowDepth} ${widthY - arrowHalf} L ${arrowDepth} ${widthY + arrowHalf} Z`}
            stroke="none"
          />
          <path
            d={`M ${width} ${widthY} L ${width - arrowDepth} ${widthY - arrowHalf} L ${width - arrowDepth} ${widthY + arrowHalf} Z`}
            stroke="none"
          />
          <DimensionText
            x={width / 2}
            y={widthY}
            textAnchor="middle"
            stroke="none"
            fallbackFontSize={font}
            screenOffsetYPx={DIMENSION_LABEL_BELOW_LINE_PX}
          >
            W. {formatDimension(width)}&quot;
          </DimensionText>
        </g>
      ) : null}
      {showHeight ? (
        <g>
          <line x1={heightX} y1={0} x2={heightX} y2={height} strokeWidth={stroke} />
          <path
            d={`M ${heightX} 0 L ${heightX - arrowHalf} ${arrowDepth} L ${heightX + arrowHalf} ${arrowDepth} Z`}
            stroke="none"
          />
          <path
            d={`M ${heightX} ${height} L ${heightX - arrowHalf} ${height - arrowDepth} L ${heightX + arrowHalf} ${height - arrowDepth} Z`}
            stroke="none"
          />
          <VerticalDimensionText
            x={heightX}
            y={height / 2}
            stroke="none"
            fallbackFontSize={font}
          >
            H. {formatDimension(height)}&quot;
          </VerticalDimensionText>
        </g>
      ) : null}
    </g>
  );
}

type ResolvedMixedPiece = {
  index: number;
  kind: "O" | "X" | "XX";
  width: number;
  height: number;
  logicalLeft: number;
  logicalRight: number;
  drawLeft: number;
  drawWidth: number;
  joined: JoinedJambs;
  mirrorSidelite: boolean;
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  structureId?: PieceDiagramSeries600XXStructureId;
};

type ResolvedMixedLayout = {
  configuration: PieceDiagramSeries600MixedConfiguration;
  pieces: readonly ResolvedMixedPiece[];
  boundaries: readonly number[];
  totalWidth: number;
  height: number;
};

function resolveMixedLayout(
  configuration: PieceDiagramSeries600MixedConfiguration,
  pieces: readonly PieceDiagramSeries600MixedPiece[],
): ResolvedMixedLayout {
  const expected = mixedDoorPattern(configuration);
  if (!expected || pieces.length !== expected.length) {
    throw new Error(`Invalid French Door mixed configuration: ${configuration}`);
  }
  const mainIndex = expected.findIndex((kind) => kind !== "O");
  const parsed = pieces.map((piece, index) => {
    if (piece.kind !== expected[index]) {
      throw new Error(`${configuration} piece ${index + 1} must be ${expected[index]}`);
    }
    const width = parsePositiveDimension(piece.width, `piece ${index + 1} width`);
    const height = parsePositiveDimension(piece.height, `piece ${index + 1} height`);
    if (piece.kind === "X") {
      return {
        index,
        kind: piece.kind,
        width,
        height,
        mirrorSidelite: false,
        exteriorHingeSide: piece.exteriorHingeSide,
      };
    }
    if (piece.kind === "XX") {
      return {
        index,
        kind: piece.kind,
        width,
        height,
        mirrorSidelite: false,
        structureId: resolveXXStructureId(
          piece.series600XXStructureId,
          piece.activeLeaf,
          piece.boreCount,
        ),
      };
    }
    return {
      index,
      kind: piece.kind,
      width,
      height,
      mirrorSidelite: index > mainIndex,
    };
  });

  const height = parsed[0]?.height;
  if (!height || parsed.some((piece) => piece.height !== height)) {
    throw new Error(`${configuration} requires equal piece heights`);
  }

  const boundaries = [0];
  parsed.forEach((piece) => boundaries.push(boundaries.at(-1)! + piece.width));
  const isDoorJoint = (boundary: number) => boundary > 0 && boundary < parsed.length &&
    (boundary === mainIndex || boundary === mainIndex + 1);
  const resolvedPieces = parsed.map((piece, index) => {
    const logicalLeft = boundaries[index]!;
    const logicalRight = boundaries[index + 1]!;
    const leftOverlap = index > 0 ? MIXED_HALF_OVERLAP : 0;
    const rightOverlap = index < parsed.length - 1 ? MIXED_HALF_OVERLAP : 0;
    return {
      ...piece,
      logicalLeft,
      logicalRight,
      drawLeft: logicalLeft - leftOverlap,
      drawWidth: piece.width + leftOverlap + rightOverlap,
      joined: { left: isDoorJoint(index), right: isDoorJoint(index + 1) },
    };
  });

  return {
    configuration,
    pieces: resolvedPieces,
    boundaries,
    totalWidth: boundaries.at(-1)!,
    height,
  };
}

function mixedMovementPanels(layout: ResolvedMixedLayout): Serie600MovementPanel[] {
  const panels: Serie600MovementPanel[] = [];
  for (const piece of layout.pieces) {
    if (piece.kind === "O") {
      const { glass } = frenchDoorSideliteGeometry(piece.drawWidth, layout.height, piece.mirrorSidelite, piece.joined);
      panels.push({
        kind: "O",
        role: "FIXED",
        glass: { ...glass, x: piece.drawLeft + glass.x },
      });
      continue;
    }
    if (piece.kind === "X") {
      const baseGlass = singleFrenchDoorGeometry(piece.drawWidth, layout.height, piece.exteriorHingeSide, piece.joined).glass;
      const glass =
        piece.exteriorHingeSide === "left"
          ? mirroredRect(baseGlass, piece.drawWidth)
          : baseGlass;
      panels.push({
        kind: "X",
        hingeSide: piece.exteriorHingeSide!,
        role: "OPERABLE",
        glass: { ...glass, x: piece.drawLeft + glass.x },
      });
      continue;
    }

    const structure = XX_STRUCTURES[piece.structureId!];
    const { leftGlass, rightGlass } = doubleFrenchDoorGeometry(piece.drawWidth, layout.height, structure.activeLeaf, piece.joined);
    ([
      ["left", leftGlass],
      ["right", rightGlass],
    ] as const).forEach(([hingeSide, glass]) => {
      const active = structure.activeLeaf === hingeSide;
      panels.push({
        kind: "X",
        hingeSide,
        role: active ? "ACTIVE" : "SECONDARY",
        showArrow: active,
        glass: { ...glass, x: piece.drawLeft + glass.x },
      });
    });
  }
  return panels;
}

function MixedDimensions({
  layout,
  variant,
}: {
  layout: ResolvedMixedLayout;
  variant: PieceDiagramVariant;
}) {
  const metrics = dimensionMetrics(layout.height);
  const font = metrics.fontSize;
  const stroke = metrics.strokeWidth;
  const topY = -layout.height * 0.055;
  const tickTop = topY - layout.height * 0.012;
  const tickBottom = -layout.height * 0.01;
  const dimensionSections: {
    index: number;
    logicalLeft: number;
    logicalRight: number;
    label: string;
  }[] = [];
  for (let index = 0; index < layout.pieces.length;) {
    const piece = layout.pieces[index];
    let end = index + 1;
    if (piece.kind === "O") {
      while (
        end < layout.pieces.length &&
        layout.pieces[end].kind === "O" &&
        layout.pieces[end].width === piece.width
      ) end++;
    }
    // Three or more repeated sidelites need a shared label to stay legible
    // in the editor. Every physical panel keeps its original width and tick.
    const count = end - index >= 3 ? end - index : 1;
    dimensionSections.push({
      index,
      logicalLeft: piece.logicalLeft,
      logicalRight: layout.pieces[index + count - 1].logicalRight,
      label: count > 1
        ? `${count} × ${formatDimension(piece.width)}"`
        : `W. ${formatDimension(piece.width)}"`,
    });
    index += count;
  }

  return (
    <g pointerEvents="none" aria-hidden="true" data-layer="FRENCH_DOOR_DIMENSIONS">
      {dimensionSections.map((section) => (
        <g key={`dimension-${section.index}`} fill={DIMENSION_COLOR} stroke={DIMENSION_COLOR}>
          <line x1={section.logicalLeft} y1={topY} x2={section.logicalRight} y2={topY} strokeWidth={stroke} />
          <DimensionText
            x={(section.logicalLeft + section.logicalRight) / 2}
            y={topY}
            textAnchor="middle"
            stroke="none"
            fallbackFontSize={font}
            screenOffsetYPx={DIMENSION_LABEL_ABOVE_LINE_PX}
          >
            {section.label}
          </DimensionText>
        </g>
      ))}
      {layout.boundaries.map((boundary, index) => (
        <line
          key={`boundary-${index}`}
          x1={boundary}
          y1={tickTop}
          x2={boundary}
          y2={tickBottom}
          stroke={DIMENSION_COLOR}
          strokeWidth={stroke}
        />
      ))}
      <DimensionArrows
        width={layout.totalWidth}
        height={layout.height}
        variant={variant}
      />
    </g>
  );
}

function containerClass(variant: PieceDiagramVariant, className?: string) {
  const base =
    variant === "report"
      ? "flex h-full w-full items-center justify-center overflow-hidden"
      : "flex h-full w-full items-center justify-center overflow-hidden rounded-md border p-2";
  return `${base} ${className ?? ""}`.trim();
}

export function Series600MixedAssemblyDiagram({
  configuration,
  pieces,
  dimensionMode = "STANDARD",
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  muntin,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  showDimensions = true,
  idNamespace,
  variant = "editor",
  className,
}: PieceDiagramSeries600MixedAssemblyProps) {
  const reactId = useId();
  const namespace = safeId(idNamespace ?? `ae-french-door-mixed-${reactId}`);
  const layout = resolveMixedLayout(configuration, pieces);
  const frameColor = normalizeFrameColor(frameColorHex);
  const finish = doorFinish(frameColor);
  const movementColor = normalizeMovementIndicatorColor(movementIndicatorColor);
  const movementPanels = mixedMovementPanels(layout);
  // Keep the dimension lines in the viewBox; the fixed pixel padding below
  // reserves label space without shrinking the product a second time.
  const top = showDimensions ? layout.height * 0.07 : 0;
  const bottom = showDimensions ? layout.height * 0.07 : 0;
  const left = showDimensions ? layout.height * 0.02 : 0;
  const right = showDimensions ? layout.height * 0.07 : 0;
  // Conservative Arial bold label width, including its prefix and inch mark.
  // Decimal dimensions need more room than the usual two-digit measurements.
  const labelWidthPx = (value: number, prefixEm: number) =>
    DIMENSION_SCREEN_FONT_SIZE_PX *
    (prefixEm + [...formatDimension(value)].reduce((width, char) => width + (char === "." ? 0.3 : 0.6), 0));
  const sectionLabelWidth = Math.max(...layout.pieces.map((piece) => labelWidthPx(piece.width, 1.9)));

  return (
    <div
      className={containerClass(variant, className)}
      style={{
        minHeight: 0,
        maxHeight: "100%",
        backgroundColor: "transparent",
        boxSizing: "border-box",
        // DimensionText keeps a fixed pixel font and offsets. Reserve its
        // space inside the clipped card even when the SVG scales down.
        paddingTop: showDimensions
          ? DIMENSION_SCREEN_FONT_SIZE_PX - DIMENSION_LABEL_ABOVE_LINE_PX + 2
          : undefined,
        paddingBottom: showDimensions
          ? DIMENSION_LABEL_BELOW_LINE_PX + DIMENSION_SCREEN_FONT_SIZE_PX * 0.3 + 2
          : undefined,
        paddingLeft: showDimensions ? Math.max(32, sectionLabelWidth / 2 + 2) : undefined,
        paddingRight: showDimensions
          ? Math.max(VERTICAL_DIMENSION_RESERVE_PX, sectionLabelWidth / 2 + 2)
          : undefined,
      }}
      data-diagram-family="FRENCH_DOOR"
      data-configuration={configuration}
      data-dimension-mode={dimensionMode}
      data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        overflow="visible"
        viewBox={`${-left} ${-top} ${layout.totalWidth + left + right} ${layout.height + top + bottom}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`French Door ${configuration}, ${formatDimension(layout.totalWidth)} by ${formatDimension(layout.height)} inches`}
        style={{ backgroundColor: "transparent" }}
      >
        {layout.pieces.map((piece) => {
          const pieceId = `${namespace}-piece-${piece.index}`;
          const materialProps = {
            width: piece.drawWidth,
            height: layout.height,
            frameColor,
            glassTintHex,
            hasCoating,
            hasPrivacy,
            joined: piece.joined,
            movementIndicatorId: pieceId,
          } as const;
          let structure: React.ReactNode;
          if (piece.kind === "X") {
            structure = <XStructure {...materialProps} hingeSide={piece.exteriorHingeSide!} />;
          } else if (piece.kind === "XX") {
            structure = <XXStructure {...materialProps} structureId={piece.structureId!} />;
          } else {
            structure = <OStructure {...materialProps} mirror={piece.mirrorSidelite} />;
          }
          // The fixed jamb covers the entire ½″ lap on the door, on either side of the opening.
          const trimLeft = piece.kind !== "O" && piece.joined.left ? FRAME_OVERLAP_INCHES : 0;
          const trimRight = piece.kind !== "O" && piece.joined.right ? FRAME_OVERLAP_INCHES : 0;
          const clipId = trimLeft || trimRight ? `${pieceId}-visible-frame` : undefined;
          return (
            <g key={piece.index} transform={`translate(${piece.drawLeft} 0)`}>
              {clipId && <defs><clipPath id={clipId}>
                <rect x={trimLeft} y={0} width={Math.max(0, piece.drawWidth - trimLeft - trimRight)} height={layout.height} />
              </clipPath></defs>}
              <g clipPath={clipId ? `url(#${clipId})` : undefined}>{structure}</g>
            </g>
          );
        })}
        {layout.pieces.filter(piece => piece.kind === "O" && (piece.joined.left || piece.joined.right)).map(sidelite => {
          // Follow the exposed edge of the sidelite. The nominal dimension tick stays at the section boundary.
          const edge = sidelite.joined.left ? sidelite.drawLeft : sidelite.drawLeft + sidelite.drawWidth;
          const towardDoor = sidelite.joined.left ? -1 : 1;
          const shadow = edge + towardDoor * 0.10;
          const highlight = edge - towardDoor * 0.08;
          return (
            <g key={sidelite.index} aria-hidden="true" pointerEvents="none">
              <line x1={shadow} x2={shadow} y1={0} y2={layout.height} stroke={finish("#73817D", -0.45)} strokeOpacity={0.3} strokeWidth={0.16} />
              <line x1={highlight} x2={highlight} y1={0} y2={layout.height} stroke={finish("#FFFFFF", 0.32)} strokeWidth={0.08} />
              <line x1={edge} x2={edge} y1={0} y2={layout.height} stroke={finish("#84918C", -0.4)} strokeWidth={0.11} data-part="sidelite-door-seam" />
            </g>
          );
        })}
        <MuntinLayer
          muntin={muntin}
          glassPanels={frenchDoorMuntinPanels(movementPanels)}
          frameColorHex={frameColor}
          unitsPerInch={1}
          idNamespace={`${namespace}-glass`}
        />
        <Serie600MovementIndicators
          panels={movementPanels}
          movementIndicatorColor={movementColor}
          idNamespace={`${namespace}-movement`}
        />
        {showDimensions ? <MixedDimensions layout={layout} variant={variant} /> : null}
      </svg>
    </div>
  );
}

export function PieceDiagram({
  diagramFamily = "FRENCH_DOOR",
  configuration,
  dimensionMode = "STANDARD",
  piece,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  muntin,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  visualTemplate,
  exteriorHingeSide = "right",
  activeLeaf = "left",
  boreCount = 2,
  series600XXStructureId,
  series600MixedPieces,
  showDimensions = true,
  idNamespace,
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const reactId = useId();

  if (visualTemplate === "ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR") {
    if (!series600MixedPieces || !configuration) {
      throw new Error("Mixed French Door requires configuration and pieces");
    }
    return (
      <Series600MixedAssemblyDiagram
        configuration={configuration as PieceDiagramSeries600MixedConfiguration}
        pieces={series600MixedPieces}
        dimensionMode={dimensionMode}
        frameColorHex={frameColorHex}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
        muntin={muntin}
        movementIndicatorColor={movementIndicatorColor}
        showDimensions={showDimensions}
        idNamespace={idNamespace}
        variant={variant}
        className={className}
      />
    );
  }

  const width = parsePositiveDimension(
    piece?.width ?? piece?.doorWidth,
    "width",
  );
  const height = parsePositiveDimension(
    piece?.height ?? piece?.doorHeight,
    "height",
  );
  const frameColor = normalizeFrameColor(frameColorHex);
  const movementColor = normalizeMovementIndicatorColor(movementIndicatorColor);
  const namespace = safeId(idNamespace ?? `ae-french-door-${reactId}`);
  const top = showDimensions ? height * 0.02 : 0;
  const bottom = showDimensions ? height * 0.07 : 0;
  const left = showDimensions ? height * 0.02 : 0;
  const right = showDimensions ? height * 0.07 : 0;
  const materialProps = {
    width,
    height,
    frameColor,
    glassTintHex,
    hasCoating,
    hasPrivacy,
    muntin,
    movementIndicatorColor: movementColor,
  } as const;

  let product: React.ReactNode;
  if (visualTemplate === "ECO_SERIES_600_X_EXTERIOR" && configuration === "X") {
    product = (
      <XStructure
        {...materialProps}
        hingeSide={exteriorHingeSide}
        movementIndicatorId={`${namespace}-x`}
      />
    );
  } else if (
    visualTemplate === "ECO_SERIES_600_XX_EXTERIOR" &&
    configuration === "XX"
  ) {
    product = (
      <XXStructure
        {...materialProps}
        structureId={resolveXXStructureId(
          series600XXStructureId,
          activeLeaf,
          boreCount,
        )}
        movementIndicatorId={`${namespace}-xx`}
      />
    );
  } else if (
    visualTemplate === "ECO_SERIES_600_O_SIDELITE_EXTERIOR" &&
    configuration === "O"
  ) {
    product = (
      <OStructure {...materialProps} movementIndicatorId={`${namespace}-o`} />
    );
  } else {
    throw new Error(
      `Unsupported French Door visual template: ${String(visualTemplate)}`,
    );
  }

  return (
    <div
      className={containerClass(variant, className)}
      style={{
        minHeight: 0,
        maxHeight: "100%",
        backgroundColor: "transparent",
        boxSizing: "border-box",
        paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined,
        paddingBottom: showDimensions
          ? DIMENSION_LABEL_BELOW_LINE_PX + DIMENSION_SCREEN_FONT_SIZE_PX * 0.3 + 2
          : undefined,
      }}
      data-diagram-family={diagramFamily}
      data-configuration={configuration}
      data-dimension-mode={dimensionMode}
      data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        overflow="visible"
        viewBox={`${-left} ${-top} ${width + left + right} ${height + top + bottom}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`French Door ${configuration}, ${formatDimension(width)} by ${formatDimension(height)} inches`}
        style={{ backgroundColor: "transparent" }}
      >
        {product}
        {showDimensions ? (
          <DimensionArrows width={width} height={height} variant={variant} />
        ) : null}
      </svg>
    </div>
  );
}
