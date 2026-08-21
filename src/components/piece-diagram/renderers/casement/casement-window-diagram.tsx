// Authentic Evolution Casement Window C145 runtime integration.
// Exterior view, closed state, outswing, with dynamic dimensions and finishes.
import React, { useId } from "react";

import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
  dimensionMetrics,
} from "../dimension-style";

export const CASEMENT_WINDOW_CONFIGURATIONS = ["XL", "XR"] as const;
export type CasementWindowConfiguration =
  (typeof CASEMENT_WINDOW_CONFIGURATIONS)[number];
export type CasementWindowDimension = number | string;

export interface CasementWindowDiagramProps {
  configuration: CasementWindowConfiguration;
  width: CasementWindowDimension;
  height: CasementWindowDimension;
  // Casement screens are interior and are intentionally never drawn in this
  // exterior-view renderer. The selection remains available to the form.
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

export type CasementFixedWindowConfiguration = "O";

export interface CasementFixedWindowDiagramProps {
  configuration: CasementFixedWindowConfiguration;
  width: CasementWindowDimension;
  height: CasementWindowDimension;
  frameColorHex?: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  assetBasePath?: string;
  idNamespace?: string;
  className?: string;
}

type Rect = GlassOverlayRect;

const RELEASE = "C145_FINAL";
const VIEWBOX = { width: 2048, height: 2048 } as const;
const DIMENSIONS = dimensionMetrics(VIEWBOX.width);
const DEFAULT_ASSET_BASE_PATH = "/product-visuals/casement-window/c145";
const FIXED_RELEASE = "C145_FINAL";
const DEFAULT_FIXED_ASSET_BASE_PATH =
  "/product-visuals/casement-window/c145";
const FIXED_ASSET_FILENAME =
  "01_Casement-Fixed-Window_O_White_Clear-Clear-PVB-White_C145_GLASS_VISIBLE_FINAL.png";
export const DEFAULT_CASEMENT_FRAME_COLOR = "#FFFFFF";
export const DEFAULT_CASEMENT_INDICATOR_COLOR = "#C6020C";

const PRODUCT_REGION = {
  x: 300,
  y: 190,
  width: 1200,
  height: 1480,
} as const;

const SOURCE = {
  width: 1254,
  height: 1254,
  frame: { x: 161, y: 80, width: 706, height: 1032 },
  // C145 documents this safe glass reveal inside the unchanged gasket.
  glass: { x: 244, y: 164, width: 542, height: 865 },
} as const;

const ASSET_FILENAMES: Record<CasementWindowConfiguration, string> = {
  XL: "01_Casement-Window_XL_Outswing_White_Clear-Clear-PVB-White_C145_STRUCTURAL_GLASS_VISIBLE_FINAL.png",
  XR: "02_Casement-Window_XR_Outswing_White_Clear-Clear-PVB-White_C145_STRUCTURAL_GLASS_VISIBLE_FINAL.png",
};

function parsePositiveDimension(
  value: CasementWindowDimension,
  name: "width" | "height",
): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error(`${name} must be a positive finite number`);
  }

  if (typeof value !== "string") {
    throw new Error(`${name} must be a number or dimension string`);
  }

  const normalized = value
    .trim()
    .replace(/[\u2033\u201d"]/g, "")
    .replace(/\s+/g, " ");

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
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
    `${name} must be positive, for example 42, 42.5, or "42 1/2"`,
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
    return Number(value.toFixed(4)).toString();
  }

  const whole = Math.floor(sixteenths / 16);
  const remainder = sixteenths % 16;
  if (remainder === 0) return String(whole);
  const divisor = greatestCommonDivisor(remainder, 16);
  const fraction = `${remainder / divisor}/${16 / divisor}`;
  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

function normalizeHexColor(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a hexadecimal color string`);
  }

  const normalized = value.trim();
  const short = normalized.match(/^#([0-9A-Fa-f]{3})$/);
  if (short) {
    return `#${short[1]!
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`.toUpperCase();
  }

  const full = normalized.match(/^#([0-9A-Fa-f]{6})$/);
  if (!full) throw new Error(`${name} must use #RGB or #RRGGBB`);
  return `#${full[1]!.toUpperCase()}`;
}

function safeId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "");
  return normalized || "ae-casement";
}

