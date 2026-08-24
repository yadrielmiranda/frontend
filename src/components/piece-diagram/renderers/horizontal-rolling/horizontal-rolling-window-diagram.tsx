// Authentic Evolution runtime release C148 FINAL.
// Approved Horizontal Rolling Window family, exterior view.
// Independent from the existing hinged-product O/X/XX runtime.
import React, { useId } from "react";
import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
  dimensionMetrics,
  expandedViewBox,
} from "../dimension-style";
import { DimensionText } from "../dimension-text";
import { GlassAppearanceLayer } from "../glass-appearance";
import {
  DEFAULT_MOVEMENT_INDICATOR_COLOR,
  HorizontalRollerMovementIndicators,
  normalizeMovementIndicatorColor,
  type HorizontalRollerMovementPanel,
  type MovementIndicatorRect,
} from "./movement-indicators";
import {
  HorizontalRollingScreenLayer,
  type HorizontalRollingScreenPanelGeometry,
  type HorizontalRollingScreenRect,
} from "./screen-layer";

export type HorizontalRollingWindowConfiguration = "OX" | "XO" | "XOX";
export type HorizontalRollingWindowTwoLiteSplit =
  | "1/2-1/2"
  | "2/3-1/3"
  | "1/3-2/3";
export type HorizontalRollingWindowThreeLiteSplit =
  | "1/3-1/3-1/3"
  | "1/4-1/2-1/4";
export type HorizontalRollingWindowSplit =
  | HorizontalRollingWindowTwoLiteSplit
  | HorizontalRollingWindowThreeLiteSplit;
export type HorizontalRollingWindowDimension = number | string;

interface HorizontalRollingWindowCommonProps {
  width: HorizontalRollingWindowDimension;
  height: HorizontalRollingWindowDimension;
  screenEnabled: boolean;
  movementIndicatorColor?: string;
  /** Controls both the window frame and the screen frame. */
  frameColorHex?: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  assetBasePath?: string;
  idNamespace?: string;
  className?: string;
}

export type HorizontalRollingWindowDiagramProps =
  HorizontalRollingWindowCommonProps &
    (
      | {
          configuration: "OX";
          split?: "1/2-1/2" | "2/3-1/3";
        }
      | {
          configuration: "XO";
          split?: "1/2-1/2" | "1/3-2/3";
        }
      | {
          configuration: "XOX";
          split: HorizontalRollingWindowThreeLiteSplit;
        }
    );

const RELEASE = "C148_FINAL";
const VIEWBOX = { width: 2048, height: 2048 } as const;
const HALF_PRODUCT_REGION = {
  left: 220,
  top: 360,
  width: 1400,
  height: 1120,
} as const;
const FAMILY_PRODUCT_REGION = {
  left: 250,
  top: 390,
  width: 1400,
  height: 933,
} as const;
const DIMENSIONS = dimensionMetrics(VIEWBOX.width);
export const DEFAULT_FRAME_COLOR = "#FFFFFF";
const DEFAULT_ASSET_BASE_PATH =
  "/product-visuals/horizontal-rolling-window/c148";

const ASSET_FILENAMES = {
  XO_1_2_1_2:
    "horizontal-rolling-window-xo-1-2-1-2-white-clear-clear-pvb-clear-screen-off-c148-sh-glass-visible-final.png",
  XO_1_3_2_3:
    "horizontal-rolling-window-xo-1-3-2-3-white-clear-clear-pvb-clear-screen-off-c148-sh-glass-visible-final.png",
  XOX_1_3_1_3_1_3:
    "horizontal-rolling-window-xox-1-3-1-3-1-3-white-clear-clear-pvb-clear-screen-off-c148-sh-glass-visible-final.png",
  XOX_1_4_1_2_1_4:
    "horizontal-rolling-window-xox-1-4-1-2-1-4-white-clear-clear-pvb-clear-screen-off-c148-sh-glass-visible-final.png",
} as const;

type AssetKey = keyof typeof ASSET_FILENAMES;
type Panel = "O" | "X";

type AssetPanel =
  | {
      kind: "O";
      glass: MovementIndicatorRect;
      dlo: HorizontalRollingScreenRect;
    }
  | {
      kind: "X";
      side: "left" | "right";
      glass: MovementIndicatorRect;
      dlo: HorizontalRollingScreenRect;
    };

interface AssetIndicatorProfile {
  width: number;
  height: number;
  centerY: number;
  panels: readonly AssetPanel[];
}

