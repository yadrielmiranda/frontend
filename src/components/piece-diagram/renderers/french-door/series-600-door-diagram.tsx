import React, { useId } from "react";

import type { DiagramFamily, DimensionMode } from "@/lib/types";

import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import {
  DEFAULT_MOVEMENT_INDICATOR_COLOR,
  Serie600MovementIndicators,
  normalizeMovementIndicatorColor,
  type Serie600MovementPanel,
} from "./series-600-movement-indicators";

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

export type PieceDiagramSeries600MixedConfiguration =
  | "OX"
  | "OOX"
  | "XO"
  | "XOO"
  | "OXO"
  | "OXOO"
  | "OOXO"
  | "OOXOO"
  | "OXX"
  | "OOXX"
  | "XXO"
  | "XXOO"
  | "OXXO"
  | "OXXOO"
  | "OOXXO"
  | "OOXXOO";

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
const DIMENSION_COLOR = "#2F3B45";
const ASSET_BASE = "/product-visuals/french-door/series-600";
const MIXED_HALF_OVERLAP = 0.25;

const X_SOURCE = {
  href: `${ASSET_BASE}/single-door.png`,
  imageWidth: 690,
  imageHeight: 1569,
  frameX: 68,
  frameY: 40,
  frameWidth: 586,
  frameHeight: 1466,
  glass: { x: 172, y: 142, width: 373, height: 1265 },
} as const;

const O_SOURCE = {
  href: `${ASSET_BASE}/sidelite.png`,
  imageWidth: 370,
  imageHeight: 1648,
  frameWidth: 370,
  frameHeight: 1648,
  glass: { x: 63, y: 97, width: 243, height: 1444 },
} as const;

type XXStructure = {
  href: string;
  activeLeaf: PieceDiagramActiveLeaf;
  boreCount: PieceDiagramBoreCount;
  leftGlass: Rect;
  rightGlass: Rect;
};

const XX_SOURCE = { width: 944, height: 1120 } as const;

const XX_STRUCTURES: Record<
  PieceDiagramSeries600XXStructureId,
  XXStructure
> = {
  LEFT_ACTIVE__TWO_BORE: {
    href: `${ASSET_BASE}/double-left-active-two-bore.png`,
    activeLeaf: "left",
    boreCount: 2,
    leftGlass: { x: 96, y: 93, width: 315, height: 944 },
    rightGlass: { x: 537, y: 93, width: 315, height: 944 },
  },
  LEFT_ACTIVE__THREE_BORE: {
    href: `${ASSET_BASE}/double-left-active-three-bore.png`,
    activeLeaf: "left",
    boreCount: 3,
    leftGlass: { x: 96, y: 93, width: 315, height: 944 },
    rightGlass: { x: 537, y: 93, width: 315, height: 944 },
  },
  RIGHT_ACTIVE__TWO_BORE: {
    href: `${ASSET_BASE}/double-right-active-two-bore.png`,
    activeLeaf: "right",
    boreCount: 2,
    leftGlass: { x: 92, y: 93, width: 315, height: 944 },
    rightGlass: { x: 533, y: 93, width: 315, height: 944 },
  },
  RIGHT_ACTIVE__THREE_BORE: {
    href: `${ASSET_BASE}/double-right-active-three-bore.png`,
    activeLeaf: "right",
    boreCount: 3,
    leftGlass: { x: 92, y: 93, width: 315, height: 944 },
    rightGlass: { x: 533, y: 93, width: 315, height: 944 },
  },
};

const MIXED_PATTERNS: Record<
  PieceDiagramSeries600MixedConfiguration,
  readonly PieceDiagramSeries600MixedPiece["kind"][]
