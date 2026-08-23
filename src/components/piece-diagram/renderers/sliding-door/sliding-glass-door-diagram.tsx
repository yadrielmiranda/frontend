import React, { useId } from "react";

import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
  dimensionMetrics,
  expandedViewBox,
} from "../dimension-style";
import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import {
  HorizontalRollingScreenLayer as ProceduralScreenLayer,
  type HorizontalRollingScreenPanelGeometry as ProceduralScreenPanelGeometry,
} from "../horizontal-rolling/screen-layer";
import {
  SLIDING_GLASS_DOOR_RELEASE,
  slidingGlassDoorSupportsScreen,
  type SlidingGlassDoorCatalogEntry,
  type SlidingGlassDoorRect,
} from "./sliding-glass-door-spec";

export type SlidingGlassDoorDimension = number | string;

export interface SlidingGlassDoorDiagramProps {
  spec: SlidingGlassDoorCatalogEntry;
  width: SlidingGlassDoorDimension;
  height: SlidingGlassDoorDimension;
  screenEnabled: boolean;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  assetBasePath?: string;
  idNamespace?: string;
  className?: string;
}

type Rect = GlassOverlayRect;

const RELEASE = "C151_FINAL";
const VIEWBOX_SIZE = 2048;
const PRODUCT_REGION = {
  x: 220,
  y: 300,
  width: 1460,
  height: 1100,
} as const;
const DEFAULT_FRAME_COLOR = "#FFFFFF";
const DEFAULT_ASSET_BASE_PATH = "/product-visuals/sliding-glass-door/c139";
const DIMENSIONS = dimensionMetrics(VIEWBOX_SIZE);

function parsePositiveDimension(
  value: SlidingGlassDoorDimension,
  name: "width" | "height",
): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error(`${name} must be a positive finite number`);
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
    `${name} must be positive, for example 60, 60.5, or \"60 1/2\"`,
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
  return value.replace(/[^A-Za-z0-9_-]/g, "") || "ae-sgd-c139";
}

function joinAssetPath(basePath: string, filename: string): string {
  return `${basePath.replace(/\/+$/, "")}/${filename}`;
}

function tupleRect(value: readonly [number, number, number, number]): Rect {
  return { x: value[0], y: value[1], width: value[2], height: value[3] };
}

function frameTintPath(frame: Rect, glass: readonly Rect[]): string {
  return [
    `M ${frame.x} ${frame.y}`,
    `H ${frame.x + frame.width}`,
    `V ${frame.y + frame.height}`,
    `H ${frame.x}`,
    "Z",
    ...glass.flatMap((rect) => [
      `M ${rect.x} ${rect.y}`,
      `H ${rect.x + rect.width}`,
      `V ${rect.y + rect.height}`,
      `H ${rect.x}`,
      "Z",
    ]),
  ].join(" ");
}