/*
 * Geometry is measured from the immutable structural provenance and carried
 * into C148. Runtime maps it into the current product rectangle, so dimensions remain fully dynamic.
 * OX uses the same canonical XO geometry inside the existing mirror group.
 */
const ASSET_INDICATOR_PROFILES: Record<AssetKey, AssetIndicatorProfile> = {
  XO_1_2_1_2: {
    width: 1400,
    height: 1120,
    centerY: 581.216,
    panels: [
      {
        kind: "X",
        side: "left",
        glass: { x: 55, y: 14, width: 604, height: 1090.8 },
        dlo: { x: 57, y: 108, width: 600, height: 904 },
      },
      {
        kind: "O",
        glass: { x: 741, y: 14, width: 604, height: 1090.8 },
        dlo: { x: 741, y: 100, width: 604, height: 917 },
      },
    ],
  },
  XO_1_3_2_3: {
    width: 1400,
    height: 933,
    centerY: 484.35,
    panels: [
      {
        kind: "X",
        side: "left",
        glass: { x: 45.7663, y: 66, width: 387.1383, height: 792 },
        dlo: { x: 46, y: 87, width: 387, height: 758 },
      },
      {
        kind: "O",
        glass: { x: 505.9307, y: 66, width: 849.3033, height: 792 },
        dlo: { x: 506, y: 87, width: 849, height: 758 },
      },
    ],
  },
  XOX_1_3_1_3_1_3: {
    width: 1400,
    height: 933,
    centerY: 484.35,
    panels: [
      {
        kind: "X",
        side: "left",
        glass: { x: 45.7663, y: 66, width: 387.1383, height: 792 },
        dlo: { x: 46, y: 87, width: 387, height: 758 },
      },
      {
        kind: "O",
        glass: { x: 505.9307, y: 66, width: 389.139, height: 792 },
        dlo: { x: 506, y: 87, width: 389, height: 758 },
      },
      {
        kind: "X",
        side: "right",
        glass: { x: 967.0954, y: 66, width: 388.1386, height: 792 },
        dlo: { x: 967, y: 87, width: 388, height: 758 },
      },
    ],
  },
  XOX_1_4_1_2_1_4: {
    width: 1400,
    height: 933,
    centerY: 484.35,
    panels: [
      {
        kind: "X",
        side: "left",
        glass: { x: 45.7663, y: 66, width: 271.0968, height: 792 },
        dlo: { x: 46, y: 87, width: 271, height: 758 },
      },
      {
        kind: "O",
        glass: { x: 389.8892, y: 66, width: 621.2219, height: 792 },
        dlo: { x: 390, y: 87, width: 621, height: 758 },
      },
      {
        kind: "X",
        side: "right",
        glass: { x: 1084.1372, y: 66, width: 271.0968, height: 792 },
        dlo: { x: 1084, y: 87, width: 271, height: 758 },
      },
    ],
  },
};

interface LayoutSpec {
  configuration: HorizontalRollingWindowConfiguration;
  split: HorizontalRollingWindowSplit;
  assetKey: AssetKey;
  mirrorProduct: boolean;
  ratios: readonly number[];
  panels: readonly Panel[];
  preserveC040DimensionLayout: boolean;
}