> = {
  OX: ["O", "X"],
  OOX: ["O", "O", "X"],
  XO: ["X", "O"],
  XOO: ["X", "O", "O"],
  OXO: ["O", "X", "O"],
  OXOO: ["O", "X", "O", "O"],
  OOXO: ["O", "O", "X", "O"],
  OOXOO: ["O", "O", "X", "O", "O"],
  OXX: ["O", "XX"],
  OOXX: ["O", "O", "XX"],
  XXO: ["XX", "O"],
  XXOO: ["XX", "O", "O"],
  OXXO: ["O", "XX", "O"],
  OXXOO: ["O", "XX", "O", "O"],
  OOXXO: ["O", "O", "XX", "O"],
  OOXXOO: ["O", "O", "XX", "O", "O"],
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

function frameTintPath(width: number, height: number, glass: readonly Rect[]) {
  return [
    `M 0 0 H ${width} V ${height} H 0 Z`,
    ...glass.map(
      (rect) =>
        `M ${rect.x} ${rect.y} H ${rect.x + rect.width} V ${rect.y + rect.height} H ${rect.x} Z`,
    ),
  ].join(" ");
}

function scaleRect(rect: Rect, scaleX: number, scaleY: number): Rect {
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

function mirroredRect(rect: Rect, width: number): Rect {
  return { ...rect, x: width - rect.x - rect.width };
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

function FrameFinish({
  width,
  height,
  glass,
  color,
}: {
  width: number;
  height: number;
  glass: readonly Rect[];
  color: string;
}) {
  return color === DEFAULT_FRAME_COLOR ? null : (
    <path
      d={frameTintPath(width, height, glass)}
      fill={color}
      fillRule="evenodd"
      clipRule="evenodd"
      style={{ mixBlendMode: "multiply" }}
      data-layer="FRENCH_DOOR_FRAME_FINISH"
    />
  );
}

type StructureMaterialProps = SharedMaterialProps & {
  width: number;
  height: number;
  frameColor: string;
  movementIndicatorColor?: string;
  movementIndicatorId?: string;
};

function XStructure({
  width,
  height,
  hingeSide,
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & {
  hingeSide: PieceDiagramExteriorHingeSide;
}) {
  const scaleX = width / X_SOURCE.frameWidth;
  const scaleY = height / X_SOURCE.frameHeight;
  const baseGlass = {
    x: (X_SOURCE.glass.x - X_SOURCE.frameX) * scaleX,
    y: (X_SOURCE.glass.y - X_SOURCE.frameY) * scaleY,
    width: X_SOURCE.glass.width * scaleX,
    height: X_SOURCE.glass.height * scaleY,
  };
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
        <image
          href={X_SOURCE.href}
          x={-X_SOURCE.frameX * scaleX}
          y={-X_SOURCE.frameY * scaleY}
          width={X_SOURCE.imageWidth * scaleX}
          height={X_SOURCE.imageHeight * scaleY}
          preserveAspectRatio="none"
          data-layer="FRENCH_DOOR_STRUCTURE"
        />
        <GlassAppearanceLayer
          rects={[baseGlass]}
          glassTintHex={glassTintHex}
          hasCoating={hasCoating}
          hasPrivacy={hasPrivacy}
        />
        <FrameFinish
          width={width}
          height={height}
          glass={[baseGlass]}
          color={frameColor}
        />
      </g>
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
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & { mirror?: boolean }) {
  const scaleX = width / O_SOURCE.frameWidth;
  const scaleY = height / O_SOURCE.frameHeight;
  const baseGlass = scaleRect(O_SOURCE.glass, scaleX, scaleY);
  const indicatorGlass = mirror ? mirroredRect(baseGlass, width) : baseGlass;
  const transform = mirror
    ? `translate(${width} 0) scale(-1 1)`
    : undefined;

  return (
    <g
      data-configuration="O"
      data-product-role="SIDELITE"
      data-view="EXTERIOR"
      data-glass-source="DATABASE_APPEARANCE_LAYER"
    >
      <g transform={transform}>
        <image
          href={O_SOURCE.href}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="none"
          data-layer="FRENCH_DOOR_STRUCTURE"
        />
        <GlassAppearanceLayer
          rects={[baseGlass]}
          glassTintHex={glassTintHex}
          hasCoating={hasCoating}
          hasPrivacy={hasPrivacy}
        />
        <FrameFinish
          width={width}
          height={height}
          glass={[baseGlass]}
          color={frameColor}
        />
      </g>
      {movementIndicatorColor ? (
        <Serie600MovementIndicators
          panels={[{ kind: "O", role: "FIXED", glass: indicatorGlass }]}
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
  frameColor,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  movementIndicatorColor,
  movementIndicatorId,
}: StructureMaterialProps & {
  structureId: PieceDiagramSeries600XXStructureId;
}) {
  const structure = XX_STRUCTURES[structureId];
  const scaleX = width / XX_SOURCE.width;
  const scaleY = height / XX_SOURCE.height;
  const leftGlass = scaleRect(structure.leftGlass, scaleX, scaleY);
  const rightGlass = scaleRect(structure.rightGlass, scaleX, scaleY);

  return (
    <g
      data-configuration="XX"
      data-view="EXTERIOR"
      data-active-leaf={structure.activeLeaf}
      data-bore-count={structure.boreCount}
      data-structure-id={structureId}
      data-glass-source="DATABASE_APPEARANCE_LAYER"
    >
      <image
        href={structure.href}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
        data-layer="FRENCH_DOOR_STRUCTURE"
      />
      <GlassAppearanceLayer
        rects={[leftGlass, rightGlass]}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />
      <FrameFinish
        width={width}
        height={height}
        glass={[leftGlass, rightGlass]}
        color={frameColor}
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
  const stroke = Math.max(height * 0.0025, 0.16) * scale;
  const font = Math.max(height * 0.025, 1.7) * scale;
  const widthY = height + height * 0.055;
  const widthTextY = widthY + height * 0.045;
  const heightX = width + height * 0.055;
  const heightTextX = heightX + height * 0.03;
  const arrowDepth = height * 0.012;
  const arrowHalf = height * 0.0065;

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
          <line x1={0} y1={height} x2={0} y2={widthY + arrowHalf} strokeWidth={stroke} />
          <line x1={width} y1={height} x2={width} y2={widthY + arrowHalf} strokeWidth={stroke} />
          <line x1={0} y1={widthY} x2={width} y2={widthY} strokeWidth={stroke} />
          <path d={`M 0 ${widthY} L ${arrowDepth} ${widthY - arrowHalf} L ${arrowDepth} ${widthY + arrowHalf} Z`} />
          <path d={`M ${width} ${widthY} L ${width - arrowDepth} ${widthY - arrowHalf} L ${width - arrowDepth} ${widthY + arrowHalf} Z`} />
          <text
            x={width / 2}
            y={widthTextY}
            textAnchor="middle"
            stroke="none"
            fontFamily="Arial, ui-sans-serif, system-ui, sans-serif"
            fontSize={font}
            fontWeight={700}
          >
            W. {formatDimension(width)}&quot;
          </text>
        </g>
      ) : null}
      {showHeight ? (
        <g>
          <line x1={width} y1={0} x2={heightX + arrowHalf} y2={0} strokeWidth={stroke} />
          <line x1={width} y1={height} x2={heightX + arrowHalf} y2={height} strokeWidth={stroke} />
          <line x1={heightX} y1={0} x2={heightX} y2={height} strokeWidth={stroke} />
          <path d={`M ${heightX} 0 L ${heightX - arrowHalf} ${arrowDepth} L ${heightX + arrowHalf} ${arrowDepth} Z`} />
          <path d={`M ${heightX} ${height} L ${heightX - arrowHalf} ${height - arrowDepth} L ${heightX + arrowHalf} ${height - arrowDepth} Z`} />
          <text
            x={heightTextX}
            y={height / 2}
            dominantBaseline="middle"
            stroke="none"
            fontFamily="Arial, ui-sans-serif, system-ui, sans-serif"
            fontSize={font}
            fontWeight={700}
          >
            H. {formatDimension(height)}&quot;
          </text>
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
  const expected = MIXED_PATTERNS[configuration];
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
      const glass = scaleRect(
        O_SOURCE.glass,
        piece.drawWidth / O_SOURCE.frameWidth,
        layout.height / O_SOURCE.frameHeight,
      );
      const placed = piece.mirrorSidelite
        ? mirroredRect(glass, piece.drawWidth)
        : glass;
      panels.push({
        kind: "O",
        role: "FIXED",
        glass: { ...placed, x: piece.drawLeft + placed.x },
      });
      continue;
    }
    if (piece.kind === "X") {
      const baseGlass: Rect = {
        x:
          ((X_SOURCE.glass.x - X_SOURCE.frameX) / X_SOURCE.frameWidth) *
          piece.drawWidth,
        y:
          ((X_SOURCE.glass.y - X_SOURCE.frameY) / X_SOURCE.frameHeight) *
          layout.height,
        width: (X_SOURCE.glass.width / X_SOURCE.frameWidth) * piece.drawWidth,
        height:
          (X_SOURCE.glass.height / X_SOURCE.frameHeight) * layout.height,
      };
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
    ([
      ["left", structure.leftGlass],
      ["right", structure.rightGlass],
    ] as const).forEach(([hingeSide, sourceGlass]) => {
      const glass = scaleRect(
        sourceGlass,
        piece.drawWidth / XX_SOURCE.width,
        layout.height / XX_SOURCE.height,
      );
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
  const font = layout.height * (variant === "report" ? 0.021 : 0.023);
  const stroke = Math.max(layout.height * 0.0024, 0.16);
  const topY = -layout.height * 0.055;
  const labelY = -layout.height * 0.075;
  const tickTop = topY - layout.height * 0.012;
  const tickBottom = -layout.height * 0.01;

  return (
    <g pointerEvents="none" aria-hidden="true" data-layer="FRENCH_DOOR_DIMENSIONS">
      {layout.pieces.map((piece) => (
        <g key={`dimension-${piece.index}`} fill={DIMENSION_COLOR} stroke={DIMENSION_COLOR}>
          <line x1={piece.logicalLeft} y1={topY} x2={piece.logicalRight} y2={topY} strokeWidth={stroke} />
          <text
            x={(piece.logicalLeft + piece.logicalRight) / 2}
            y={labelY}
            textAnchor="middle"
            stroke="none"
            fontFamily="Arial, ui-sans-serif, system-ui, sans-serif"
            fontSize={font}
            fontWeight={700}
          >
            W. {formatDimension(piece.width)}&quot;
          </text>
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
  const movementColor = normalizeMovementIndicatorColor(movementIndicatorColor);
  const top = showDimensions ? layout.height * 0.12 : 0;
  const bottom = showDimensions ? layout.height * 0.14 : 0;
  const left = showDimensions ? layout.height * 0.02 : 0;
  const right = showDimensions ? layout.height * 0.23 : 0;

  return (
    <div
      className={containerClass(variant, className)}
      style={{ minHeight: 0, maxHeight: "100%", backgroundColor: "transparent" }}
      data-diagram-family="FRENCH_DOOR"
      data-configuration={configuration}
      data-dimension-mode={dimensionMode}
      data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={`${-left} ${-top} ${layout.totalWidth + left + right} ${layout.height + top + bottom}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`French Door ${configuration}, ${formatDimension(layout.totalWidth)} by ${formatDimension(layout.height)} inches`}
        style={{ backgroundColor: "transparent" }}
      >
        {layout.pieces.map((piece) => {
          const materialProps = {
            width: piece.drawWidth,
            height: layout.height,
            frameColor,
            glassTintHex,
            hasCoating,
            hasPrivacy,
          } as const;
          if (piece.kind === "X") {
            return (
              <g key={piece.index} transform={`translate(${piece.drawLeft} 0)`}>
                <XStructure
                  {...materialProps}
                  hingeSide={piece.exteriorHingeSide!}
                  movementIndicatorId={`${namespace}-piece-${piece.index}`}
                />
              </g>
            );
          }
          if (piece.kind === "XX") {
            return (
              <g key={piece.index} transform={`translate(${piece.drawLeft} 0)`}>
                <XXStructure
                  {...materialProps}
                  structureId={piece.structureId!}
                  movementIndicatorId={`${namespace}-piece-${piece.index}`}
                />
              </g>
            );
          }
          return (
            <g key={piece.index} transform={`translate(${piece.drawLeft} 0)`}>
              <OStructure
                {...materialProps}
                mirror={piece.mirrorSidelite}
                movementIndicatorId={`${namespace}-piece-${piece.index}`}
              />
            </g>
          );
        })}
        <Serie600MovementIndicators
          panels={mixedMovementPanels(layout)}
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
  const bottom = showDimensions ? height * 0.14 : 0;
  const left = showDimensions ? height * 0.02 : 0;
  const right = showDimensions ? height * 0.23 : 0;
  const materialProps = {
    width,
    height,
    frameColor,
    glassTintHex,
    hasCoating,
    hasPrivacy,
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
      style={{ minHeight: 0, maxHeight: "100%", backgroundColor: "transparent" }}
      data-diagram-family={diagramFamily}
      data-configuration={configuration}
      data-dimension-mode={dimensionMode}
      data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
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
