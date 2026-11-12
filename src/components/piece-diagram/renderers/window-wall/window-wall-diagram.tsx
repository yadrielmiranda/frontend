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
  DIMENSION_SCREEN_FONT_SIZE_PX,
  DimensionText,
  VERTICAL_DIMENSION_RESERVE_PX,
  VerticalDimensionText,
} from "../dimension-text";
import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import { MuntinLayer, type MuntinGlassPanel, type ResolvedMuntin } from "../muntin-layer";
import { doorFinish, DoorFrameGradient, DoorGlassGradient, DoorLeafGradient } from "../door-finish";

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
  muntin?: ResolvedMuntin | null;
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

const RELEASE = "C139_VECTOR_SHARED_FINISHES";
const VIEWBOX_SIZE = 2048;
const DIMENSIONS = dimensionMetrics(VIEWBOX_SIZE);
const DEFAULT_FRAME_COLOR = "#FFFFFF";

const PRODUCT_REGION = {
  x: 270,
  y: 250,
  width: 1430,
  height: 1160,
} as const;

// Coordenadas medidas directamente sobre los renders C139 aprobados.
const PANEL_SOURCE = {
  width: 1963,
  height: 1572,
  glassInsetLeftPx: 95,
  glassInsetRightPx: 92,
  glassInsetTopPx: 96,
  glassInsetBottomPx: 96,
  leftAttachmentExtensionPx: 48,
  rightAttachmentExtensionPx: 48,
} as const;

// Ambos attachments usan el mismo perfil, reflejado horizontalmente, para que
// el navegador no rasterice con distinto grosor las juntas equivalentes.
const LEFT_ATTACHMENT_GLASS_INSET_LEFT_PX = 52;
const RIGHT_ATTACHMENT_GLASS_INSET_RIGHT_PX = 52;

// Medidas tomadas del cuerpo visible del render original de tres paneles.
const THREE_PANEL_SOURCE_BODY = {
  width: 6627,
  height: 1786,
  jointWidth: 132,
} as const;
const INTERNAL_JOINT_WIDTH_RATIO =
  THREE_PANEL_SOURCE_BODY.jointWidth / THREE_PANEL_SOURCE_BODY.height;
const HORIZONTAL_JOINT_HEIGHT_RATIO = 110 / PANEL_SOURCE.height;
const GASKET_STROKE_WIDTH_RATIO = 3 / PANEL_SOURCE.height;

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

function windowWallMuntinCells(
  muntin: ResolvedMuntin | null | undefined,
  panels: readonly PanelGeometry[],
  horizontalJointHeight: number,
): { muntin: ResolvedMuntin; glassPanels: MuntinGlassPanel[] } | null {
  if (!muntin || !panels.length || !muntin.panels.length) return null;
  const selection = muntin.panels[0];
  // A single H/V setting repeats inside every physical glass section. Older
  // expanded data is compatible only when all entries describe the same grid.
  if (muntin.panels.some((panel) => panel.horizontalLites !== selection.horizontalLites
    || panel.verticalLites !== selection.verticalLites)) return null;
  const columns = panels.map((panel) => visiblePanelCells(panel, horizontalJointHeight)
    .sort((left, right) => left.y - right.y));
  const rows = columns[0].length;
  const glassPanels: MuntinGlassPanel[] = [];
  const mappedPanels: ResolvedMuntin["panels"] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns.length; column++) {
      const cell = columns[column][row];
      const panelLabel = `Cell ${row + 1}:${column + 1}`;
      const panelIndex = row * columns.length + column + 1;
      mappedPanels.push({ ...selection, panelIndex, panelLabel, panelCode: "O" });
      glassPanels.push({ panelIndex, panelCode: "O", panelLabel,
        rect: cell,
      });
    }
  }
  return { muntin: { ...muntin, panels: mappedPanels }, glassPanels };
}

// Every effect and grid follows the daylight opening left by the transoms.
function visiblePanelCells(panel: PanelGeometry, horizontalJointHeight: number): Rect[] {
  return panel.cells.map((cell, index) => {
    const insetTop = index < panel.cells.length - 1 ? horizontalJointHeight / 2 : 0;
    const insetBottom = index > 0 ? horizontalJointHeight / 2 : 0;
    return { ...cell, y: cell.y + insetTop, height: cell.height - insetTop - insetBottom };
  });
}

