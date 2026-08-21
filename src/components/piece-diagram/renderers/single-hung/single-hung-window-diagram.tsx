// Authentic Evolution · Single Hung Window · C065 FINAL
// Approved visual source: C064_REVIEW approved by the user on 2026-08-08.
import React, { useId } from "react";
import { GlassAppearanceLayer } from "../glass-appearance";

export type SingleHungConfiguration =
  | "EQUAL_LITES"
  | "UNEQUAL_LITES"
  | "SH_OVER_FIX_EQUAL_LITES";
export type SingleHungDimension = number | string;

interface SingleHungCommonProps {
  width: SingleHungDimension;
  height: SingleHungDimension;
  sashHeight?: SingleHungDimension | null;
  windowHeight?: SingleHungDimension | null;
  screenEnabled: boolean;
  movementIndicatorColor?: string;
  frameColorHex?: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  assetBasePath?: string;
  idNamespace?: string;
  className?: string;
}

export type SingleHungWindowDiagramProps = SingleHungCommonProps & {
  configuration: SingleHungConfiguration;
};

type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

type LayoutKind = "STANDARD" | "OVER_FIX";

interface StructuralSourceSpec {
  assetFilename: string;
  kind: LayoutKind;
  upperHeight: number;
  lowerHeight: number;
  fixedHeight?: number;
}

interface LayoutSpec {
  id: SingleHungConfiguration;
  configuration: SingleHungConfiguration;
  panelSequence: "O-X" | "O-X-O";
  kind: LayoutKind;
  upperHeight: number;
  lowerHeight: number;
  fixedHeight?: number;
  source: StructuralSourceSpec;
  sectionRatios: readonly number[];
  resolvedSashHeight: number | null;
  resolvedWindowHeight: number | null;
}

interface LayoutGeometry {
  upperGlass: Rect;
  lowerGlass: Rect;
  fixedGlass: Rect | null;
  screenOuter: Rect;
  screenMesh: Rect;
  screenSupportY: number;
}

export const DEFAULT_MOVEMENT_INDICATOR_COLOR = "#C6020C";
export const DEFAULT_FRAME_COLOR = "#FFFFFF";

const RELEASE = "C065_FINAL";
const VIEWBOX = { width: 2048, height: 2048 } as const;
const DIMENSION_COLOR = "#2F3B45";
const DEFAULT_ASSET_BASE_PATH = "/product-visuals/single-hung-window/c065";

const PRODUCT_REGION = {
  x: 300,
  y: 190,
  width: 1200,
  height: 1480,
} as const;

const SOURCE_PLACEMENT = { x: 230, y: 45, width: 1135, height: 1752 } as const;
const SOURCE_WIDTH = 971;
const SOURCE_HEIGHT = 1620;
const GLASS_X = 169;
const GLASS_WIDTH = 632;
const SCREEN_POCKET_LEFT = 143;
const SCREEN_POCKET_RIGHT = 827;
const SCREEN_TOP_RAIL_SOURCE_HEIGHT = 17;
const SCREEN_BOTTOM_RAIL_SOURCE_HEIGHT = 17;
const TOP_BAND_END = 167;
const ORIGINAL_UPPER_GLASS_HEIGHT = 559;
const MEETING_RAIL_HEIGHT = 81;
const ORIGINAL_LOWER_GLASS_HEIGHT = 573;
const LOCAL_SUPPORT_OFFSET = 91.13;
const MODULE_BOTTOM_BAND_HEIGHT = 137;
const FIXED_BOTTOM_BAND_HEIGHT = TOP_BAND_END;
const STANDARD_FLEX_HEIGHT = ORIGINAL_UPPER_GLASS_HEIGHT + ORIGINAL_LOWER_GLASS_HEIGHT;
const OVER_FIX_FLEX_HEIGHT =
  SOURCE_HEIGHT -
  TOP_BAND_END -
  MEETING_RAIL_HEIGHT -
  MODULE_BOTTOM_BAND_HEIGHT -
  FIXED_BOTTOM_BAND_HEIGHT;

const sourceScaleX = SOURCE_PLACEMENT.width / SOURCE_WIDTH;
const sourceScaleY = SOURCE_PLACEMENT.height / SOURCE_HEIGHT;

const mapRect = (rect: Rect): Rect => ({
  x: SOURCE_PLACEMENT.x + rect.x * sourceScaleX,
  y: SOURCE_PLACEMENT.y + rect.y * sourceScaleY,
  width: rect.width * sourceScaleX,
  height: rect.height * sourceScaleY,
});

const equalOverFixField = Math.floor(OVER_FIX_FLEX_HEIGHT / 3);

