// Authentic Evolution · Fixed Window / Shapes · C073 runtime + C157 assets.
// Exterior fixed view with database-driven frame and glass finishes.
import React, { useId } from "react";

import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
  dimensionMetrics,
  expandedViewBox,
} from "../dimension-style";
import runtimeConfig from "./fixed-window-shapes-c073.json";

export const FIXED_WINDOW_SHAPE_KEYS = [
  "CIRCLE",
  "EYEBROW",
  "FAN",
  "HALF_CIRCLE",
  "HALF_EYEBROW_LEFT",
  "HALF_EYEBROW_RIGHT",
  "HALF_FAN_LEFT",
  "HALF_FAN_RIGHT",
  "HALF_TOMBSTONE_LEFT",
  "HALF_TOMBSTONE_RIGHT",
  "HEXAGON_SYMMETRIC",
  "OCTAGON_SYMMETRIC",
  "PICTURE_WINDOW",
  "QUARTER_CIRCLE",
  "TOMBSTONE",
  "TRAPEZOID_LEFT",
  "TRAPEZOID_RIGHT",
  "TRIANGLE_90_LEFT",
  "TRIANGLE_90_RIGHT",
] as const;

export type FixedWindowShape = (typeof FIXED_WINDOW_SHAPE_KEYS)[number];
export type FixedWindowDimension = number | string;

export type FixedWindowMultiHeightShape =
  | "EYEBROW"
  | "HALF_EYEBROW_LEFT"
  | "HALF_EYEBROW_RIGHT"
  | "TRAPEZOID_LEFT"
  | "TRAPEZOID_RIGHT";

export type FixedWindowSingleHeightShape = Exclude<
  FixedWindowShape,
  FixedWindowMultiHeightShape
>;

type Axis = "W" | "H" | "H1" | "H2";
type Side = "LEFT" | "RIGHT";

interface DimensionGeometry {
  axis: Axis;
  side?: Side;
  tipStart: [number, number];
  tipEnd: [number, number];
  label: string;
}

export interface FixedWindowShapeSpec {
  index: number;
  shapeKey: FixedWindowShape;
  displayName: string;
  axes: readonly Axis[];
  requiresSecondaryHeight: boolean;
  sampleDimensionsInches: {
    width: number;
    height: number;
    secondaryHeight?: number;
  };
  configurationIdSerie70: string | null;
  configurationIdStatus: string;
  structuralAsset: string;
  approvedReferenceRender: string;
  glassCentroid: [number, number];
  frameBBox: [number, number, number, number];
  secondaryTopY: number | null;
  dimensionGeometry: readonly DimensionGeometry[];
  heightSides: Readonly<Record<string, Side>>;
  heightBasis: string;
}

interface CommonProps {
  width: FixedWindowDimension;
  frameColorHex?: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  assetBasePath?: string;
  idNamespace?: string;
  className?: string;
}

export type FixedWindowShapeDiagramProps = CommonProps &
  (
    | {
        shape: FixedWindowMultiHeightShape;
        height: FixedWindowDimension;
        secondaryHeight: FixedWindowDimension;
      }
    | {
        shape: FixedWindowSingleHeightShape;
        height: FixedWindowDimension;
        secondaryHeight?: never;
      }
  );

export const DEFAULT_FIXED_FRAME_COLOR = "#FFFFFF";

const VIEWBOX_SIZE = 1254;
const DIMENSIONS = dimensionMetrics(VIEWBOX_SIZE);
const DEFAULT_ASSET_BASE_PATH = "/product-visuals/fixed-window-shapes/c073";