function innerProfileRect(panel: PanelGeometry, bead: number, jointWidth: number): Rect {
  // At an interlock the next glazing profile begins at the seam itself. The
  // preceding module keeps its full return, making the visible overlap 3:1.
  const leftBead = panel.index === 0 ? bead : jointWidth / 4;
  return {
    x: panel.glass.x - leftBead,
    y: panel.glass.y - bead,
    width: panel.glass.width + leftBead + bead,
    height: panel.glass.height + 2 * bead,
  };
}

function GlazingStop({ glass, seal, finish, glassPaint }: {
  glass: Rect; seal: number;
  finish: ReturnType<typeof doorFinish>; glassPaint: string;
}) {
  const { x, y, width, height } = glass;
  const right = x + width;
  const bottom = y + height;
  return <g data-part="window-wall-glazing-stop">
    <rect x={x - seal} y={y - seal} width={width + 2 * seal} height={height + 2 * seal}
      fill={finish("#617071", -0.52)} />
    <path d={`M${x - seal / 2} ${bottom}V${y - seal / 2}H${right}`}
      fill="none" stroke={finish("#A7B2B0", -0.28)} strokeWidth={seal} />
    <rect {...glass} fill={glassPaint} data-part="window-wall-glass" />
  </g>;
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
          d={`M ${sideX} ${y1} L ${sideX} ${y2}`}
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
        <VerticalDimensionText
          x={sideX}
          y={middleY}
          fallbackFontSize={DIMENSIONS.fontSize}
        >{`H. ${height}`}</VerticalDimensionText>
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
  muntin,
  showDimensions = true,
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
  const attachment = requestedAttachment;
  const frameColor = normalizeFrameColor(frameColorHex);
  const namespace = safeId(`${idNamespace ?? "ae-window-wall"}-${reactId}`);
  const finish = doorFinish(frameColor);
  const paint = (part: string) => `url(#${namespace}-${part})`;
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
  // Cada perfil conserva la proporción visual medida en la imagen original,
  // aunque cambie la relación entre el ancho y el alto del opening.
  const profilePixelScale = frame.height / PANEL_SOURCE.height;
  const glassInsetLeft = PANEL_SOURCE.glassInsetLeftPx * profilePixelScale;
  const glassInsetRight = PANEL_SOURCE.glassInsetRightPx * profilePixelScale;
  const glassInsetTop = PANEL_SOURCE.glassInsetTopPx * profilePixelScale;
  const glassInsetBottom = PANEL_SOURCE.glassInsetBottomPx * profilePixelScale;
  const exteriorGlassInsetLeft =
    attachment === "LEFT"
      ? LEFT_ATTACHMENT_GLASS_INSET_LEFT_PX * profilePixelScale
      : glassInsetLeft;
  const exteriorGlassInsetRight =
    attachment === "RIGHT"
      ? RIGHT_ATTACHMENT_GLASS_INSET_RIGHT_PX * profilePixelScale
      : glassInsetRight;
  const panelWidth = frame.width / resolvedPanelCount;
  const jointWidth = Math.max(
    2,
    Math.min(
      panelWidth * 0.45,
      frame.height * INTERNAL_JOINT_WIDTH_RATIO,
    ),
  );
  const glassTop = frame.y + glassInsetTop;
  const glassBottom = frame.y + frame.height - glassInsetBottom;
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
          ? panelFrame.x + exteriorGlassInsetLeft
          : panelFrame.x + jointWidth / 2;
      const glassRight =
        index === resolvedPanelCount - 1
          ? panelFrame.x + panelWidth - exteriorGlassInsetRight
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
    2,
    Math.min(
      frame.height * HORIZONTAL_JOINT_HEIGHT_RATIO,
      minimumRowHeight * 0.4,
    ),
  );
  const visibleCells = panels.flatMap((panel) => visiblePanelCells(panel, horizontalJointHeight));
  const glazingBead = Math.min(35 * profilePixelScale,
    ...visibleCells.map((cell) => Math.min(cell.width, cell.height) * 0.12));
  const resolvedMuntin = windowWallMuntinCells(muntin, panels, horizontalJointHeight);
  const gasketStrokeWidth = Math.max(
    1.25,
    frame.height * GASKET_STROKE_WIDTH_RATIO,
  );
  const panelMarkFontSize = Math.max(
    18,
    Math.min(
      62,
      ...cells.map((cell) => Math.min(cell.width, cell.height) * 0.12),
    ),
  );
  const attachmentLeftPadding =
    attachment === "LEFT"
      ? PANEL_SOURCE.leftAttachmentExtensionPx * profilePixelScale
      : 0;
  const attachmentRightPadding =
    attachment === "RIGHT"
      ? PANEL_SOURCE.rightAttachmentExtensionPx * profilePixelScale
      : 0;
  const viewportPadding = DIMENSIONS.fontSize * 0.3;
  const viewBox = expandedViewBox(
    frame,
    showDimensions
      ? {
          top: viewportPadding,
          right:
            105 +
            viewportPadding +
            attachmentRightPadding,
          bottom: 105 + viewportPadding,
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
      style={{
        boxSizing: "border-box",
        paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined,
        paddingBottom: showDimensions
          ? DIMENSION_LABEL_BELOW_LINE_PX + DIMENSION_SCREEN_FONT_SIZE_PX * 0.3 + 2
          : undefined,
      }}
      data-family="WINDOW_WALL"
      data-release={RELEASE}
      data-view="EXTERIOR"
      data-construction="C139_VECTOR_PROFILES"
      data-artwork="vector"
      data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
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
        <DoorFrameGradient id={`${namespace}-jamb`} finish={finish} />
        <DoorLeafGradient id={`${namespace}-finish`} finish={finish} />
        <DoorGlassGradient id={`${namespace}-glass`} />
      </defs>

      <g data-layer="WINDOW_WALL_STRUCTURE" data-artwork="vector">
        {/* The exposed faces share the selected finish; the returns and seams
            below describe the individual overlapping modules. */}
        <rect {...frame} fill={paint("jamb")} stroke={finish("#A7B0AF", -0.27)} strokeWidth={gasketStrokeWidth * 0.55}
          data-part="window-wall-frame" />
        <path d={`M${frame.x} ${frame.y}H${frame.x + frame.width}V${frame.y + frame.height}H${frame.x}Z
          ${attachmentLeftPadding ? `M${frame.x - attachmentLeftPadding} ${frame.y + glassInsetTop / 2}H${frame.x}V${frame.y + frame.height - glassInsetBottom / 2}H${frame.x - attachmentLeftPadding}Z` : ""}
          ${attachmentRightPadding ? `M${frame.x + frame.width} ${frame.y + glassInsetTop / 2}H${frame.x + frame.width + attachmentRightPadding}V${frame.y + frame.height - glassInsetBottom / 2}H${frame.x + frame.width}Z` : ""}`}
          fill={paint("finish")} data-part="window-wall-profile-face" />
        <path d={`M${frame.x} ${frame.y}H${frame.x + frame.width} M${frame.x} ${frame.y}V${frame.y + frame.height}`}
          fill="none" stroke="white" strokeOpacity=".7" strokeWidth={gasketStrokeWidth * 0.6} />
        <path d={`M${frame.x} ${frame.y + frame.height}H${frame.x + frame.width}V${frame.y}`}
          fill="none" stroke={finish("#899593", -0.38)} strokeWidth={gasketStrokeWidth * 0.6} />

        {attachment !== "NONE" && <g data-part="window-wall-attachment" data-attachment={attachment}>
          <rect x={attachment === "LEFT" ? frame.x - attachmentLeftPadding : frame.x + frame.width}
            y={frame.y + glassInsetTop / 2}
            width={attachmentLeftPadding || attachmentRightPadding}
            height={frame.height - (glassInsetTop + glassInsetBottom) / 2}
            fill="none" stroke={finish("#A7B0AF", -0.27)} strokeWidth={gasketStrokeWidth * 0.55} />
        </g>}

        {panels.map((panel) => {
          const profile = innerProfileRect(panel, glazingBead, jointWidth);
          return <g key={`profile-${panel.index}`}>
            <rect {...profile} fill={paint("jamb")}
              stroke={finish("#A7B0AF", -0.27)} strokeWidth={gasketStrokeWidth * 0.75}
              data-part="window-wall-inner-profile" data-panel-index={panel.index + 1} />
            <path d={`M${profile.x + gasketStrokeWidth} ${profile.y + profile.height - gasketStrokeWidth}
              V${profile.y + gasketStrokeWidth}H${profile.x + profile.width - gasketStrokeWidth}`}
              fill="none" stroke="white" strokeOpacity=".35" strokeWidth={gasketStrokeWidth * 0.65} />
          </g>;
        })}

        <g data-layer="WINDOW_WALL_HORIZONTAL_JOINTS">
          {panels.map((panel) => resolvedHorizontalHeights.map((horizontalHeight) => {
            const centerY = panel.glass.y + (1 - horizontalHeight / resolvedHeight) * panel.glass.height;
            const profile = innerProfileRect(panel, glazingBead, jointWidth);
            // C139's front elevation leaves 26% of the gap for each glass
            // return and 48% for the flat transom face between them.
            const faceHeight = horizontalJointHeight * 0.48;
            const top = centerY - faceHeight / 2;
            const bottom = centerY + faceHeight / 2;
            return <g key={`horizontal-${panel.index}-${horizontalHeight}`} data-horizontal-height={horizontalHeight}
              data-panel-index={panel.index + 1} data-profile-y={centerY - horizontalJointHeight / 2}
              data-profile-height={horizontalJointHeight}>
              <rect x={profile.x} y={top} width={profile.width} height={faceHeight}
                fill={paint("finish")} data-part="window-wall-transom" data-panel-index={panel.index + 1} />
              <path d={`M${profile.x} ${top}H${profile.x + profile.width}
                M${profile.x} ${bottom}H${profile.x + profile.width}`}
                fill="none" stroke={finish("#A7B0AF", -0.27)} strokeWidth={gasketStrokeWidth * 0.75} />
              <path d={`M${profile.x} ${top + gasketStrokeWidth}H${profile.x + profile.width}`}
                fill="none" stroke="white" strokeOpacity=".4" strokeWidth={gasketStrokeWidth * 0.65} />
            </g>;
          }))}
        </g>

        {visibleCells.map((glass, index) => <GlazingStop key={`glazing-${index}`} glass={glass}
          seal={gasketStrokeWidth} finish={finish} glassPaint={paint("glass")} />)}

        <g data-layer="WINDOW_WALL_INTERNAL_JOINTS" fill="none">
          {panels.slice(1).map((panel) => {
            const seamX = innerProfileRect(panel, glazingBead, jointWidth).x;
            return <g key={`internal-joint-${panel.index}`} data-internal-attachment="RIGHT">
              <path d={`M${seamX} ${frame.y}V${frame.y + frame.height}`}
                data-part="window-wall-interlock-seams"
                stroke={finish("#A7B0AF", -0.27)} strokeWidth={gasketStrokeWidth * 0.75} />
              <path d={`M${seamX + gasketStrokeWidth * 0.7} ${frame.y}V${frame.y + frame.height}`}
                stroke="white" strokeOpacity=".32" strokeWidth={gasketStrokeWidth * 0.55} />
            </g>;
          })}
        </g>
      </g>

      <GlassAppearanceLayer rects={visibleCells} glassTintHex={glassTintHex}
        hasCoating={hasCoating} hasPrivacy={hasPrivacy} />
      {resolvedMuntin ? <MuntinLayer
        muntin={resolvedMuntin.muntin}
        glassPanels={resolvedMuntin.glassPanels}
        frameColorHex={frameColor}
        unitsPerInch={productScale}
        idNamespace={`${namespace}-muntin`}
      /> : null}

      <g
        fill="#E20D18"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={400}
        textAnchor="middle"
        dominantBaseline="central"
        data-layer="WINDOW_WALL_PANEL_MARKS"
      >
        {visibleCells.map((cell, index) => (
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
