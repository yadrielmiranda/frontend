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

type PanelGeometry = Readonly<{
  index: number;
  frame: Rect;
  glass: Rect;
  cells: readonly Rect[];
}>;

const RELEASE = "C139_REFERENCE_MODULES_FINAL";
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

// Coordenadas medidas directamente sobre los renders C139 aprobados.
const PANEL_SOURCE = {
  glassInsetLeft: 95 / 1963,
  glassInsetRight: 92 / 1963,
  glassInsetTop: 96 / 1572,
  glassInsetBottom: 96 / 1572,
  leftAttachmentExtension: 48 / 1963,
  rightAttachmentExtension: 37 / 1963,
} as const;

// La unión proviene del encuentro real mostrado en el render de tres paneles.
const INTERNAL_JOINT_WIDTH_RATIO = 168 / 2223;
const HORIZONTAL_JOINT_HEIGHT_RATIO = 110 / 1572;

const ASSETS = {
  panel: "window-wall-o.png",
  leftAttachment: "window-wall-left-attachment.png",
  rightAttachment: "window-wall-right-attachment.png",
  internalJoint: "window-wall-internal-joint.png",
  horizontalJoint: "window-wall-horizontal-joint.png",
} as const;

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

function resolvePanelCells({
  glass,
  horizontalHeights,
  totalHeight,
}: {
  glass: Rect;
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
    cells.push({ x: glass.x, y, width: glass.width, height });
  }

  return cells;
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

function SourcePanel({
  href,
  frame,
  attachment,
}: {
  href: string;
  frame: Rect;
  attachment: WindowWallAttachment;
}) {
  const targetLeftExtension =
    attachment === "LEFT"
      ? frame.width * PANEL_SOURCE.leftAttachmentExtension
      : 0;
  const targetRightExtension =
    attachment === "RIGHT"
      ? frame.width * PANEL_SOURCE.rightAttachmentExtension
      : 0;

  return (
    <image
      href={href}
      x={frame.x - targetLeftExtension}
      y={frame.y}
      width={frame.width + targetLeftExtension + targetRightExtension}
      height={frame.height}
      preserveAspectRatio="none"
      data-layer="WINDOW_WALL_SOURCE_PANEL"
      data-source-attachment={attachment}
    />
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
  const requestedAttachment = resolveWindowWallAttachment(activeOptionName);
  const attachment =
    resolvedPanelCount === 1 ? requestedAttachment : "NONE";
  const frameColor = normalizeFrameColor(frameColorHex);
  const namespace = safeId(`${idNamespace ?? "ae-window-wall"}-${reactId}`);
  const glassGradientId = `${namespace}-glass`;
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
  const panelWidth = frame.width / resolvedPanelCount;
  const jointWidth = Math.max(
    4,
    Math.min(panelWidth * 0.18, panelWidth * INTERNAL_JOINT_WIDTH_RATIO),
  );
  const glassTop = frame.y + frame.height * PANEL_SOURCE.glassInsetTop;
  const glassBottom =
    frame.y + frame.height * (1 - PANEL_SOURCE.glassInsetBottom);
  const panels: PanelGeometry[] = Array.from(
    { length: resolvedPanelCount },
    (_, index) => {
      const panelFrame: Rect = {
        x: frame.x + index * panelWidth,
        y: frame.y,
        width: panelWidth,
        height: frame.height,
      };
      const glassLeft =
        index === 0
          ? panelFrame.x + panelWidth * PANEL_SOURCE.glassInsetLeft
          : panelFrame.x + jointWidth / 2;
      const glassRight =
        index === resolvedPanelCount - 1
          ? panelFrame.x +
            panelWidth * (1 - PANEL_SOURCE.glassInsetRight)
          : panelFrame.x + panelWidth - jointWidth / 2;
      const glass: Rect = {
        x: glassLeft,
        y: glassTop,
        width: Math.max(1, glassRight - glassLeft),
        height: Math.max(1, glassBottom - glassTop),
      };

      return {
        index,
        frame: panelFrame,
        glass,
        cells: resolvePanelCells({
          glass,
          horizontalHeights: resolvedHorizontalHeights,
          totalHeight: resolvedHeight,
        }),
      };
    },
  );
  const cells = panels.flatMap((panel) => panel.cells);
  const minimumRowHeight = Math.min(...cells.map((cell) => cell.height));
  const horizontalJointHeight = Math.max(
    5,
    Math.min(
      frame.height * HORIZONTAL_JOINT_HEIGHT_RATIO,
      minimumRowHeight * 0.4,
    ),
  );
  const gasketStrokeWidth = Math.max(1.5, frame.height * 0.0028);
  const panelMarkFontSize = Math.max(
    18,
    Math.min(
      62,
      ...cells.map((cell) => Math.min(cell.width, cell.height) * 0.12),
    ),
  );
  const panelAsset = joinAssetPath(
    assetBasePath,
    attachment === "LEFT"
      ? ASSETS.leftAttachment
      : attachment === "RIGHT"
        ? ASSETS.rightAttachment
        : ASSETS.panel,
  );
  const internalJointAsset = joinAssetPath(
    assetBasePath,
    ASSETS.internalJoint,
  );
  const horizontalJointAsset = joinAssetPath(
    assetBasePath,
    ASSETS.horizontalJoint,
  );
  const attachmentLeftPadding =
    attachment === "LEFT"
      ? frame.width * PANEL_SOURCE.leftAttachmentExtension
      : 0;
  const attachmentRightPadding =
    attachment === "RIGHT"
      ? frame.width * PANEL_SOURCE.rightAttachmentExtension
      : 0;
  const viewportPadding = DIMENSIONS.fontSize * 0.3;
  const viewBox = expandedViewBox(
    frame,
    showDimensions
      ? {
          top: viewportPadding,
          right:
            105 +
            28 +
            DIMENSIONS.fontSize * 3.7 +
            viewportPadding +
            attachmentRightPadding,
          bottom: 105 + 74 + DIMENSIONS.fontSize * 0.5 + viewportPadding,
          left: viewportPadding + attachmentLeftPadding,
        }
      : {
          top: viewportPadding,
          right: viewportPadding + attachmentRightPadding,
          bottom: viewportPadding,
          left: viewportPadding + attachmentLeftPadding,
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
      data-construction="C139_REFERENCE_MODULES"
      data-panel-count={resolvedPanelCount}
      data-horizontal-heights={resolvedHorizontalHeights.join(",")}
      data-attachment={attachment}
      data-requested-attachment={requestedAttachment}
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
      </defs>

      <g data-layer="WINDOW_WALL_APPROVED_PANEL_SOURCES">
        {panels.map((panel) => (
          <SourcePanel
            key={`source-panel-${panel.index}`}
            href={panelAsset}
            frame={panel.frame}
            attachment={attachment}
          />
        ))}
      </g>

      <g data-layer="WINDOW_WALL_DYNAMIC_GLASS_BASE">
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

      <g data-layer="WINDOW_WALL_INTERNAL_JOINTS">
        {panels.slice(0, -1).map((panel) => {
          const boundaryX = panel.frame.x + panel.frame.width;
          return (
            <image
              key={`internal-joint-${panel.index}`}
              href={internalJointAsset}
              x={boundaryX - jointWidth / 2}
              y={frame.y}
              width={jointWidth}
              height={frame.height}
              preserveAspectRatio="none"
              data-internal-attachment="RIGHT"
            />
          );
        })}
      </g>

      <g
        fill="none"
        stroke="#20272B"
        strokeWidth={gasketStrokeWidth}
        strokeLinecap="square"
        data-layer="WINDOW_WALL_INTERNAL_GASKET_BRIDGES"
      >
        {panels.slice(0, -1).flatMap((panel) => {
          const boundaryX = panel.frame.x + panel.frame.width;
          const nextPanel = panels[panel.index + 1];
          const leftSourceEnd =
            boundaryX - panelWidth * PANEL_SOURCE.glassInsetRight;
          const leftJointEdge = boundaryX - jointWidth / 2;
          const rightJointEdge = boundaryX + jointWidth / 2;
          const rightSourceStart =
            nextPanel.frame.x +
            panelWidth * PANEL_SOURCE.glassInsetLeft;

          return [glassTop, glassBottom].flatMap((y, rowIndex) => [
            <path
              key={`left-bridge-${panel.index}-${rowIndex}`}
              d={`M ${leftSourceEnd} ${y} H ${leftJointEdge}`}
            />,
            <path
              key={`right-bridge-${panel.index}-${rowIndex}`}
              d={`M ${rightJointEdge} ${y} H ${rightSourceStart}`}
            />,
          ]);
        })}
      </g>

      <g data-layer="WINDOW_WALL_HORIZONTAL_JOINTS">
        {panels.map((panel) =>
          resolvedHorizontalHeights.map((horizontalHeight, index) => {
            const centerY =
              panel.glass.y +
              (1 - horizontalHeight / resolvedHeight) * panel.glass.height;
            return (
              <image
                key={`horizontal-${panel.index}-${horizontalHeight}-${index}`}
                href={horizontalJointAsset}
                x={panel.frame.x}
                y={centerY - horizontalJointHeight / 2}
                width={panel.frame.width}
                height={horizontalJointHeight}
                preserveAspectRatio="none"
              />
            );
          }),
        )}
      </g>

      {frameColor !== DEFAULT_FRAME_COLOR ? (
        <g
          fill={frameColor}
          style={{ mixBlendMode: "multiply" }}
          data-layer="WINDOW_WALL_FRAME_FINISH"
        >
          {panels.map((panel) => (
            <path
              key={`frame-finish-${panel.index}`}
              d={frameRingPath(panel.frame, panel.glass)}
              fillRule="evenodd"
              clipRule="evenodd"
            />
          ))}
          {panels.slice(0, -1).map((panel) => (
            <rect
              key={`joint-finish-${panel.index}`}
              x={panel.frame.x + panel.frame.width - jointWidth / 2}
              y={frame.y}
              width={jointWidth}
              height={frame.height}
            />
          ))}
          {panels.flatMap((panel) =>
            resolvedHorizontalHeights.map((horizontalHeight, index) => {
              const centerY =
                panel.glass.y +
                (1 - horizontalHeight / resolvedHeight) * panel.glass.height;
              return (
                <rect
                  key={`horizontal-finish-${panel.index}-${index}`}
                  x={panel.frame.x}
                  y={centerY - horizontalJointHeight / 2}
                  width={panel.frame.width}
                  height={horizontalJointHeight}
                />
              );
            }),
          )}
        </g>
      ) : null}

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