const STRUCTURAL_SOURCES = {
  STANDARD_EQUAL: {
    assetFilename: "single-hung-window-ox-1-2-1-2-structural-c065.png",
    kind: "STANDARD",
    upperHeight: ORIGINAL_UPPER_GLASS_HEIGHT,
    lowerHeight: ORIGINAL_LOWER_GLASS_HEIGHT,
  },
  STANDARD_UNEQUAL: {
    assetFilename: "single-hung-window-ox-2-3-1-3-structural-c065.png",
    kind: "STANDARD",
    upperHeight: Math.round((STANDARD_FLEX_HEIGHT * 2) / 3),
    lowerHeight: STANDARD_FLEX_HEIGHT - Math.round((STANDARD_FLEX_HEIGHT * 2) / 3),
  },
  SH_OVER_FIX_EQUAL: {
    assetFilename: "single-hung-window-sh-over-fix-1-3-1-3-1-3-structural-c065.png",
    kind: "OVER_FIX",
    upperHeight: equalOverFixField,
    lowerHeight: equalOverFixField,
    fixedHeight: OVER_FIX_FLEX_HEIGHT - equalOverFixField * 2,
  },
} as const satisfies Record<string, StructuralSourceSpec>;

const OUTER_FRAME = mapRect({ x: 96, y: 89, width: 778, height: 1428 });

function transformRectToFrame(rect: Rect, frame: Rect): Rect {
  return {
    x:
      frame.x +
      ((rect.x - OUTER_FRAME.x) / OUTER_FRAME.width) * frame.width,
    y:
      frame.y +
      ((rect.y - OUTER_FRAME.y) / OUTER_FRAME.height) * frame.height,
    width: (rect.width / OUTER_FRAME.width) * frame.width,
    height: (rect.height / OUTER_FRAME.height) * frame.height,
  };
}

function transformGeometryToFrame(
  geometry: LayoutGeometry,
  frame: Rect,
): LayoutGeometry {
  return {
    upperGlass: transformRectToFrame(geometry.upperGlass, frame),
    lowerGlass: transformRectToFrame(geometry.lowerGlass, frame),
    fixedGlass: geometry.fixedGlass
      ? transformRectToFrame(geometry.fixedGlass, frame)
      : null,
    screenOuter: transformRectToFrame(geometry.screenOuter, frame),
    screenMesh: transformRectToFrame(geometry.screenMesh, frame),
    screenSupportY:
      frame.y +
      ((geometry.screenSupportY - OUTER_FRAME.y) / OUTER_FRAME.height) *
        frame.height,
  };
}

const ARROW = {
  referenceAxis: 604,
  triangleLength: 31,
  triangleHalfBase: 22,
  mainStroke: 7,
  shadowStroke: 9,
  shadowTriangleStroke: 2,
  triangleOutline: 1.25,
  specularLine: 1.15,
  specularTriangle: 0.9,
  shadowBlur: 2.2,
  specularBlur: 0.3,
} as const;

const INDICATOR = {
  xOffset: 116,
  xHalfWidth: 10.5,
  xHalfHeight: 14.5,
  oRadiusX: 12,
  oRadiusY: 15.5,
  arrowStartOffset: 83,
  arrowTipOffset: 132,
  labelStroke: 3.2,
  labelOpacity: 0.8,
} as const;

export function normalizeHexColor(input: unknown, propName = "color"): string {
  if (typeof input !== "string") {
    throw new Error(`${propName} must be a hexadecimal color string`);
  }
  const value = input.trim();
  const short = value.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    return `#${short[1]!
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`.toUpperCase();
  }
  const full = value.match(/^#([0-9a-fA-F]{6})$/);
  if (!full) {
    throw new Error(`${propName} must use #RGB or #RRGGBB hexadecimal format`);
  }
  return `#${full[1]!.toUpperCase()}`;
}

function hexToRgb(input: string): { r: number; g: number; b: number } {
  const value = normalizeHexColor(input);
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase();
}