function mapSourceRect(source: Rect, targetFrame: Rect): Rect {
  return {
    x:
      targetFrame.x +
      ((source.x - SOURCE.frame.x) / SOURCE.frame.width) * targetFrame.width,
    y:
      targetFrame.y +
      ((source.y - SOURCE.frame.y) / SOURCE.frame.height) *
        targetFrame.height,
    width: (source.width / SOURCE.frame.width) * targetFrame.width,
    height: (source.height / SOURCE.frame.height) * targetFrame.height,
  };
}

function frameTintPath(frame: Rect, glass: Rect): string {
  return [
    `M ${frame.x} ${frame.y}`,
    `H ${frame.x + frame.width}`,
    `V ${frame.y + frame.height}`,
    `H ${frame.x}`,
    "Z",
    `M ${glass.x} ${glass.y}`,
    `H ${glass.x + glass.width}`,
    `V ${glass.y + glass.height}`,
    `H ${glass.x}`,
    "Z",
  ].join(" ");
}

function StructuralBase({
  href,
  frame,
}: {
  href: string;
  frame: Rect;
}) {
  return (
    <svg
      x={frame.x}
      y={frame.y}
      width={frame.width}
      height={frame.height}
      viewBox={`${SOURCE.frame.x} ${SOURCE.frame.y} ${SOURCE.frame.width} ${SOURCE.frame.height}`}
      preserveAspectRatio="none"
      overflow="hidden"
      data-layer="STRUCTURAL_BASE"
    >
      <image
        href={href}
        x={0}
        y={0}
        width={SOURCE.width}
        height={SOURCE.height}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

function MovementIndicator({
  configuration,
  glass,
  color,
  clipId,
}: {
  configuration: CasementWindowConfiguration;
  glass: Rect;
  color: string;
  clipId: string;
}) {
  const centerX = glass.x + glass.width / 2;
  const centerY = glass.y + glass.height / 2;
  const scale = Math.max(
    0.65,
    Math.min(
      glass.width / SOURCE.glass.width,
      glass.height / SOURCE.glass.height,
    ),
  );
  const sign = configuration === "XL" ? -1 : 1;
  const xHalfWidth = 6 * scale;
  const xHalfHeight = 9 * scale;
  const arrowStart = centerX + sign * 22 * scale;
  const arrowTip = centerX + sign * 98 * scale;
  const headLength = 18 * scale;
  const headHalfWidth = 12 * scale;
  const shaftEnd = arrowTip - sign * headLength * 0.72;
  const arrowPoints = `${arrowTip},${centerY} ${
    arrowTip - sign * headLength
  },${centerY - headHalfWidth} ${arrowTip - sign * headLength},${
    centerY + headHalfWidth
  }`;

  return (
    <g
      clipPath={`url(#${clipId})`}
      fill={color}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.86}
      data-layer="MOVEMENT_INDICATOR"
      data-arrow-direction={configuration === "XL" ? "LEFT" : "RIGHT"}
    >
      <line
        x1={centerX - xHalfWidth}
        y1={centerY - xHalfHeight}
        x2={centerX + xHalfWidth}
        y2={centerY + xHalfHeight}
        strokeWidth={3.4 * scale}
      />
      <line
        x1={centerX - xHalfWidth}
        y1={centerY + xHalfHeight}
        x2={centerX + xHalfWidth}
        y2={centerY - xHalfHeight}
        strokeWidth={3.4 * scale}
      />
      <line
        x1={arrowStart}
        y1={centerY}
        x2={shaftEnd}
        y2={centerY}
        strokeWidth={6.2 * scale}
      />
      <polygon points={arrowPoints} stroke="none" />
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
  const bottomY = frame.y + frame.height + 105;
  const sideX = frame.x + frame.width + 105;
  const middleY = frame.y + frame.height / 2;
  const labelGap = 78;
  const head = DIMENSIONS.terminalLength;
  const halfHead = DIMENSIONS.terminalHalfWidth;

  return (
    <g
      fill={DIMENSION_COLOR}
      stroke={DIMENSION_COLOR}
      data-layer="DIMENSIONS"
    >
      <path
        d={`M ${frame.x} ${bottomY} H ${frame.x + frame.width}`}
        fill="none"
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <path
        d={`M ${frame.x} ${bottomY} l ${head} -${halfHead} v ${halfHead * 2} z`}
        stroke="none"
      />
      <path
        d={`M ${frame.x + frame.width} ${bottomY} l -${head} -${halfHead} v ${halfHead * 2} z`}
        stroke="none"
      />
      <path
        d={`M ${sideX} ${frame.y} V ${middleY - labelGap / 2}`}
        fill="none"
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <path
        d={`M ${sideX} ${middleY + labelGap / 2} V ${frame.y + frame.height}`}
        fill="none"
        strokeWidth={DIMENSIONS.strokeWidth}
      />
      <path
        d={`M ${sideX} ${frame.y} l -${halfHead} ${head} h ${halfHead * 2} z`}
        stroke="none"
      />
      <path
        d={`M ${sideX} ${frame.y + frame.height} l -${halfHead} -${head} h ${halfHead * 2} z`}
        stroke="none"
      />
      <g
        stroke="none"
        fontFamily={DIMENSION_FONT_FAMILY}
        fontWeight={DIMENSION_FONT_WEIGHT}
        fontSize={DIMENSIONS.fontSize}
      >
        <text
          x={frame.x + frame.width / 2}
          y={bottomY + 74}
          textAnchor="middle"
        >
          {`W. ${width}\"`}
        </text>
        <text x={sideX + 28} y={middleY + 13} textAnchor="start">
          {`H. ${height}\"`}
        </text>
      </g>
    </g>
  );
}

export function CasementWindowDiagram(
  props: CasementWindowDiagramProps,
): React.ReactElement {
  if (!CASEMENT_WINDOW_CONFIGURATIONS.includes(props.configuration)) {
    throw new Error(
      `Casement Window configuration must be XL or XR; received ${String(
        props.configuration,
      )}`,
    );
  }
  if (typeof props.screenEnabled !== "boolean") {
    throw new Error("screenEnabled must be an explicit boolean");
  }
  if (
    props.showDimensions !== undefined &&
    typeof props.showDimensions !== "boolean"
  ) {
    throw new Error("showDimensions must be boolean when provided");
  }

  const resolvedWidth = parsePositiveDimension(props.width, "width");
  const resolvedHeight = parsePositiveDimension(props.height, "height");
  const scale = Math.min(
    PRODUCT_REGION.width / resolvedWidth,
    PRODUCT_REGION.height / resolvedHeight,
  );
  const frame: Rect = {
    x:
      PRODUCT_REGION.x +
      (PRODUCT_REGION.width - resolvedWidth * scale) / 2,
    y:
      PRODUCT_REGION.y +
      (PRODUCT_REGION.height - resolvedHeight * scale) / 2,
    width: resolvedWidth * scale,
    height: resolvedHeight * scale,
  };
  const glass = mapSourceRect(SOURCE.glass, frame);
  const frameColor = normalizeHexColor(
    props.frameColorHex ?? DEFAULT_CASEMENT_FRAME_COLOR,
    "frameColorHex",
  );
  const movementColor = normalizeHexColor(
    props.movementIndicatorColor ?? DEFAULT_CASEMENT_INDICATOR_COLOR,
    "movementIndicatorColor",
  );
  const generatedId = useId();
  const idPrefix = safeId(props.idNamespace ?? `ae-casement-${generatedId}`);
  const titleId = `${idPrefix}-title`;
  const glassClipId = `${idPrefix}-glass-clip`;
  const assetBasePath = (props.assetBasePath ?? DEFAULT_ASSET_BASE_PATH).replace(
    /\/+$/,
    "",
  );
  const assetHref = `${assetBasePath}/${ASSET_FILENAMES[props.configuration]}`;
  const widthLabel = formatDimension(resolvedWidth);
  const heightLabel = formatDimension(resolvedHeight);
  const hingeSide = props.configuration === "XL" ? "LEFT" : "RIGHT";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={titleId}
      className={props.className}
      data-family="CASEMENT_WINDOW"
      data-release={RELEASE}
      data-configuration={props.configuration}
      data-hinge-side-exterior={hingeSide}
      data-swing="OUTSWING_ALWAYS"
      data-view="EXTERIOR"
      data-state="CLOSED"
      data-screen-enabled={props.screenEnabled ? "true" : "false"}
      data-screen-rendered="false"
      data-screen-location="INTERIOR"
      data-frame-color={frameColor}
    >
      <title id={titleId}>{`Casement Window ${props.configuration}, exterior ${hingeSide.toLowerCase()} hinge, width ${widthLabel} inches, height ${heightLabel} inches`}</title>
      <defs>
        <clipPath id={glassClipId}>
          <rect {...glass} />
        </clipPath>
      </defs>
      <StructuralBase href={assetHref} frame={frame} />
      <GlassAppearanceLayer
        rects={[glass]}
        glassTintHex={props.glassTintHex}
        hasCoating={props.hasCoating}
        hasPrivacy={props.hasPrivacy}
      />
      {frameColor !== DEFAULT_CASEMENT_FRAME_COLOR ? (
        <path
          d={frameTintPath(frame, glass)}
          fill={frameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-layer="WINDOW_FRAME_FINISH"
        />
      ) : null}
      <MovementIndicator
        configuration={props.configuration}
        glass={glass}
        color={movementColor}
        clipId={glassClipId}
      />
      {props.showDimensions ?? true ? (
        <Dimensions frame={frame} width={widthLabel} height={heightLabel} />
      ) : null}
    </svg>
  );
}

export function CasementFixedWindowDiagram(
  props: CasementFixedWindowDiagramProps,
): React.ReactElement {
  if (props.configuration !== "O") {
    throw new Error(
      `Casement Fixed Window configuration must be O; received ${String(
        props.configuration,
      )}`,
    );
  }
  if (
    props.showDimensions !== undefined &&
    typeof props.showDimensions !== "boolean"
  ) {
    throw new Error("showDimensions must be boolean when provided");
  }

  const resolvedWidth = parsePositiveDimension(props.width, "width");
  const resolvedHeight = parsePositiveDimension(props.height, "height");
  const scale = Math.min(
    PRODUCT_REGION.width / resolvedWidth,
    PRODUCT_REGION.height / resolvedHeight,
  );
  const frame: Rect = {
    x:
      PRODUCT_REGION.x +
      (PRODUCT_REGION.width - resolvedWidth * scale) / 2,
    y:
      PRODUCT_REGION.y +
      (PRODUCT_REGION.height - resolvedHeight * scale) / 2,
    width: resolvedWidth * scale,
    height: resolvedHeight * scale,
  };
  const glass = mapSourceRect(SOURCE.glass, frame);
  const frameColor = normalizeHexColor(
    props.frameColorHex ?? DEFAULT_CASEMENT_FRAME_COLOR,
    "frameColorHex",
  );
  const generatedId = useId();
  const idPrefix = safeId(
    props.idNamespace ?? `ae-casement-fixed-${generatedId}`,
  );
  const titleId = `${idPrefix}-title`;
  const assetBasePath = (
    props.assetBasePath ?? DEFAULT_FIXED_ASSET_BASE_PATH
  ).replace(/\/+$/, "");
  const assetHref = `${assetBasePath}/${FIXED_ASSET_FILENAME}`;
  const widthLabel = formatDimension(resolvedWidth);
  const heightLabel = formatDimension(resolvedHeight);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={titleId}
      className={props.className}
      data-family="CASEMENT_WINDOW"
      data-variant="FIXED"
      data-release={FIXED_RELEASE}
      data-configuration="O"
      data-state="FIXED_NON_OPERABLE"
      data-view="EXTERIOR"
      data-screen-enabled="false"
      data-screen-rendered="false"
      data-frame-color={frameColor}
    >
      <title id={titleId}>{`Casement Fixed Window, non-operable, width ${widthLabel} inches, height ${heightLabel} inches`}</title>
      <StructuralBase href={assetHref} frame={frame} />
      <GlassAppearanceLayer
        rects={[glass]}
        glassTintHex={props.glassTintHex}
        hasCoating={props.hasCoating}
        hasPrivacy={props.hasPrivacy}
      />
      {frameColor !== DEFAULT_CASEMENT_FRAME_COLOR ? (
        <path
          d={frameTintPath(frame, glass)}
          fill={frameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-layer="WINDOW_FRAME_FINISH"
        />
      ) : null}
      {props.showDimensions ?? true ? (
        <Dimensions frame={frame} width={widthLabel} height={heightLabel} />
      ) : null}
    </svg>
  );
}