export function SlidingGlassDoorDiagram({
  spec,
  width,
  height,
  screenEnabled,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  showDimensions = true,
  assetBasePath = DEFAULT_ASSET_BASE_PATH,
  idNamespace,
  className,
}: SlidingGlassDoorDiagramProps): React.ReactElement {
  const reactId = useId();
  const resolvedWidth = parsePositiveDimension(width, "width");
  const resolvedHeight = parsePositiveDimension(height, "height");
  const frameColor = normalizeFrameColor(frameColorHex);
  const namespace = safeId(`${idNamespace ?? "ae-sgd-c139"}-${reactId}`);
  const titleId = `${namespace}-title`;
  const arrowStartId = `${namespace}-arrow-start`;
  const arrowEndId = `${namespace}-arrow-end`;

  const dimensionSource = tupleRect(spec.dimensionBox);
  const assetSource = tupleRect(spec.structuralAssetPlacementBox);
  const relativeAssetLeft =
    (assetSource.x - dimensionSource.x) / dimensionSource.width;
  const relativeAssetTop =
    (assetSource.y - dimensionSource.y) / dimensionSource.height;
  const relativeAssetRight =
    (assetSource.x + assetSource.width - dimensionSource.x) /
    dimensionSource.width;
  const relativeAssetBottom =
    (assetSource.y + assetSource.height - dimensionSource.y) /
    dimensionSource.height;
  const fullMinX = Math.min(0, relativeAssetLeft);
  const fullMinY = Math.min(0, relativeAssetTop);
  const fullMaxX = Math.max(1, relativeAssetRight);
  const fullMaxY = Math.max(1, relativeAssetBottom);
  const scale = Math.min(
    PRODUCT_REGION.width / (resolvedWidth * (fullMaxX - fullMinX)),
    PRODUCT_REGION.height / (resolvedHeight * (fullMaxY - fullMinY)),
  );
  const productWidth = resolvedWidth * scale;
  const productHeight = resolvedHeight * scale;
  const fullWidth = productWidth * (fullMaxX - fullMinX);
  const fullHeight = productHeight * (fullMaxY - fullMinY);
  const fullX = PRODUCT_REGION.x + (PRODUCT_REGION.width - fullWidth) / 2;
  const fullY = PRODUCT_REGION.y + (PRODUCT_REGION.height - fullHeight) / 2;
  const productRect: Rect = {
    x: fullX - fullMinX * productWidth,
    y: fullY - fullMinY * productHeight,
    width: productWidth,
    height: productHeight,
  };

  const mapRect = (rect: SlidingGlassDoorRect): Rect => ({
    x:
      productRect.x +
      ((rect.x - dimensionSource.x) / dimensionSource.width) *
        productRect.width,
    y:
      productRect.y +
      ((rect.y - dimensionSource.y) / dimensionSource.height) *
        productRect.height,
    width: (rect.width / dimensionSource.width) * productRect.width,
    height: (rect.height / dimensionSource.height) * productRect.height,
  });
  const assetRect = mapRect(assetSource);
  const glassRects = spec.glassDlos.map(mapRect);
  const sourceScaleX = productRect.width / dimensionSource.width;
  const sourceScaleY = productRect.height / dimensionSource.height;
  const screenPanels: ProceduralScreenPanelGeometry[] = spec.screenPanels.map(
    (panel) => ({
      outer: mapRect(panel.outer),
      mesh: mapRect(panel.mesh),
      scaleX: sourceScaleX,
      scaleY: sourceScaleY,
    }),
  );
  const screenVisible =
    screenEnabled && slidingGlassDoorSupportsScreen(spec);
  const assetHref = joinAssetPath(assetBasePath, spec.structuralAsset);
  const horizontalY = Math.min(
    VIEWBOX_SIZE - 150,
    assetRect.y + assetRect.height + 92,
  );
  const verticalX = Math.min(
    VIEWBOX_SIZE - 150,
    assetRect.x + assetRect.width + 92,
  );
  const viewportPadding = DIMENSIONS.fontSize * 0.3;
  const viewBox = expandedViewBox(
    { x: fullX, y: fullY, width: fullWidth, height: fullHeight },
    showDimensions
      ? {
          top: viewportPadding,
          right:
            92 + 44 + DIMENSIONS.fontSize * 3.7 + viewportPadding,
          bottom:
            92 + 60 + DIMENSIONS.fontSize * 0.5 + viewportPadding,
          left: viewportPadding,
        }
      : {
          top: viewportPadding,
          right: viewportPadding,
          bottom: viewportPadding,
          left: viewportPadding,
        },
  );
  const title = `Sliding Glass Door ${spec.configuration}, ${spec.manufacturer}, ${formatDimension(resolvedWidth)} by ${formatDimension(resolvedHeight)} inches, screen ${screenVisible ? "on" : "off"}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      role="img"
      aria-labelledby={titleId}
      className={className}
      data-release={RELEASE}
      data-catalog-release={SLIDING_GLASS_DOOR_RELEASE}
      data-family="SLIDING_GLASS_DOOR"
      data-view="EXTERIOR"
      data-configuration={spec.configuration}
      data-manufacturer={spec.manufacturer}
      data-tracks={spec.tracks}
      data-panel-count={spec.panelCount}
      data-pocket-left={String(spec.pocketLeft)}
      data-pocket-right={String(spec.pocketRight)}
      data-screen-requested={String(screenEnabled)}
      data-screen-visible={String(screenVisible)}
      data-frame-color={frameColor}
      data-width={resolvedWidth}
      data-height={resolvedHeight}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <marker
          id={arrowStartId}
          markerWidth={DIMENSIONS.terminalLength}
          markerHeight={DIMENSIONS.terminalHalfWidth * 2}
          refX={DIMENSIONS.terminalLength / 14}
          refY={DIMENSIONS.terminalHalfWidth}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M ${DIMENSIONS.terminalLength} 0 L 0 ${DIMENSIONS.terminalHalfWidth} L ${DIMENSIONS.terminalLength} ${DIMENSIONS.terminalHalfWidth * 2} Z`}
            fill={DIMENSION_COLOR}
          />
        </marker>
        <marker
          id={arrowEndId}
          markerWidth={DIMENSIONS.terminalLength}
          markerHeight={DIMENSIONS.terminalHalfWidth * 2}
          refX={(DIMENSIONS.terminalLength * 13) / 14}
          refY={DIMENSIONS.terminalHalfWidth}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M 0 0 L ${DIMENSIONS.terminalLength} ${DIMENSIONS.terminalHalfWidth} L 0 ${DIMENSIONS.terminalHalfWidth * 2} Z`}
            fill={DIMENSION_COLOR}
          />
        </marker>
      </defs>

      <image
        href={assetHref}
        x={assetRect.x}
        y={assetRect.y}
        width={assetRect.width}
        height={assetRect.height}
        preserveAspectRatio="none"
        data-layer="C139_SCREEN_OFF_STRUCTURE"
      />
      <GlassAppearanceLayer
        rects={glassRects}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />
      {frameColor !== DEFAULT_FRAME_COLOR ? (
        <path
          d={frameTintPath(productRect, glassRects)}
          fill={frameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-layer="SLIDING_DOOR_FRAME_FINISH"
        />
      ) : null}
      {screenVisible ? (
        <ProceduralScreenLayer
          panels={screenPanels}
          frameColorHex={frameColor}
          idNamespace={`${namespace}-screen`}
        />
      ) : null}

      {showDimensions ? (
        <g
          fill="none"
          stroke={DIMENSION_COLOR}
          strokeWidth={DIMENSIONS.strokeWidth}
          fontFamily={DIMENSION_FONT_FAMILY}
        >
          <line
            x1={productRect.x}
            y1={horizontalY}
            x2={productRect.x + productRect.width}
            y2={horizontalY}
            markerStart={`url(#${arrowStartId})`}
            markerEnd={`url(#${arrowEndId})`}
          />
          <line
            x1={verticalX}
            y1={productRect.y}
            x2={verticalX}
            y2={productRect.y + productRect.height}
            markerStart={`url(#${arrowStartId})`}
            markerEnd={`url(#${arrowEndId})`}
          />
          <text
            x={productRect.x + productRect.width / 2}
            y={horizontalY + 60}
            textAnchor="middle"
            fill={DIMENSION_COLOR}
            stroke="none"
            fontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
          >
            W. {formatDimension(resolvedWidth)}&quot;
          </text>
          <text
            x={verticalX + 44}
            y={productRect.y + productRect.height / 2 + 14}
            fill={DIMENSION_COLOR}
            stroke="none"
            fontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
          >
            H. {formatDimension(resolvedHeight)}&quot;
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export default SlidingGlassDoorDiagram;
