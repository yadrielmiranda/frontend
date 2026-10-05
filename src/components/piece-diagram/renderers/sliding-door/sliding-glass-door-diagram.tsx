import React, { useId } from "react";

import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
  dimensionMetrics,
  expandedViewBox,
} from "../dimension-style";
import {
  DIMENSION_LABEL_BELOW_LINE_PX,
  DIMENSION_LABEL_OUTWARD_GAP_PX,
  DimensionText,
} from "../dimension-text";
import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import { MuntinLayer, type MuntinGlassPanel, type ResolvedMuntin } from "../muntin-layer";
import {
  HorizontalRollingScreenLayer as ProceduralScreenLayer,
  type HorizontalRollingScreenPanelGeometry as ProceduralScreenPanelGeometry,
} from "../horizontal-rolling/screen-layer";
import {
  SLIDING_GLASS_DOOR_RELEASE,
  slidingGlassDoorSupportsScreen,
  type SlidingGlassDoorCatalogEntry,
} from "./sliding-glass-door-spec";
import {
  resolveSlidingGlassDoorLayout,
  type SlidingGlassDoorSlice,
} from "./sliding-glass-door-layout";

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
  muntin?: ResolvedMuntin | null;
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

function SourceSlices({
  slices,
  sourceId,
}: {
  slices: readonly SlidingGlassDoorSlice[];
  sourceId: string;
}) {
  return <>{slices.map(({ source, target }, index) => (
    <svg
      key={index}
      {...target}
      viewBox={[source.x, source.y, source.width, source.height].join(" ")}
      preserveAspectRatio="none"
      overflow="hidden"
      data-source-slice={index}
    >
      <use href={`#${sourceId}`} />
    </svg>
  ))}</>;
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
  muntin,
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

  const layout = resolveSlidingGlassDoorLayout({
    dimension: dimensionSource,
    asset: assetSource,
    product: productRect,
    glass: spec.glassDlos,
  });
  const { mapRect, slices } = layout;
  const assetRect = mapRect(assetSource);
  const glassRects = spec.glassDlos.map(mapRect);
  const muntinGlassPanels: MuntinGlassPanel[] = spec.glassDlos.map((glass) => ({
    // Catalog DLO indices are zero-based and already follow the exterior view.
    panelIndex: glass.panelIndex + 1,
    panelCode: glass.kind,
    panelLabel: spec.panelCount === 1 ? "Panel 1"
      : glass.panelIndex === 0 ? "Left"
        : glass.panelIndex === spec.panelCount - 1 ? "Right"
          : spec.panelCount % 2 === 1 && glass.panelIndex === Math.floor(spec.panelCount / 2) ? "Center"
            : `Panel ${glass.panelIndex + 1}`,
    rect: mapRect(glass),
  }));
  const screenPanels: ProceduralScreenPanelGeometry[] = spec.screenPanels.map(
    (panel) => ({
      outer: mapRect(panel.outer),
      mesh: mapRect(panel.mesh),
      scaleX: mapRect(panel.outer).width / panel.outer.width,
      scaleY: mapRect(panel.outer).height / panel.outer.height,
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
      overflow="visible"
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
        <image
          id={`${namespace}-source`}
          href={assetHref}
          {...assetSource}
          preserveAspectRatio="none"
        />
        {muntin ? <>
          <clipPath id={`${namespace}-indicator-glass`}>
            {glassRects.map((rect, index) => <rect key={index} {...rect} />)}
          </clipPath>
          <filter id={`${namespace}-source-indicators`} colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2 -1 -1 0 -0.25" result="redIndicators" />
            <feComposite in="SourceGraphic" in2="redIndicators" operator="in" />
          </filter>
        </> : null}
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

      <g
        data-layer="SLIDING_DOOR_LAYOUT"
        data-frame-x={productRect.x}
        data-frame-y={productRect.y}
        data-frame-width={productRect.width}
        data-frame-height={productRect.height}
        data-units-per-inch={scale}
        data-profile-layout={layout.adapted ? "MULTI_SLICE" : "SOURCE_PROPORTIONS"}
      >
        <g data-layer="C139_SCREEN_OFF_STRUCTURE">
          <SourceSlices slices={slices} sourceId={`${namespace}-source`} />
        </g>
        <g data-layer="SLIDING_DOOR_FINAL_GLASS" fill="none" pointerEvents="none">
          {glassRects.map((rect, index) => <rect
            key={index}
            {...rect}
            data-panel-index={spec.glassDlos[index].panelIndex + 1}
            data-panel-code={spec.glassDlos[index].kind}
            data-direction={spec.glassDlos[index].direction}
          />)}
        </g>
      </g>
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
      <MuntinLayer
        muntin={muntin}
        glassPanels={muntinGlassPanels}
        frameColorHex={frameColor}
        unitsPerInch={scale}
        idNamespace={`${namespace}-muntin`}
      />
      {muntin ? (
        <g
          clipPath={`url(#${namespace}-indicator-glass)`}
          filter={`url(#${namespace}-source-indicators)`}
          data-layer="SLIDING_DOOR_SOURCE_INDICATORS"
        >
          <SourceSlices
            slices={slices}
            sourceId={`${namespace}-source`}
          />
        </g>
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
          <DimensionText
            x={productRect.x + productRect.width / 2}
            y={horizontalY}
            textAnchor="middle"
            fill={DIMENSION_COLOR}
            stroke="none"
            fallbackFontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
            screenOffsetYPx={DIMENSION_LABEL_BELOW_LINE_PX}
          >
            W. {formatDimension(resolvedWidth)}&quot;
          </DimensionText>
          <DimensionText
            x={verticalX}
            y={productRect.y + productRect.height / 2}
            fill={DIMENSION_COLOR}
            stroke="none"
            textAnchor="start"
            dominantBaseline="central"
            fallbackFontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
            screenOffsetXPx={DIMENSION_LABEL_OUTWARD_GAP_PX}
          >
            H. {formatDimension(resolvedHeight)}&quot;
          </DimensionText>
        </g>
      ) : null}
    </svg>
  );
}

export default SlidingGlassDoorDiagram;