function normalizedGlassTint(value?: string | null): string | null {
  const tint = value?.trim();

  if (!tint || !/^#[0-9A-Fa-f]{6}$/.test(tint)) return null;

  const normalized = tint.toUpperCase();
  return normalized === "#FFFFFF" || normalized === "#F7FBFF"
    ? null
    : normalized;
}

function maskStem(spec: FixedWindowShapeSpec): string {
  return `${String(spec.index).padStart(2, "0")}-${spec.shapeKey
    .toLowerCase()
    .replace(/_/g, "-")}`;
}

function GlassAppearance({
  maskId,
  glassTintHex,
  hasCoating,
  hasPrivacy,
}: {
  maskId: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
}) {
  const tint = normalizedGlassTint(glassTintHex);

  if (!tint && !hasCoating && !hasPrivacy) return null;

  return (
    <g
      mask={`url(#${maskId})`}
      pointerEvents="none"
      data-layer="GLASS_APPEARANCE"
    >
      {tint ? (
        <rect
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          fill={tint}
          fillOpacity={0.3}
          style={{ mixBlendMode: "multiply" }}
          data-glass-effect="TINT"
        />
      ) : null}
      {hasPrivacy ? (
        <rect
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          fill="#334155"
          fillOpacity={0.18}
          style={{ mixBlendMode: "multiply" }}
          data-glass-effect="PRIVACY"
        />
      ) : null}
      {hasCoating ? (
        <rect
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          fill="#BFEAFF"
          fillOpacity={hasPrivacy ? 0.06 : 0.11}
          style={{ mixBlendMode: "screen" }}
          data-glass-effect="COATING"
        />
      ) : null}
    </g>
  );
}

const catalog = runtimeConfig.catalog as unknown as readonly FixedWindowShapeSpec[];
const catalogByShape = new Map<FixedWindowShape, FixedWindowShapeSpec>(
  catalog.map((entry) => [entry.shapeKey, entry]),
);

export function getFixedWindowShapeSpec(shape: FixedWindowShape): FixedWindowShapeSpec {
  const spec = catalogByShape.get(shape);
  if (!spec) {
    throw new Error(`Unsupported Fixed Window shape: ${String(shape)}`);
  }
  return spec;
}

export function normalizeHexColor(input: unknown, propName = "indicatorColor"): string {
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

function parsePositiveDimension(
  value: FixedWindowDimension,
  propName: "width" | "height" | "secondaryHeight",
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
  throw new Error(
    `${propName} must be positive, for example 48, 48.5, or "48 1/2"`,
  );
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
  const numerator = remainder / divisor;
  const denominator = 16 / divisor;
  return whole > 0 ? `${whole} ${numerator}/${denominator}\"` : `${numerator}/${denominator}\"`;
}

function dimensionLabel(
  axis: Axis,
  width: number,
  height: number,
  secondaryHeight: number | null,
): string {
  if (axis === "W") return `W. ${formatDimension(width)}`;
  if (axis === "H") return `H. ${formatDimension(height)}`;
  if (axis === "H1") return `H1. ${formatDimension(height)}`;
  if (secondaryHeight === null) {
    throw new Error("secondaryHeight is required for H2");
  }
  return `H2. ${formatDimension(secondaryHeight)}`;
}

function HorizontalDimension({
  geometry,
  label,
}: {
  geometry: DimensionGeometry;
  label: string;
}) {
  const [x0, y] = geometry.tipStart;
  const [x1] = geometry.tipEnd;
  return (
    <g data-axis={geometry.axis}>
      <line
        x1={x0}
        y1={y}
        x2={x1}
        y2={y}
        stroke={DIMENSION_COLOR}
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <polygon
        points={`${x0},${y} ${x0 + DIMENSIONS.terminalLength},${y - DIMENSIONS.terminalHalfWidth} ${x0 + DIMENSIONS.terminalLength},${y + DIMENSIONS.terminalHalfWidth}`}
        fill={DIMENSION_COLOR}
      />
      <polygon
        points={`${x1},${y} ${x1 - DIMENSIONS.terminalLength},${y - DIMENSIONS.terminalHalfWidth} ${x1 - DIMENSIONS.terminalLength},${y + DIMENSIONS.terminalHalfWidth}`}
        fill={DIMENSION_COLOR}
      />
      <text
        x={(x0 + x1) / 2}
        y={y + 43}
        textAnchor="middle"
        fontFamily={DIMENSION_FONT_FAMILY}
        fontSize={DIMENSIONS.fontSize}
        fontWeight={DIMENSION_FONT_WEIGHT}
        fill={DIMENSION_COLOR}
      >
        {label}
      </text>
    </g>
  );
}

function VerticalDimension({
  geometry,
  label,
}: {
  geometry: DimensionGeometry;
  label: string;
}) {
  const [x, y0] = geometry.tipStart;
  const [, y1] = geometry.tipEnd;
  const middle = (y0 + y1) / 2;
  const gap = 58;
  return (
    <g data-axis={geometry.axis} data-side={geometry.side}>
      <line
        x1={x}
        y1={y0}
        x2={x}
        y2={middle - gap / 2}
        stroke={DIMENSION_COLOR}
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <line
        x1={x}
        y1={middle + gap / 2}
        x2={x}
        y2={y1}
        stroke={DIMENSION_COLOR}
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <polygon
        points={`${x},${y0} ${x - DIMENSIONS.terminalHalfWidth},${y0 + DIMENSIONS.terminalLength} ${x + DIMENSIONS.terminalHalfWidth},${y0 + DIMENSIONS.terminalLength}`}
        fill={DIMENSION_COLOR}
      />
      <polygon
        points={`${x},${y1} ${x - DIMENSIONS.terminalHalfWidth},${y1 - DIMENSIONS.terminalLength} ${x + DIMENSIONS.terminalHalfWidth},${y1 - DIMENSIONS.terminalLength}`}
        fill={DIMENSION_COLOR}
      />
      <text
        x={x}
        y={middle}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={DIMENSION_FONT_FAMILY}
        fontSize={DIMENSIONS.fontSize}
        fontWeight={DIMENSION_FONT_WEIGHT}
        fill={DIMENSION_COLOR}
      >
        {label}
      </text>
    </g>
  );
}

function fixedShapeViewBox(
  spec: FixedWindowShapeSpec,
  showDimensions: boolean,
): string {
  const [frameLeft, frameTop, frameRight, frameBottom] = spec.frameBBox;
  let minX = frameLeft;
  let minY = frameTop;
  let maxX = frameRight;
  let maxY = frameBottom;

  if (showDimensions) {
    for (const geometry of spec.dimensionGeometry) {
      const [startX, startY] = geometry.tipStart;
      const [endX, endY] = geometry.tipEnd;

      minY = Math.min(minY, startY, endY);
      maxY = Math.max(maxY, startY, endY);

      if (geometry.axis === "W") {
        minX = Math.min(minX, startX, endX);
        maxX = Math.max(maxX, startX, endX);
        maxY = Math.max(maxY, startY + 43 + DIMENSIONS.fontSize * 0.5);
      } else {
        const labelHalfWidth = DIMENSIONS.fontSize * 2.4;
        minX = Math.min(minX, startX - labelHalfWidth, endX - labelHalfWidth);
        maxX = Math.max(maxX, startX + labelHalfWidth, endX + labelHalfWidth);
      }
    }
  }

  const padding = DIMENSIONS.fontSize * 0.3;
  return expandedViewBox(
    { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    { top: padding, right: padding, bottom: padding, left: padding },
  );
}

export function FixedWindowShapeDiagram(props: FixedWindowShapeDiagramProps) {
  if (props.showDimensions !== undefined && typeof props.showDimensions !== "boolean") {
    throw new Error("showDimensions must be boolean when provided");
  }
  if (props.assetBasePath !== undefined && !props.assetBasePath.trim()) {
    throw new Error("assetBasePath cannot be empty");
  }
  if (props.idNamespace !== undefined && !props.idNamespace.trim()) {
    throw new Error("idNamespace cannot be empty");
  }

  const spec = getFixedWindowShapeSpec(props.shape);
  const width = parsePositiveDimension(props.width, "width");
  const height = parsePositiveDimension(props.height, "height");
  const providedSecondaryHeight = (props as { secondaryHeight?: FixedWindowDimension }).secondaryHeight;
  let secondaryHeight: number | null = null;
  if (spec.requiresSecondaryHeight) {
    if (providedSecondaryHeight === undefined) {
      throw new Error(`${spec.shapeKey} requires secondaryHeight for H2`);
    }
    secondaryHeight = parsePositiveDimension(providedSecondaryHeight, "secondaryHeight");
  } else if (providedSecondaryHeight !== undefined) {
    throw new Error(`${spec.shapeKey} does not accept secondaryHeight`);
  }

  const frameColor = normalizeHexColor(
    props.frameColorHex ?? DEFAULT_FIXED_FRAME_COLOR,
    "frameColorHex",
  );
  const assetBasePath = (props.assetBasePath ?? DEFAULT_ASSET_BASE_PATH).replace(/\/$/, "");
  const showDimensions = props.showDimensions ?? true;
  const generatedId = useId().replace(/:/g, "");
  const idPrefix = (props.idNamespace ?? `ae-fixed-${generatedId}`).replace(
    /[^A-Za-z0-9_-]/g,
    "",
  );
  const titleId = `${idPrefix}-title`;
  const glassMaskId = `${idPrefix}-glass-mask`;
  const frameMaskId = `${idPrefix}-frame-mask`;
  const masksBasePath = `${assetBasePath}/masks/${maskStem(spec)}`;
  const label = `Fixed Window ${spec.displayName}, width ${formatDimension(width)}, height ${formatDimension(height)}${
    secondaryHeight === null ? "" : `, secondary height ${formatDimension(secondaryHeight)}`
  }`;

  return (
    <svg
      className={props.className}
      viewBox={fixedShapeViewBox(spec, showDimensions)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={titleId}
      data-ae-family="FIXED_WINDOW_SHAPES"
      data-ae-release="C073_FINAL"
      data-ae-asset-release="C157_2048"
      data-shape={spec.shapeKey}
      data-configuration-id={spec.configurationIdSerie70 ?? undefined}
      data-frame-color={frameColor}
      data-screen-rendered="false"
      data-view="EXTERIOR"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{label}</title>
      <defs>
        <mask
          id={glassMaskId}
          x={0}
          y={0}
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
        >
          <image
            href={`${masksBasePath}-glass-mask.png`}
            x={0}
            y={0}
            width={VIEWBOX_SIZE}
            height={VIEWBOX_SIZE}
            preserveAspectRatio="none"
          />
        </mask>
        <mask
          id={frameMaskId}
          x={0}
          y={0}
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
        >
          <image
            href={`${masksBasePath}-frame-mask.png`}
            x={0}
            y={0}
            width={VIEWBOX_SIZE}
            height={VIEWBOX_SIZE}
            preserveAspectRatio="none"
          />
        </mask>
      </defs>
      <image
        href={`${assetBasePath}/${spec.structuralAsset}`}
        x={0}
        y={0}
        width={VIEWBOX_SIZE}
        height={VIEWBOX_SIZE}
        preserveAspectRatio="none"
        data-layer="STRUCTURAL_BASE"
      />
      <GlassAppearance
        maskId={glassMaskId}
        glassTintHex={props.glassTintHex}
        hasCoating={props.hasCoating}
        hasPrivacy={props.hasPrivacy}
      />
      {frameColor !== DEFAULT_FIXED_FRAME_COLOR ? (
        <rect
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          fill={frameColor}
          mask={`url(#${frameMaskId})`}
          style={{ mixBlendMode: "multiply" }}
          pointerEvents="none"
          data-layer="WINDOW_FRAME_FINISH"
        />
      ) : null}
      {showDimensions
        ? spec.dimensionGeometry.map((geometry) => {
            const dynamicLabel = dimensionLabel(
              geometry.axis,
              width,
              height,
              secondaryHeight,
            );
            return geometry.axis === "W" ? (
              <HorizontalDimension
                key={geometry.axis}
                geometry={geometry}
                label={dynamicLabel}
              />
            ) : (
              <VerticalDimension
                key={geometry.axis}
                geometry={geometry}
                label={dynamicLabel}
              />
            );
          })
        : null}
    </svg>
  );
}
