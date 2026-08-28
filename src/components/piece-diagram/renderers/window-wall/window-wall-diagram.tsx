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

export type WindowWallDimension = number | string;
export type WindowWallAttachment = "NONE" | "LEFT" | "RIGHT";

export interface WindowWallDiagramProps {
  width: WindowWallDimension;
  height: WindowWallDimension;
  panelCount: number;
  horizontalHeights?: readonly number[] | null;
  activeOptionName?: string | null;
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

type FrameEdges = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;

type Slice = Readonly<{
  id: string;
  source: Rect;
  target: Rect;
}>;

const RELEASE = "C139_DYNAMIC_FINAL";
const VIEWBOX_SIZE = 2048;
const DIMENSIONS = dimensionMetrics(VIEWBOX_SIZE);
const DEFAULT_FRAME_COLOR = "#FFFFFF";
const DEFAULT_ASSET_BASE_PATH =
  "/product-visuals/window-wall-storefront/c139";

const PRODUCT_REGION = {
  x: 270,
  y: 250,
  width: 1430,
  height: 1160,
} as const;

// Los tres assets fueron recortados al cuerpo estructural aprobado.
const SOURCE = {
  width: 2048,
  height: 1701,
  left: 143,
  right: 129,
  top: 176,
  bottom: 138,
} as const;

const ASSET_BY_ATTACHMENT: Record<WindowWallAttachment, string> = {
  NONE: "window-wall-o.png",
  LEFT: "window-wall-left-attachment.png",
  RIGHT: "window-wall-right-attachment.png",
};

function parsePositiveDimension(
  value: WindowWallDimension,
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
  const decimal = Number(normalized);
  if (Number.isFinite(decimal) && decimal > 0) return decimal;

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

  throw new Error(`${name} must be a positive dimension`);
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
  return value.replace(/[^A-Za-z0-9_-]/g, "") || "ae-window-wall";
}

function joinAssetPath(basePath: string, filename: string): string {
  return `${basePath.replace(/\/+$/, "")}/${filename}`;
}

export function resolveWindowWallAttachment(
  activeOptionName?: string | null,
): WindowWallAttachment {
  const normalized = (activeOptionName ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();

  if (normalized.includes("LEFT ATTACHMENT")) return "LEFT";
  if (normalized.includes("RIGHT ATTACHMENT")) return "RIGHT";
  return "NONE";
}

function normalizePanelCount(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function normalizeHorizontalHeights(
  values: readonly number[] | null | undefined,
  totalHeight: number,
): number[] {
  const unique = new Set<number>();

  for (const rawValue of values ?? []) {
    const value = Number(rawValue);
    if (Number.isFinite(value) && value > 0 && value < totalHeight) {
      unique.add(value);
    }
  }

  return [...unique].sort((left, right) => left - right);
}

function resolveFrameEdges(frame: Rect): FrameEdges {
  const maxHorizontalEdge = frame.width * 0.22;

  return {
    left: Math.min(Math.max(8, frame.height * 0.045), maxHorizontalEdge),
    right: Math.min(Math.max(8, frame.height * 0.043), maxHorizontalEdge),
    top: Math.max(8, frame.height * 0.055),
    bottom: Math.max(8, frame.height * 0.047),
  };
}

function innerRect(frame: Rect, edges: FrameEdges): Rect {
  return {
    x: frame.x + edges.left,
    y: frame.y + edges.top,
    width: Math.max(1, frame.width - edges.left - edges.right),
    height: Math.max(1, frame.height - edges.top - edges.bottom),
  };
}

function frameSlices(frame: Rect, edges: FrameEdges): Slice[] {
  const sourceCenterWidth = SOURCE.width - SOURCE.left - SOURCE.right;
  const sourceCenterHeight = SOURCE.height - SOURCE.top - SOURCE.bottom;
  const targetCenterWidth = frame.width - edges.left - edges.right;
  const targetCenterHeight = frame.height - edges.top - edges.bottom;
  const targetRight = frame.x + frame.width - edges.right;
  const targetBottom = frame.y + frame.height - edges.bottom;
  const sourceRight = SOURCE.width - SOURCE.right;
  const sourceBottom = SOURCE.height - SOURCE.bottom;

  return [
    {
      id: "top-left",
      source: { x: 0, y: 0, width: SOURCE.left, height: SOURCE.top },
      target: {
        x: frame.x,
        y: frame.y,
        width: edges.left,
        height: edges.top,
      },
    },
    {
      id: "top",
      source: {
        x: SOURCE.left,
        y: 0,
        width: sourceCenterWidth,
        height: SOURCE.top,
      },
      target: {
        x: frame.x + edges.left,
        y: frame.y,
        width: targetCenterWidth,
        height: edges.top,
      },
    },
    {
      id: "top-right",
      source: {
        x: sourceRight,
        y: 0,
        width: SOURCE.right,
        height: SOURCE.top,
      },
      target: {
        x: targetRight,
        y: frame.y,
        width: edges.right,
        height: edges.top,
      },
    },
    {
      id: "left",
      source: {
        x: 0,
        y: SOURCE.top,
        width: SOURCE.left,
        height: sourceCenterHeight,
      },
      target: {
        x: frame.x,
        y: frame.y + edges.top,
        width: edges.left,
        height: targetCenterHeight,
      },
    },
    {
      id: "right",
      source: {
        x: sourceRight,
        y: SOURCE.top,
        width: SOURCE.right,
        height: sourceCenterHeight,
      },
      target: {
        x: targetRight,
        y: frame.y + edges.top,
        width: edges.right,
        height: targetCenterHeight,
      },
    },
    {
      id: "bottom-left",
      source: {
        x: 0,
        y: sourceBottom,
        width: SOURCE.left,
        height: SOURCE.bottom,
      },
      target: {
        x: frame.x,
        y: targetBottom,
        width: edges.left,
        height: edges.bottom,
      },
    },
    {
      id: "bottom",
      source: {
        x: SOURCE.left,
        y: sourceBottom,
        width: sourceCenterWidth,
        height: SOURCE.bottom,
      },
      target: {
        x: frame.x + edges.left,
        y: targetBottom,
        width: targetCenterWidth,
        height: edges.bottom,
      },
    },
    {
      id: "bottom-right",
      source: {
        x: sourceRight,
        y: sourceBottom,
        width: SOURCE.right,
        height: SOURCE.bottom,
      },
      target: {
        x: targetRight,
        y: targetBottom,
        width: edges.right,
        height: edges.bottom,
      },
    },
  ];
}

function StructuralFrame({ href, frame, edges }: {
  href: string;
  frame: Rect;
  edges: FrameEdges;
}) {
  return (
    <g data-layer="WINDOW_WALL_STRUCTURAL_FRAME">
      {frameSlices(frame, edges).map((slice) => (
        <svg
          key={slice.id}
          x={slice.target.x}
          y={slice.target.y}
          width={Math.max(0, slice.target.width)}
          height={Math.max(0, slice.target.height)}
          viewBox={`${slice.source.x} ${slice.source.y} ${slice.source.width} ${slice.source.height}`}
          preserveAspectRatio="none"
          overflow="hidden"
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
      ))}
    </g>
  );
}

function frameRingPath(frame: Rect, glass: Rect): string {
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

function resolveCells({
  glass,
  panelCount,
  horizontalHeights,
  totalHeight,
}: {
  glass: Rect;
  panelCount: number;
  horizontalHeights: readonly number[];
  totalHeight: number;
}): Rect[] {
  const physicalBoundaries = [0, ...horizontalHeights, totalHeight];
  const cells: Rect[] = [];

  for (let row = 0; row < physicalBoundaries.length - 1; row += 1) {
    const fromBottom = physicalBoundaries[row];
    const toBottom = physicalBoundaries[row + 1];
    const y = glass.y + (1 - toBottom / totalHeight) * glass.height;
    const height = ((toBottom - fromBottom) / totalHeight) * glass.height;

    for (let panel = 0; panel < panelCount; panel += 1) {
      cells.push({
        x: glass.x + (panel / panelCount) * glass.width,
        y,
        width: glass.width / panelCount,
        height,
      });
    }
  }

  return cells;
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
  const head = DIMENSIONS.terminalLength;
  const halfHead = DIMENSIONS.terminalHalfWidth;

  return (
    <g data-dimensions="VISIBLE">
      <g
        fill={DIMENSION_COLOR}
        stroke={DIMENSION_COLOR}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={`M ${x1} ${bottomY} L ${x2} ${bottomY}`}
          fill="none"
          strokeWidth={DIMENSIONS.strokeWidth}
        />
        <path
          d={`M ${x1} ${bottomY} l ${head} -${halfHead} v ${halfHead * 2} z`}
          stroke="none"
        />
        <path
          d={`M ${x2} ${bottomY} l -${head} -${halfHead} v ${halfHead * 2} z`}
          stroke="none"
        />
        <path
          d={`M ${sideX} ${y1} L ${sideX} ${middleY - labelGap / 2}`}
          fill="none"
          strokeWidth={DIMENSIONS.strokeWidth}
        />
        <path
          d={`M ${sideX} ${middleY + labelGap / 2} L ${sideX} ${y2}`}
          fill="none"
          strokeWidth={DIMENSIONS.strokeWidth}
        />
        <path
          d={`M ${sideX} ${y1} l -${halfHead} ${head} h ${halfHead * 2} z`}
          stroke="none"
        />
        <path
          d={`M ${sideX} ${y2} l -${halfHead} -${head} h ${halfHead * 2} z`}
          stroke="none"
        />
      </g>

      <g
        fill={DIMENSION_COLOR}
        fontFamily={DIMENSION_FONT_FAMILY}
        fontWeight={DIMENSION_FONT_WEIGHT}
      >
        <DimensionText
          x={(x1 + x2) / 2}
          y={bottomY}
          textAnchor="middle"
          fallbackFontSize={DIMENSIONS.fontSize}
          screenOffsetYPx={DIMENSION_LABEL_BELOW_LINE_PX}
        >{`W. ${width}`}</DimensionText>
        <DimensionText
          x={sideX}
          y={middleY}
          textAnchor="start"
          dominantBaseline="central"
          fallbackFontSize={DIMENSIONS.fontSize}
          screenOffsetXPx={DIMENSION_LABEL_OUTWARD_GAP_PX}
        >{`H. ${height}`}</DimensionText>
      </g>
    </g>
  );
}

export function WindowWallDiagram({
  width,
  height,
  panelCount,
  horizontalHeights,
  activeOptionName,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  showDimensions = true,
  assetBasePath = DEFAULT_ASSET_BASE_PATH,
  idNamespace,
  className,
}: WindowWallDiagramProps): React.ReactElement {
  const reactId = useId();
  const resolvedWidth = parsePositiveDimension(width, "width");
  const resolvedHeight = parsePositiveDimension(height, "height");
  const resolvedPanelCount = normalizePanelCount(panelCount);
  const resolvedHorizontalHeights = normalizeHorizontalHeights(
    horizontalHeights,
    resolvedHeight,
  );
  const attachment = resolveWindowWallAttachment(activeOptionName);
  const frameColor = normalizeFrameColor(frameColorHex);
  const namespace = safeId(`${idNamespace ?? "ae-window-wall"}-${reactId}`);
  const glassGradientId = `${namespace}-glass`;
  const outerFrameGradientId = `${namespace}-outer-frame`;
  const mullionVerticalId = `${namespace}-mullion-v`;
  const mullionHorizontalId = `${namespace}-mullion-h`;
  const productScale = Math.min(
    PRODUCT_REGION.width / resolvedWidth,
    PRODUCT_REGION.height / resolvedHeight,
  );
  const frame: Rect = {
    x:
      PRODUCT_REGION.x +
      (PRODUCT_REGION.width - resolvedWidth * productScale) / 2,
    y:
      PRODUCT_REGION.y +
      (PRODUCT_REGION.height - resolvedHeight * productScale) / 2,
    width: resolvedWidth * productScale,
    height: resolvedHeight * productScale,
  };
  const edges = resolveFrameEdges(frame);
  const glass = innerRect(frame, edges);
  const cells = resolveCells({
    glass,
    panelCount: resolvedPanelCount,
    horizontalHeights: resolvedHorizontalHeights,
    totalHeight: resolvedHeight,
  });
  const panelMarkFontSize = Math.max(
    18,
    Math.min(
      62,
      ...cells.map((cell) => Math.min(cell.width, cell.height) * 0.12),
    ),
  );
  const mullionThickness = Math.max(
    5,
    Math.min(
      frame.height * 0.035,
      glass.width / resolvedPanelCount / 5,
      glass.height / (resolvedHorizontalHeights.length + 1) / 5,
    ),
  );
  const href = joinAssetPath(
    assetBasePath,
    ASSET_BY_ATTACHMENT[attachment],
  );
  const viewportPadding = DIMENSIONS.fontSize * 0.3;
  const viewBox = expandedViewBox(
    frame,
    showDimensions
      ? {
          top: viewportPadding,
          right: 105 + 28 + DIMENSIONS.fontSize * 3.7 + viewportPadding,
          bottom: 105 + 74 + DIMENSIONS.fontSize * 0.5 + viewportPadding,
          left: viewportPadding,
        }
      : {
          top: viewportPadding,
          right: viewportPadding,
          bottom: viewportPadding,
          left: viewportPadding,
        },
  );

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
      aria-label={`Window Wall, ${resolvedPanelCount} equal panels, ${formatDimension(resolvedWidth)} by ${formatDimension(resolvedHeight)} inches`}
      className={className}
      data-family="WINDOW_WALL"
      data-release={RELEASE}
      data-view="EXTERIOR"
      data-panel-count={resolvedPanelCount}
      data-horizontal-heights={resolvedHorizontalHeights.join(",")}
      data-attachment={attachment}
      data-frame-color={frameColor}
      data-width={resolvedWidth}
      data-height={resolvedHeight}
    >
      <title>{`Window Wall ${resolvedPanelCount} equal panels`}</title>
      <defs>
        <radialGradient
          id={glassGradientId}
          cx="28%"
          cy="22%"
          r="95%"
          fx="24%"
          fy="18%"
        >
          <stop offset="0%" stopColor="#F4FCFF" />
          <stop offset="42%" stopColor="#DCEBED" />
          <stop offset="78%" stopColor="#C9E0E5" />
          <stop offset="100%" stopColor="#AACBD5" />
        </radialGradient>
        <linearGradient
          id={outerFrameGradientId}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="34%" stopColor="#F7F8F6" />
          <stop offset="68%" stopColor="#D9DEDC" />
          <stop offset="100%" stopColor="#F4F5F3" />
        </linearGradient>
        <linearGradient id={mullionVerticalId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#BFC6C5" />
          <stop offset="18%" stopColor="#F7F8F6" />
          <stop offset="55%" stopColor="#E1E4E1" />
          <stop offset="82%" stopColor="#FAFBF9" />
          <stop offset="100%" stopColor="#AEB7B6" />
        </linearGradient>
        <linearGradient
          id={mullionHorizontalId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#BFC6C5" />
          <stop offset="18%" stopColor="#F7F8F6" />
          <stop offset="55%" stopColor="#E1E4E1" />
          <stop offset="82%" stopColor="#FAFBF9" />
          <stop offset="100%" stopColor="#AEB7B6" />
        </linearGradient>
      </defs>

      <g data-layer="WINDOW_WALL_GLASS_BASE">
        {cells.map((cell, index) => (
          <rect
            key={`glass-${index}`}
            {...cell}
            fill={`url(#${glassGradientId})`}
          />
        ))}
      </g>

      <GlassAppearanceLayer
        rects={cells}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
      />

      {attachment !== "NONE" ? (
        <rect
          x={
            attachment === "LEFT"
              ? frame.x - edges.left * 0.12
              : frame.x + frame.width - edges.right * 0.24
          }
          y={frame.y + edges.top * 0.08}
          width={
            attachment === "LEFT" ? edges.left * 0.36 : edges.right * 0.36
          }
          height={frame.height - (edges.top + edges.bottom) * 0.08}
          fill={
            frameColor === DEFAULT_FRAME_COLOR
              ? `url(#${outerFrameGradientId})`
              : frameColor
          }
          stroke="#8B9698"
          strokeWidth={Math.max(1.5, frame.height * 0.002)}
          data-layer="WINDOW_WALL_ATTACHMENT_PROFILE"
          data-side={attachment}
        />
      ) : null}

      <path
        d={frameRingPath(frame, glass)}
        fill={`url(#${outerFrameGradientId})`}
        fillRule="evenodd"
        clipRule="evenodd"
        stroke="#AAB3B3"
        strokeWidth={Math.max(1.5, frame.height * 0.002)}
        data-layer="WINDOW_WALL_PROCEDURAL_FRAME_BASE"
      />

      <StructuralFrame href={href} frame={frame} edges={edges} />

      {frameColor !== DEFAULT_FRAME_COLOR ? (
        <path
          d={frameRingPath(frame, glass)}
          fill={frameColor}
          fillRule="evenodd"
          clipRule="evenodd"
          style={{ mixBlendMode: "multiply" }}
          data-layer="WINDOW_WALL_FRAME_FINISH"
        />
      ) : null}

      <g data-layer="WINDOW_WALL_MULLIONS">
        {Array.from({ length: resolvedPanelCount - 1 }, (_, index) => {
          const centerX =
            glass.x + ((index + 1) / resolvedPanelCount) * glass.width;
          return (
            <g key={`vertical-${index}`}>
              <rect
                x={centerX - mullionThickness / 2}
                y={glass.y}
                width={mullionThickness}
                height={glass.height}
                fill={`url(#${mullionVerticalId})`}
                stroke="#667277"
                strokeWidth={Math.max(1.5, mullionThickness * 0.07)}
              />
              {frameColor !== DEFAULT_FRAME_COLOR ? (
                <rect
                  x={centerX - mullionThickness / 2}
                  y={glass.y}
                  width={mullionThickness}
                  height={glass.height}
                  fill={frameColor}
                  style={{ mixBlendMode: "multiply" }}
                />
              ) : null}
            </g>
          );
        })}

        {resolvedHorizontalHeights.map((horizontalHeight, index) => {
          const centerY =
            glass.y +
            (1 - horizontalHeight / resolvedHeight) * glass.height;
          return (
            <g key={`horizontal-${horizontalHeight}-${index}`}>
              <rect
                x={glass.x}
                y={centerY - mullionThickness / 2}
                width={glass.width}
                height={mullionThickness}
                fill={`url(#${mullionHorizontalId})`}
                stroke="#667277"
                strokeWidth={Math.max(1.5, mullionThickness * 0.07)}
              />
              {frameColor !== DEFAULT_FRAME_COLOR ? (
                <rect
                  x={glass.x}
                  y={centerY - mullionThickness / 2}
                  width={glass.width}
                  height={mullionThickness}
                  fill={frameColor}
                  style={{ mixBlendMode: "multiply" }}
                />
              ) : null}
            </g>
          );
        })}
      </g>

      <g
        fill="#E20D18"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={400}
        textAnchor="middle"
        dominantBaseline="central"
        data-layer="WINDOW_WALL_PANEL_MARKS"
      >
        {cells.map((cell, index) => (
          <text
            key={`mark-${index}`}
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2}
            fontSize={panelMarkFontSize}
          >
            O
          </text>
        ))}
      </g>

      {showDimensions ? (
        <Dimensions
          frame={frame}
          width={formatDimension(resolvedWidth)}
          height={formatDimension(resolvedHeight)}
        />
      ) : null}
    </svg>
  );
}