function mixHex(left: string, right: string, amount: number): string {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function multiplyHex(left: string, right: string): string {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  return rgbToHex({ r: (a.r * b.r) / 255, g: (a.g * b.g) / 255, b: (a.b * b.b) / 255 });
}

function indicatorPalette(input: string) {
  return {
    base: input,
    highlight: mixHex(input, "#FFFFFF", 0.15),
    shadow: mixHex(input, "#000000", 0.23),
    ghost: mixHex(input, "#000000", 0.34),
    specular: mixHex(input, "#FFFFFF", 0.92),
  };
}

function framePalette(input: string) {
  return {
    requested: input,
    base: multiplyHex("#ECECEA", input),
    highlight: multiplyHex("#EDEDEB", input),
    mid: multiplyHex("#EBEAE8", input),
    shadow: mixHex(input, "#000000", 0.28),
    edge: mixHex(input, "#000000", 0.38),
  };
}

function resolveLayout(
  configuration: SingleHungConfiguration,
  totalHeight: number,
  sashHeight: number | null,
  windowHeight: number | null,
): LayoutSpec {
  if (configuration === "EQUAL_LITES") {
    return {
      id: configuration,
      configuration,
      panelSequence: "O-X",
      kind: "STANDARD",
      upperHeight: STANDARD_FLEX_HEIGHT / 2,
      lowerHeight: STANDARD_FLEX_HEIGHT / 2,
      source: STRUCTURAL_SOURCES.STANDARD_EQUAL,
      sectionRatios: [1 / 2, 1 / 2],
      resolvedSashHeight: totalHeight / 2,
      resolvedWindowHeight: null,
    };
  }

  if (configuration === "UNEQUAL_LITES") {
    const resolvedSashHeight =
      sashHeight !== null && sashHeight <= totalHeight / 2
        ? sashHeight
        : totalHeight / 2;
    const lowerRatio = resolvedSashHeight / totalHeight;
    const lowerHeight = STANDARD_FLEX_HEIGHT * lowerRatio;
    const source =
      Math.abs(lowerRatio - 1 / 3) < Math.abs(lowerRatio - 1 / 2)
        ? STRUCTURAL_SOURCES.STANDARD_UNEQUAL
        : STRUCTURAL_SOURCES.STANDARD_EQUAL;

    return {
      id: configuration,
      configuration,
      panelSequence: "O-X",
      kind: "STANDARD",
      upperHeight: STANDARD_FLEX_HEIGHT - lowerHeight,
      lowerHeight,
      source,
      sectionRatios: [1 - lowerRatio, lowerRatio],
      resolvedSashHeight,
      resolvedWindowHeight: null,
    };
  }

  if (configuration === "SH_OVER_FIX_EQUAL_LITES") {
    const resolvedWindowHeight =
      windowHeight !== null && windowHeight < totalHeight
        ? windowHeight
        : (totalHeight * 2) / 3;
    const singleHungLiteRatio = resolvedWindowHeight / totalHeight / 2;
    const fixedRatio = 1 - resolvedWindowHeight / totalHeight;

    return {
      id: configuration,
      configuration,
      panelSequence: "O-X-O",
      kind: "OVER_FIX",
      upperHeight: OVER_FIX_FLEX_HEIGHT * singleHungLiteRatio,
      lowerHeight: OVER_FIX_FLEX_HEIGHT * singleHungLiteRatio,
      fixedHeight: OVER_FIX_FLEX_HEIGHT * fixedRatio,
      source: STRUCTURAL_SOURCES.SH_OVER_FIX_EQUAL,
      sectionRatios: [singleHungLiteRatio, singleHungLiteRatio, fixedRatio],
      resolvedSashHeight: resolvedWindowHeight / 2,
      resolvedWindowHeight,
    };
  }

  throw new Error(
    `Unsupported Single Hung configuration: ${String(configuration)}`,
  );
}

function geometryForLayout(layout: LayoutSpec): LayoutGeometry {
  const upperY = TOP_BAND_END;
  const lowerY = upperY + layout.upperHeight + MEETING_RAIL_HEIGHT;
  const moduleBottomStart = lowerY + layout.lowerHeight;
  const fixedY = layout.kind === "OVER_FIX" ? moduleBottomStart + MODULE_BOTTOM_BAND_HEIGHT : null;
  const supportSourceY = layout.kind === "OVER_FIX" ? moduleBottomStart + LOCAL_SUPPORT_OFFSET : 1471.13;
  const upperGlass = mapRect({ x: GLASS_X, y: upperY, width: GLASS_WIDTH, height: layout.upperHeight });
  const lowerGlass = mapRect({ x: GLASS_X, y: lowerY, width: GLASS_WIDTH, height: layout.lowerHeight });
  const fixedGlass =
    layout.kind === "OVER_FIX" && fixedY !== null && layout.fixedHeight !== undefined
      ? mapRect({ x: GLASS_X, y: fixedY, width: GLASS_WIDTH, height: layout.fixedHeight })
      : null;
  const screenTop = lowerY - SCREEN_TOP_RAIL_SOURCE_HEIGHT;
  const screenMeshBottom = supportSourceY - SCREEN_BOTTOM_RAIL_SOURCE_HEIGHT;
  if (screenMeshBottom <= moduleBottomStart) {
    throw new Error(`${layout.id} has no visible frame below the operable panel`);
  }
  return {
    upperGlass,
    lowerGlass,
    fixedGlass,
    screenOuter: mapRect({
      x: SCREEN_POCKET_LEFT,
      y: screenTop,
      width: SCREEN_POCKET_RIGHT - SCREEN_POCKET_LEFT,
      height: supportSourceY - screenTop,
    }),
    screenMesh: mapRect({
      x: GLASS_X,
      y: lowerY,
      width: GLASS_WIDTH,
      height: screenMeshBottom - lowerY,
    }),
    screenSupportY: SOURCE_PLACEMENT.y + supportSourceY * sourceScaleY,
  };
}

const EQUAL_GEOMETRY = geometryForLayout(
  resolveLayout("EQUAL_LITES", 2, null, null),
);

function center(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function parsePositiveDimension(
  value: SingleHungDimension,
  propName: "width" | "height" | "sashHeight" | "windowHeight",
): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error(`${propName} must be a positive finite number`);
  }

  if (typeof value !== "string") {
    throw new Error(`${propName} must be a number or dimension string`);
  }
  const normalized = value
    .trim()
    .replace(/[\u2033\u201d"]/g, "")
    .replace(/\s+/g, " ");
  const decimal = normalized.match(/^\d+(?:\.\d+)?$/);
  if (decimal) {
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const fraction = normalized.match(/^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/);
  if (fraction) {
    const whole = fraction[1] ? Number(fraction[1]) : 0;
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    if (denominator > 0 && numerator < denominator) {
      const parsed = whole + numerator / denominator;
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  throw new Error(`${propName} must be positive, for example 60, 60.5, or "60 1/2"`);
}

function parseOptionalDimension(
  value: SingleHungDimension | null | undefined,
  propName: "sashHeight" | "windowHeight",
): number | null {
  if (value === null || value === undefined || value === "") return null;

  try {
    return parsePositiveDimension(value, propName);
  } catch {
    return null;
  }
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
}

function formatDimension(value: number): string {
  const sixteenths = Math.round(value * 16);
  if (Math.abs(value - sixteenths / 16) > 1e-7) {
    return `${Number(value.toFixed(4))}\"`;
  }
  const whole = Math.floor(sixteenths / 16);
  const remainder = sixteenths % 16;
  if (remainder === 0) return `${whole}\"`;
  const divisor = greatestCommonDivisor(remainder, 16);
  const fraction = `${remainder / divisor}/${16 / divisor}`;
  return `${whole > 0 ? `${whole} ` : ""}${fraction}\"`;
}

function normalizeAssetBasePath(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("assetBasePath must be a non-empty string");
  }
  return value.replace(/\/$/, "");
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

function frameTintPath(frame: Rect, geometry: LayoutGeometry): string {
  const outerRight = frame.x + frame.width;
  const outerBottom = frame.y + frame.height;
  const parts = [
    `M ${frame.x} ${frame.y}`,
    `H ${outerRight}`,
    `V ${outerBottom}`,
    `H ${frame.x}`,
    "Z",
  ];
  for (const hole of [geometry.upperGlass, geometry.lowerGlass, geometry.fixedGlass]) {
    if (!hole) continue;
    parts.push(
      `M ${hole.x} ${hole.y}`,
      `H ${hole.x + hole.width}`,
      `V ${hole.y + hole.height}`,
      `H ${hole.x}`,
      "Z",
    );
  }
  return parts.join(" ");
}

type StructuralSegment = Readonly<{
  sourceY: number;
  sourceHeight: number;
  targetY: number;
  targetHeight: number;
}>;

function structuralSegments(layout: LayoutSpec): StructuralSegment[] {
  const source = layout.source;

  if (layout.kind === "STANDARD") {
    const sourceMeetingY = TOP_BAND_END + source.upperHeight;
    const sourceLowerY = sourceMeetingY + MEETING_RAIL_HEIGHT;
    const sourceBottomY = sourceLowerY + source.lowerHeight;
    const targetMeetingY = TOP_BAND_END + layout.upperHeight;
    const targetLowerY = targetMeetingY + MEETING_RAIL_HEIGHT;
    const targetBottomY = targetLowerY + layout.lowerHeight;

    return [
      {
        sourceY: 0,
        sourceHeight: TOP_BAND_END,
        targetY: 0,
        targetHeight: TOP_BAND_END,
      },
      {
        sourceY: TOP_BAND_END,
        sourceHeight: source.upperHeight,
        targetY: TOP_BAND_END,
        targetHeight: layout.upperHeight,
      },
      {
        sourceY: sourceMeetingY,
        sourceHeight: MEETING_RAIL_HEIGHT,
        targetY: targetMeetingY,
        targetHeight: MEETING_RAIL_HEIGHT,
      },
      {
        sourceY: sourceLowerY,
        sourceHeight: source.lowerHeight,
        targetY: targetLowerY,
        targetHeight: layout.lowerHeight,
      },
      {
        sourceY: sourceBottomY,
        sourceHeight: SOURCE_HEIGHT - sourceBottomY,
        targetY: targetBottomY,
        targetHeight: SOURCE_HEIGHT - targetBottomY,
      },
    ];
  }

  const sourceFixedHeight = source.fixedHeight ?? 0;
  const targetFixedHeight = layout.fixedHeight ?? 0;
  const sourceMeetingY = TOP_BAND_END + source.upperHeight;
  const sourceLowerY = sourceMeetingY + MEETING_RAIL_HEIGHT;
  const sourceModuleBottomY = sourceLowerY + source.lowerHeight;
  const sourceFixedY = sourceModuleBottomY + MODULE_BOTTOM_BAND_HEIGHT;
  const sourceBottomY = sourceFixedY + sourceFixedHeight;
  const targetMeetingY = TOP_BAND_END + layout.upperHeight;
  const targetLowerY = targetMeetingY + MEETING_RAIL_HEIGHT;
  const targetModuleBottomY = targetLowerY + layout.lowerHeight;
  const targetFixedY = targetModuleBottomY + MODULE_BOTTOM_BAND_HEIGHT;
  const targetBottomY = targetFixedY + targetFixedHeight;

  return [
    {
      sourceY: 0,
      sourceHeight: TOP_BAND_END,
      targetY: 0,
      targetHeight: TOP_BAND_END,
    },
    {
      sourceY: TOP_BAND_END,
      sourceHeight: source.upperHeight,
      targetY: TOP_BAND_END,
      targetHeight: layout.upperHeight,
    },
    {
      sourceY: sourceMeetingY,
      sourceHeight: MEETING_RAIL_HEIGHT,
      targetY: targetMeetingY,
      targetHeight: MEETING_RAIL_HEIGHT,
    },
    {
      sourceY: sourceLowerY,
      sourceHeight: source.lowerHeight,
      targetY: targetLowerY,
      targetHeight: layout.lowerHeight,
    },
    {
      sourceY: sourceModuleBottomY,
      sourceHeight: MODULE_BOTTOM_BAND_HEIGHT,
      targetY: targetModuleBottomY,
      targetHeight: MODULE_BOTTOM_BAND_HEIGHT,
    },
    {
      sourceY: sourceFixedY,
      sourceHeight: sourceFixedHeight,
      targetY: targetFixedY,
      targetHeight: targetFixedHeight,
    },
    {
      sourceY: sourceBottomY,
      sourceHeight: SOURCE_HEIGHT - sourceBottomY,
      targetY: targetBottomY,
      targetHeight: SOURCE_HEIGHT - targetBottomY,
    },
  ];
}

function StructuralBase({
  layout,
  assetBasePath,
}: {
  layout: LayoutSpec;
  assetBasePath: string;
}) {
  const href = `${assetBasePath}/${layout.source.assetFilename}`;

  return (
    <g
      data-layer="STRUCTURAL_BASE"
      data-structural-source={layout.source.assetFilename}
    >
      {structuralSegments(layout).map((segment, index) => {
        const sourceY = segment.sourceY * sourceScaleY;
        const sourceHeight = segment.sourceHeight * sourceScaleY;
        const targetY = SOURCE_PLACEMENT.y + segment.targetY * sourceScaleY;
        const targetHeight = segment.targetHeight * sourceScaleY;

        return (
          <svg
            key={`${segment.sourceY}-${index}`}
            x={SOURCE_PLACEMENT.x}
            y={targetY}
            width={SOURCE_PLACEMENT.width}
            height={targetHeight}
            viewBox={`0 ${sourceY} ${SOURCE_PLACEMENT.width} ${sourceHeight}`}
            preserveAspectRatio="none"
            overflow="hidden"
          >
            <image
              href={href}
              x={0}
              y={0}
              width={SOURCE_PLACEMENT.width}
              height={SOURCE_PLACEMENT.height}
              preserveAspectRatio="none"
            />
          </svg>
        );
      })}
    </g>
  );
}

function Dimensions({
  frame,
  width,
  height,
}: {
  frame: Rect;
  width: string;
  height: string;
}) {
  const x1 = frame.x;
  const x2 = frame.x + frame.width;
  const y1 = frame.y;
  const y2 = frame.y + frame.height;
  const bottomY = y2 + 105;
  const sideX = x2 + 105;
  const middleY = y1 + frame.height / 2;
  const labelGap = 78;
  const head = 13;
  return (
    <g data-dimensions="VISIBLE">
      <g fill={DIMENSION_COLOR} stroke={DIMENSION_COLOR} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${x1} ${bottomY} L ${x2} ${bottomY}`} fill="none" strokeWidth={4} />
        <path d={`M ${x1} ${bottomY} l ${head} -7 v 14 z`} stroke="none" />
        <path d={`M ${x2} ${bottomY} l -${head} -7 v 14 z`} stroke="none" />
        <path d={`M ${sideX} ${y1} L ${sideX} ${middleY - labelGap / 2}`} fill="none" strokeWidth={4} />
        <path d={`M ${sideX} ${middleY + labelGap / 2} L ${sideX} ${y2}`} fill="none" strokeWidth={4} />
        <path d={`M ${sideX} ${y1} l -7 ${head} h 14 z`} stroke="none" />
        <path d={`M ${sideX} ${y2} l -7 -${head} h 14 z`} stroke="none" />
      </g>
      <g fill={DIMENSION_COLOR} fontFamily="Arial, Helvetica, sans-serif" fontWeight={700} fontSize={64}>
        <text x={(x1 + x2) / 2} y={bottomY + 74} textAnchor="middle">{`W. ${width}`}</text>
        <text x={sideX + 28} y={middleY + 13} textAnchor="start">{`H. ${height}`}</text>
      </g>
    </g>
  );
}

function MovementIndicators({ geometry, color, idPrefix }: { geometry: LayoutGeometry; color: string; idPrefix: string }) {
  const colors = indicatorPalette(color);
  const upper = center(geometry.upperGlass);
  const lower = center(geometry.lowerGlass);
  const fixed = geometry.fixedGlass ? center(geometry.fixedGlass) : null;
  const scale = Math.min(EQUAL_GEOMETRY.lowerGlass.height / ARROW.referenceAxis, geometry.lowerGlass.height / 300);
  const xY = lower.y + INDICATOR.xOffset * scale;
  const startY = lower.y + INDICATOR.arrowStartOffset * scale;
  const tipY = lower.y - INDICATOR.arrowTipOffset * scale;
  const baseY = tipY + ARROW.triangleLength * scale;
  const halfBase = ARROW.triangleHalfBase * scale;
  const linePath = `M ${lower.x} ${startY} L ${lower.x} ${baseY}`;
  const trianglePath = `M ${lower.x} ${tipY} L ${lower.x - halfBase} ${baseY} L ${lower.x + halfBase} ${baseY} Z`;
  const upperClip = `${idPrefix}-upper`;
  const lowerClip = `${idPrefix}-lower`;
  const fixedClip = `${idPrefix}-fixed`;
  const gradient = `${idPrefix}-arrow-gradient`;
  const shadow = `${idPrefix}-arrow-shadow`;
  const specular = `${idPrefix}-arrow-specular`;
  return (
    <g data-layer="MOVEMENT_INDICATORS" data-release={RELEASE} data-movement-indicator-color={colors.base}>
      <defs>
        <clipPath id={upperClip}><rect {...geometry.upperGlass} /></clipPath>
        <clipPath id={lowerClip}><rect {...geometry.lowerGlass} /></clipPath>
        {geometry.fixedGlass ? <clipPath id={fixedClip}><rect {...geometry.fixedGlass} /></clipPath> : null}
        <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={lower.x} y1={startY} x2={lower.x} y2={tipY}>
          <stop offset="0%" stopColor={colors.highlight} stopOpacity={0.72} />
          <stop offset="52%" stopColor={colors.base} stopOpacity={0.86} />
          <stop offset="100%" stopColor={colors.shadow} stopOpacity={0.96} />
        </linearGradient>
        <filter id={shadow} x="-60%" y="-30%" width="220%" height="180%"><feGaussianBlur stdDeviation={ARROW.shadowBlur * scale} /></filter>
        <filter id={specular} x="-60%" y="-30%" width="220%" height="180%"><feGaussianBlur stdDeviation={ARROW.specularBlur * scale} /></filter>
      </defs>
      <g clipPath={`url(#${upperClip})`} fill="none" stroke={colors.base} strokeWidth={INDICATOR.labelStroke * scale} opacity={INDICATOR.labelOpacity} shapeRendering="geometricPrecision" data-indicator-panel="O">
        <ellipse cx={upper.x} cy={upper.y} rx={INDICATOR.oRadiusX * scale} ry={INDICATOR.oRadiusY * scale} />
      </g>
      {fixed && geometry.fixedGlass ? (
        <g clipPath={`url(#${fixedClip})`} fill="none" stroke={colors.base} strokeWidth={INDICATOR.labelStroke * scale} opacity={INDICATOR.labelOpacity} shapeRendering="geometricPrecision" data-indicator-panel="O_FIXED_LOWER">
          <ellipse cx={fixed.x} cy={fixed.y} rx={INDICATOR.oRadiusX * scale} ry={INDICATOR.oRadiusY * scale} />
        </g>
      ) : null}
      <g clipPath={`url(#${lowerClip})`} data-indicator-panel="X" data-arrow-direction="up" data-closed-triangle="true">
        <g fill="none" stroke={colors.base} strokeWidth={INDICATOR.labelStroke * scale} strokeLinecap="round" strokeLinejoin="round" opacity={INDICATOR.labelOpacity} shapeRendering="geometricPrecision" data-indicator-glyph="X">
          <path d={`M ${lower.x - INDICATOR.xHalfWidth * scale} ${xY - INDICATOR.xHalfHeight * scale} L ${lower.x + INDICATOR.xHalfWidth * scale} ${xY + INDICATOR.xHalfHeight * scale}`} />
          <path d={`M ${lower.x + INDICATOR.xHalfWidth * scale} ${xY - INDICATOR.xHalfHeight * scale} L ${lower.x - INDICATOR.xHalfWidth * scale} ${xY + INDICATOR.xHalfHeight * scale}`} />
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-indicator-arrow="VERTICAL_MOVEMENT">
          <g transform="translate(2 3)" filter={`url(#${shadow})`} opacity={0.12}>
            <path d={linePath} stroke={colors.ghost} strokeWidth={ARROW.shadowStroke * scale} />
            <path d={trianglePath} fill={colors.ghost} stroke={colors.ghost} strokeWidth={ARROW.shadowTriangleStroke * scale} />
          </g>
          <path d={linePath} stroke={`url(#${gradient})`} strokeWidth={ARROW.mainStroke * scale} opacity={0.88} />
          <path d={trianglePath} fill={`url(#${gradient})`} stroke={colors.shadow} strokeWidth={ARROW.triangleOutline * scale} opacity={0.9} />
          <g transform="translate(-0.85 -0.85)" opacity={0.21} filter={`url(#${specular})`}>
            <path d={linePath} stroke={colors.specular} strokeWidth={ARROW.specularLine * scale} />
            <path d={trianglePath} fill="none" stroke={colors.specular} strokeWidth={ARROW.specularTriangle * scale} />
          </g>
        </g>
      </g>
    </g>
  );
}

function ScreenLayer({ geometry, frameColor, idPrefix }: { geometry: LayoutGeometry; frameColor: string; idPrefix: string }) {
  const colors = framePalette(frameColor);
  const outerRight = geometry.screenOuter.x + geometry.screenOuter.width;
  const outerBottom = geometry.screenOuter.y + geometry.screenOuter.height;
  const meshRight = geometry.screenMesh.x + geometry.screenMesh.width;
  const meshBottom = geometry.screenMesh.y + geometry.screenMesh.height;
  const ring = [
    `M ${geometry.screenOuter.x} ${geometry.screenOuter.y}`,
    `H ${outerRight}`,
    `V ${outerBottom}`,
    `H ${geometry.screenOuter.x}`,
    "Z",
    `M ${geometry.screenMesh.x} ${geometry.screenMesh.y}`,
    `H ${meshRight}`,
    `V ${meshBottom}`,
    `H ${geometry.screenMesh.x}`,
    "Z",
  ].join(" ");
  const pattern = `${idPrefix}-mesh`;
  const gradient = `${idPrefix}-screen-frame`;
  const clip = `${idPrefix}-screen-pocket`;
  const latchY = outerBottom - 22;
  return (
    <g data-layer="SCREEN" data-screen="ON" data-screen-layer-order="ABOVE_INDICATORS" data-frame-color={colors.requested} data-screen-frame-color={colors.base}>
      <defs>
        <pattern id={pattern} width={7} height={7} patternUnits="userSpaceOnUse">
          <path d="M 0 3.5 H 7 M 3.5 0 V 7" fill="none" stroke="#000000" strokeWidth={1} strokeOpacity={0.34} shapeRendering="crispEdges" />
        </pattern>
        <linearGradient id={gradient} x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor={colors.highlight} />
          <stop offset="48%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.base} />
        </linearGradient>
        <clipPath id={clip}><rect {...geometry.screenOuter} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`} data-screen-style="C064_APPROVED_SOFT_BLACK_FINE_MESH_FULL_WIDTH_THIN_EQUAL_RAIL_VISIBLE_FRAME">
        <rect {...geometry.screenMesh} fill={`url(#${pattern})`} data-screen-part="MESH" data-screen-thread-color="#000000" />
        <path d={ring} fill={`url(#${gradient})`} fillRule="evenodd" clipRule="evenodd" data-screen-part="FRAME_FULL_WIDTH_THIN_EQUAL_RAILS" />
        <rect x={geometry.screenOuter.x + 1} y={geometry.screenOuter.y + 1} width={geometry.screenOuter.width - 2} height={geometry.screenOuter.height - 2} fill="none" stroke={colors.edge} strokeWidth={2} opacity={0.62} />
        <rect {...geometry.screenMesh} fill="none" stroke={colors.shadow} strokeWidth={2} opacity={0.72} />
        <g fill={`url(#${gradient})`} stroke={colors.edge} strokeWidth={1}>
          <path d={`M ${geometry.screenOuter.x + 18} ${latchY} h 24 v 10 h -7 v -4 h -17 z`} />
          <path d={`M ${outerRight - 42} ${latchY} h 24 v 10 h -17 v 4 h -7 z`} />
        </g>
      </g>
    </g>
  );
}

export function SingleHungWindowDiagram(props: SingleHungWindowDiagramProps) {
  const reactId = useId();
  if (typeof props.screenEnabled !== "boolean") throw new Error("screenEnabled must be boolean");
  if (props.showDimensions !== undefined && typeof props.showDimensions !== "boolean") {
    throw new Error("showDimensions must be boolean when provided");
  }
  const resolvedWidth = parsePositiveDimension(props.width, "width");
  const resolvedHeight = parsePositiveDimension(props.height, "height");
  const sashHeight = parseOptionalDimension(props.sashHeight, "sashHeight");
  const windowHeight = parseOptionalDimension(
    props.windowHeight,
    "windowHeight",
  );
  const layout = resolveLayout(
    props.configuration,
    resolvedHeight,
    sashHeight,
    windowHeight,
  );
  const width = formatDimension(resolvedWidth);
  const height = formatDimension(resolvedHeight);
  const movementColor = normalizeHexColor(
    props.movementIndicatorColor ?? DEFAULT_MOVEMENT_INDICATOR_COLOR,
    "movementIndicatorColor",
  );
  const frameColor = normalizeHexColor(props.frameColorHex ?? DEFAULT_FRAME_COLOR, "frameColorHex");
  const assetBasePath = normalizeAssetBasePath(props.assetBasePath ?? DEFAULT_ASSET_BASE_PATH);
  const idPrefix = safeId(props.idNamespace ?? `ae-sh-${reactId}`);
  if (!idPrefix) throw new Error("idNamespace must contain at least one letter, number, underscore, or hyphen");
  const geometry = geometryForLayout(layout);
  const productScale = Math.min(
    PRODUCT_REGION.width / resolvedWidth,
    PRODUCT_REGION.height / resolvedHeight,
  );
  const targetFrame: Rect = {
    x:
      PRODUCT_REGION.x +
      (PRODUCT_REGION.width - resolvedWidth * productScale) / 2,
    y:
      PRODUCT_REGION.y +
      (PRODUCT_REGION.height - resolvedHeight * productScale) / 2,
    width: resolvedWidth * productScale,
    height: resolvedHeight * productScale,
  };
  const productTransform = [
    `translate(${targetFrame.x} ${targetFrame.y})`,
    `scale(${targetFrame.width / OUTER_FRAME.width} ${targetFrame.height / OUTER_FRAME.height})`,
    `translate(${-OUTER_FRAME.x} ${-OUTER_FRAME.y})`,
  ].join(" ");
  const targetGeometry = transformGeometryToFrame(geometry, targetFrame);
  const glassRects = targetGeometry.fixedGlass
    ? [
        targetGeometry.upperGlass,
        targetGeometry.lowerGlass,
        targetGeometry.fixedGlass,
      ]
    : [targetGeometry.upperGlass, targetGeometry.lowerGlass];
  const showDimensions = props.showDimensions ?? true;
  const sectionRatios = layout.sectionRatios
    .map((ratio) => Number(ratio.toFixed(6)))
    .join("-");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      role="img"
      aria-label={`Single Hung ${layout.configuration}, screen ${props.screenEnabled ? "on" : "off"}`}
      className={props.className}
      data-authentic-evolution-family="SINGLE_HUNG_WINDOW"
      data-release={RELEASE}
      data-configuration={layout.configuration}
      data-section-ratios={sectionRatios}
      data-panel-sequence={layout.panelSequence}
      data-sash-height={layout.resolvedSashHeight ?? undefined}
      data-window-height={layout.resolvedWindowHeight ?? undefined}
      data-screen-enabled={props.screenEnabled ? "true" : "false"}
      data-frame-color={frameColor}
      data-movement-indicator-color={movementColor}
      data-view="EXTERIOR"
      data-state="CLOSED"
      data-width={resolvedWidth}
      data-height={resolvedHeight}
    >
      <title>{`Single Hung ${layout.configuration}`}</title>
      <g
        transform={productTransform}
        data-layer="DIMENSIONALLY_SCALED_PRODUCT"
      >
        <StructuralBase layout={layout} assetBasePath={assetBasePath} />
      </g>
      <GlassAppearanceLayer
        rects={glassRects}
        glassTintHex={props.glassTintHex}
        hasCoating={props.hasCoating}
        hasPrivacy={props.hasPrivacy}
      />
      {frameColor !== DEFAULT_FRAME_COLOR ? (
        <path
          d={frameTintPath(targetFrame, targetGeometry)}
          fill={frameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-layer="WINDOW_FRAME_FINISH"
        />
      ) : null}
      {showDimensions ? (
        <Dimensions frame={targetFrame} width={width} height={height} />
      ) : null}
      <MovementIndicators
        geometry={targetGeometry}
        color={movementColor}
        idPrefix={`${idPrefix}-indicator`}
      />
      {props.screenEnabled ? (
        <ScreenLayer
          geometry={targetGeometry}
          frameColor={frameColor}
          idPrefix={`${idPrefix}-screen`}
        />
      ) : null}
    </svg>
  );
}