function resolveLayout(configuration: unknown, split: unknown): LayoutSpec {
  if (configuration === "OX") {
    const resolvedSplit = split === undefined ? "1/2-1/2" : split;
    if (resolvedSplit === "1/2-1/2") {
      return {
        configuration,
        split: resolvedSplit,
        assetKey: "XO_1_2_1_2",
        mirrorProduct: true,
        ratios: [1 / 2, 1 / 2],
        panels: ["O", "X"],
        preserveC040DimensionLayout: true,
      };
    }
    if (resolvedSplit === "2/3-1/3") {
      return {
        configuration,
        split: resolvedSplit,
        assetKey: "XO_1_3_2_3",
        mirrorProduct: true,
        ratios: [2 / 3, 1 / 3],
        panels: ["O", "X"],
        preserveC040DimensionLayout: false,
      };
    }
    throw new Error(
      "Horizontal Rolling Window OX split must be 1/2-1/2 or 2/3-1/3",
    );
  }

  if (configuration === "XO") {
    const resolvedSplit = split === undefined ? "1/2-1/2" : split;
    if (resolvedSplit === "1/2-1/2") {
      return {
        configuration,
        split: resolvedSplit,
        assetKey: "XO_1_2_1_2",
        mirrorProduct: false,
        ratios: [1 / 2, 1 / 2],
        panels: ["X", "O"],
        preserveC040DimensionLayout: true,
      };
    }
    if (resolvedSplit === "1/3-2/3") {
      return {
        configuration,
        split: resolvedSplit,
        assetKey: "XO_1_3_2_3",
        mirrorProduct: false,
        ratios: [1 / 3, 2 / 3],
        panels: ["X", "O"],
        preserveC040DimensionLayout: false,
      };
    }
    throw new Error(
      "Horizontal Rolling Window XO split must be 1/2-1/2 or 1/3-2/3",
    );
  }

  if (configuration === "XOX") {
    if (split === "1/3-1/3-1/3") {
      return {
        configuration,
        split,
        assetKey: "XOX_1_3_1_3_1_3",
        mirrorProduct: false,
        ratios: [1 / 3, 1 / 3, 1 / 3],
        panels: ["X", "O", "X"],
        preserveC040DimensionLayout: false,
      };
    }
    if (split === "1/4-1/2-1/4") {
      return {
        configuration,
        split,
        assetKey: "XOX_1_4_1_2_1_4",
        mirrorProduct: false,
        ratios: [1 / 4, 1 / 2, 1 / 4],
        panels: ["X", "O", "X"],
        preserveC040DimensionLayout: false,
      };
    }
    throw new Error(
      "Horizontal Rolling Window XOX split must be 1/3-1/3-1/3 or 1/4-1/2-1/4",
    );
  }

  throw new Error(
    `Horizontal Rolling Window configuration must be OX, XO, or XOX; received ${String(configuration)}`,
  );
}

function parsePositiveDimension(
  value: HorizontalRollingWindowDimension,
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

function joinAssetPath(basePath: string, filename: string): string {
  return `${basePath.replace(/\/+$/, "")}/${filename}`;
}

function safeId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "");
  return normalized || "hrw-c148";
}

function frameTintPath(
  productX: number,
  productY: number,
  productWidth: number,
  productHeight: number,
  profile: AssetIndicatorProfile,
): string {
  const parts = [
    `M ${productX} ${productY}`,
    `H ${productX + productWidth}`,
    `V ${productY + productHeight}`,
    `H ${productX}`,
    "Z",
  ];
  for (const glass of profile.panels.map((panel) => panel.dlo)) {
    const x = productX + (glass.x / profile.width) * productWidth;
    const y = productY + (glass.y / profile.height) * productHeight;
    const width = (glass.width / profile.width) * productWidth;
    const height = (glass.height / profile.height) * productHeight;
    parts.push(
      `M ${x} ${y}`,
      `H ${x + width}`,
      `V ${y + height}`,
      `H ${x}`,
      "Z",
    );
  }
  return parts.join(" ");
}

export function HorizontalRollingWindowDiagram(
  props: HorizontalRollingWindowDiagramProps,
): React.ReactElement {
  const {
    configuration,
    split,
    width,
    height,
    screenEnabled,
    movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
    frameColorHex = DEFAULT_FRAME_COLOR,
    glassTintHex,
    hasCoating = false,
    hasPrivacy = false,
    showDimensions = true,
    assetBasePath = DEFAULT_ASSET_BASE_PATH,
    idNamespace,
    className,
  } = props;

  const layout = resolveLayout(configuration, split);
  const normalizedMovementIndicatorColor = normalizeMovementIndicatorColor(
    movementIndicatorColor,
  );
  const normalizedFrameColor = normalizeMovementIndicatorColor(frameColorHex);
  if (typeof screenEnabled !== "boolean") {
    throw new Error("screenEnabled must be an explicit boolean");
  }

  const resolvedWidth = parsePositiveDimension(width, "width");
  const resolvedHeight = parsePositiveDimension(height, "height");
  const productRegion = layout.preserveC040DimensionLayout
    ? HALF_PRODUCT_REGION
    : FAMILY_PRODUCT_REGION;
  const scale = Math.min(
    productRegion.width / resolvedWidth,
    productRegion.height / resolvedHeight,
  );
  const productWidth = resolvedWidth * scale;
  const productHeight = resolvedHeight * scale;
  const productX =
    productRegion.left + (productRegion.width - productWidth) / 2;
  const productY =
    productRegion.top + (productRegion.height - productHeight) / 2;

  const reactId = useId();
  const namespace = safeId(`${idNamespace ?? "hrw-c148"}-${reactId}`);
  const titleId = `${namespace}-title`;
  const arrowStartId = `${namespace}-arrow-start`;
  const arrowEndId = `${namespace}-arrow-end`;
  const assetHref = joinAssetPath(
    assetBasePath,
    ASSET_FILENAMES[layout.assetKey],
  );
  const indicatorProfile = ASSET_INDICATOR_PROFILES[layout.assetKey];
  const resolvedFrameTintPath = frameTintPath(
    productX,
    productY,
    productWidth,
    productHeight,
    indicatorProfile,
  );
  const mapRect = (rect: MovementIndicatorRect): MovementIndicatorRect => ({
    x: productX + (rect.x / indicatorProfile.width) * productWidth,
    y: productY + (rect.y / indicatorProfile.height) * productHeight,
    width: (rect.width / indicatorProfile.width) * productWidth,
    height: (rect.height / indicatorProfile.height) * productHeight,
  });
  const canonicalMovementPanels: HorizontalRollerMovementPanel[] =
    indicatorProfile.panels.map((panel) =>
      panel.kind === "O"
        ? { kind: "O", glass: mapRect(panel.glass) }
        : {
            kind: "X",
            side: panel.side,
            glass: mapRect(panel.glass),
          },
    );
  const glassAppearanceRects = indicatorProfile.panels.map((panel) =>
    mapRect(panel.dlo),
  );
  const sourceScaleX = productWidth / indicatorProfile.width;
  const sourceScaleY = productHeight / indicatorProfile.height;
  const screenPanels: HorizontalRollingScreenPanelGeometry[] =
    indicatorProfile.panels
      .filter(
        (panel): panel is Extract<AssetPanel, { kind: "X" }> =>
          panel.kind === "X",
      )
      .map((panel) => {
        const mesh = mapRect(panel.dlo);
        const outer = mapRect({
          x: panel.dlo.x - 26,
          y: panel.dlo.y - 17,
          width: panel.dlo.width + 52,
          height: panel.dlo.height + 34,
        });
        return { outer, mesh, scaleX: sourceScaleX, scaleY: sourceScaleY };
      });
  const movementPanels = layout.mirrorProduct
    ? [...canonicalMovementPanels].reverse()
    : canonicalMovementPanels;
  const movementCenterY =
    productY +
    (indicatorProfile.centerY / indicatorProfile.height) * productHeight;
  const horizontalY =
    productY +
    productHeight +
    (layout.preserveC040DimensionLayout ? 112 : 137);
  const verticalX =
    productX +
    productWidth +
    (layout.preserveC040DimensionLayout ? 112 : 85);
  const segmentY = productY - 60;
  const viewportPadding = DIMENSIONS.fontSize * 0.3;
  const sideDimensionOffset = layout.preserveC040DimensionLayout ? 112 : 85;
  const bottomDimensionOffset =
    layout.preserveC040DimensionLayout ? 112 : 137;
  const viewBox = expandedViewBox(
    { x: productX, y: productY, width: productWidth, height: productHeight },
    showDimensions
      ? {
          top: layout.preserveC040DimensionLayout
            ? viewportPadding
            : 60 + 24 + DIMENSIONS.fontSize + viewportPadding,
          right:
            sideDimensionOffset +
            44 +
            DIMENSIONS.fontSize * 3.7 +
            viewportPadding,
          bottom:
            bottomDimensionOffset +
            (layout.preserveC040DimensionLayout ? 64 : 59) +
            DIMENSIONS.fontSize * 0.5 +
            viewportPadding,
          left: viewportPadding,
        }
      : {
          top: viewportPadding,
          right: viewportPadding,
          bottom: viewportPadding,
          left: viewportPadding,
        },
  );
  const mirrorTransform = `translate(${2 * productX + productWidth} 0) scale(-1 1)`;
  const productLayers = (
    <g
      data-part="c148-product-layers"
      data-screen-composition-order="C148_BASE__GLASS_APPEARANCE__FRAME_TINT__INDICATORS__PROCEDURAL_SCREEN"
    >
      <image
        href={assetHref}
        x={productX}
        y={productY}
        width={productWidth}
        height={productHeight}
        preserveAspectRatio="none"
        data-part="c148-screen-off-master-with-visible-glass"
        data-standalone-public-glass="VISIBLE"
      />
      <GlassAppearanceLayer
        rects={glassAppearanceRects}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />
      {normalizedFrameColor !== DEFAULT_FRAME_COLOR ? (
        <path
          d={resolvedFrameTintPath}
          fill={normalizedFrameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-part="c148-linked-window-frame-tint"
          data-frame-color={normalizedFrameColor}
          data-frame-color-target="WINDOW_FRAME"
        />
      ) : null}
      <HorizontalRollerMovementIndicators
        panels={movementPanels}
        centerY={movementCenterY}
        movementIndicatorColor={normalizedMovementIndicatorColor}
        idNamespace={`${namespace}-movement`}
        mirrorDirectionMetadata={layout.mirrorProduct}
      />
      {screenEnabled ? (
        <HorizontalRollingScreenLayer
          panels={screenPanels}
          frameColorHex={normalizedFrameColor}
          idNamespace={`${namespace}-screen`}
        />
      ) : null}
    </g>
  );

  let cumulativeRatio = 0;
  const liteSegments = layout.ratios.map((ratio, index) => {
    const startRatio = cumulativeRatio;
    cumulativeRatio += ratio;
    const endRatio =
      index === layout.ratios.length - 1 ? 1 : cumulativeRatio;
    return {
      panel: layout.panels[index],
      x1: productX + productWidth * startRatio,
      x2: productX + productWidth * endRatio,
      nominalWidth: resolvedWidth * ratio,
    };
  });

  const title = `Horizontal Rolling Window ${layout.configuration} ${layout.split}, ${formatDimension(resolvedWidth)} by ${formatDimension(resolvedHeight)} inches, screen ${screenEnabled ? "on" : "off"}, frame ${normalizedFrameColor}`;

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
      data-family="HORIZONTAL_ROLLING_WINDOW"
      data-view="EXTERIOR"
      data-configuration={layout.configuration}
      data-split={layout.split}
      data-panels={layout.panels.join("-")}
      data-lite-widths={liteSegments
        .map((segment) => Number(segment.nominalWidth.toFixed(10)))
        .join(",")}
      data-screen-enabled={String(screenEnabled)}
      data-movement-indicator-color={normalizedMovementIndicatorColor}
      data-frame-color={normalizedFrameColor}
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

      {layout.mirrorProduct ? (
        <g transform={mirrorTransform}>{productLayers}</g>
      ) : (
        productLayers
      )}

      {showDimensions ? (
        <g
          fill="none"
          stroke={DIMENSION_COLOR}
          strokeWidth={DIMENSIONS.strokeWidth}
          fontFamily={DIMENSION_FONT_FAMILY}
        >
          {!layout.preserveC040DimensionLayout
            ? liteSegments.map((segment, index) => (
                <g key={`${segment.panel}-${index}`}>
                  <line
                    x1={segment.x1}
                    y1={segmentY}
                    x2={segment.x2}
                    y2={segmentY}
                    markerStart={`url(#${arrowStartId})`}
                    markerEnd={`url(#${arrowEndId})`}
                  />
                  <DimensionText
                    x={(segment.x1 + segment.x2) / 2}
                    y={segmentY - 24}
                    textAnchor="middle"
                    fill={DIMENSION_COLOR}
                    stroke="none"
                    fallbackFontSize={DIMENSIONS.fontSize}
                    fontWeight={DIMENSION_FONT_WEIGHT}
                  >
                    W. {formatDimension(segment.nominalWidth)}&quot;
                  </DimensionText>
                </g>
              ))
            : null}

          <line
            x1={productX}
            y1={horizontalY}
            x2={productX + productWidth}
            y2={horizontalY}
            markerStart={`url(#${arrowStartId})`}
            markerEnd={`url(#${arrowEndId})`}
          />
          <line
            x1={verticalX}
            y1={productY}
            x2={verticalX}
            y2={productY + productHeight}
            markerStart={`url(#${arrowStartId})`}
            markerEnd={`url(#${arrowEndId})`}
          />
          <DimensionText
            x={productX + productWidth / 2}
            y={
              horizontalY +
              (layout.preserveC040DimensionLayout ? 64 : 59)
            }
            textAnchor="middle"
            fill={DIMENSION_COLOR}
            stroke="none"
            fallbackFontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
          >
            W. {formatDimension(resolvedWidth)}&quot;
          </DimensionText>
          <DimensionText
            x={verticalX + 44}
            y={productY + productHeight / 2 + 14}
            fill={DIMENSION_COLOR}
            stroke="none"
            fallbackFontSize={DIMENSIONS.fontSize}
            fontWeight={DIMENSION_FONT_WEIGHT}
          >
            H. {formatDimension(resolvedHeight)}&quot;
          </DimensionText>
        </g>
      ) : null}
    </svg>
  );
}

export default HorizontalRollingWindowDiagram;
