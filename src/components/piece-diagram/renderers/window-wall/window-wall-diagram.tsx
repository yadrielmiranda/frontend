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

const RELEASE = "C139_SOURCE_PROFILE_AND_ENDS_FIXED";
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
  width: 1963,
  height: 1572,
  glassInsetLeftPx: 95,
  glassInsetRightPx: 92,
  glassInsetTopPx: 96,
  glassInsetBottomPx: 96,
  leftAttachmentExtensionPx: 48,
  rightAttachmentExtensionPx: 37,
} as const;

// Cada attachment conserva las medidas de su propio PNG aprobado.
const LEFT_ATTACHMENT_GLASS_INSET_LEFT_PX = 52;
const RIGHT_ATTACHMENT_GLASS_INSET_RIGHT_PX = 56;
// Right necesita esta guarda vertical para que los efectos del vidrio no
// alcancen sus juntas horizontales durante el reescalado del navegador.
const RIGHT_ATTACHMENT_GLASS_INSET_TOP_PX = 100;
const RIGHT_ATTACHMENT_GLASS_INSET_BOTTOM_PX = 100;

const LEFT_ATTACHMENT_SOURCE = {
  width: 2011,
  height: 1572,
  left: 143,
  right: 92,
  top: 96,
  bottom: 96,
} as const;

const RIGHT_ATTACHMENT_SOURCE = {
  width: 2000,
  height: 1572,
  left: 95,
  right: 92,
  top: 96,
  bottom: 96,
} as const;

const PANEL_NINE_SLICE_SOURCE = {
  width: PANEL_SOURCE.width,
  height: PANEL_SOURCE.height,
  left: PANEL_SOURCE.glassInsetLeftPx,
  right: PANEL_SOURCE.glassInsetRightPx,
  top: PANEL_SOURCE.glassInsetTopPx,
  bottom: PANEL_SOURCE.glassInsetBottomPx,
} as const;

// Medidas tomadas del cuerpo visible del render original de tres paneles.
const THREE_PANEL_SOURCE_BODY = {
  width: 6627,
  height: 1786,
  jointWidth: 168,
} as const;
const INTERNAL_JOINT_WIDTH_RATIO =
  THREE_PANEL_SOURCE_BODY.jointWidth / THREE_PANEL_SOURCE_BODY.height;
const HORIZONTAL_JOINT_HEIGHT_RATIO = 110 / PANEL_SOURCE.height;
const GASKET_STROKE_WIDTH_RATIO = 3 / PANEL_SOURCE.height;

const INTERNAL_JOINT_SOURCE = {
  width: 192,
  height: 2048,
  top: 125,
  bottom: 125,
} as const;
const INTERNAL_JOINT_CAP_RATIO =
  INTERNAL_JOINT_SOURCE.top / INTERNAL_JOINT_SOURCE.height;

const HORIZONTAL_JOINT_SOURCE = {
  width: 2048,
  height: 115,
  left: 99,
  right: 96,
} as const;

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

function fitOpposingSlices(
  first: number,
  second: number,
  available: number,
): readonly [number, number] {
  const total = first + second;
  if (total <= available || total <= 0) return [first, second];

  const scale = Math.max(0, available / total);
  return [first * scale, second * scale];
}

function CroppedImage({
  href,
  source,
  target,
  sourceImageWidth,
  sourceImageHeight,
  slice,
  filterId,
}: {
  href: string;
  source: Rect;
  target: Rect;
  sourceImageWidth: number;
  sourceImageHeight: number;
  slice: string;
  filterId?: string;
}) {
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    target.width <= 0 ||
    target.height <= 0
  ) {
    return null;
  }

  return (
    <svg
      x={target.x}
      y={target.y}
      width={target.width}
      height={target.height}
      viewBox={`${source.x} ${source.y} ${source.width} ${source.height}`}
      preserveAspectRatio="none"
      overflow="hidden"
      data-slice={slice}
    >
      <image
        href={href}
        x={0}
        y={0}
        width={sourceImageWidth}
        height={sourceImageHeight}
        preserveAspectRatio="none"
        filter={filterId ? `url(#${filterId})` : undefined}
      />
    </svg>
  );
}

function NineSliceImage({
  href,
  target,
  sourceWidth,
  sourceHeight,
  sourceLeft,
  sourceRight,
  sourceTop,
  sourceBottom,
  targetLeft,
  targetRight,
  targetTop,
  targetBottom,
  sourceFilterId,
}: {
  href: string;
  target: Rect;
  sourceWidth: number;
  sourceHeight: number;
  sourceLeft: number;
  sourceRight: number;
  sourceTop: number;
  sourceBottom: number;
  targetLeft: number;
  targetRight: number;
  targetTop: number;
  targetBottom: number;
  sourceFilterId?: string;
}) {
  const [fittedTargetLeft, fittedTargetRight] = fitOpposingSlices(
    targetLeft,
    targetRight,
    target.width,
  );
  const [fittedTargetTop, fittedTargetBottom] = fitOpposingSlices(
    targetTop,
    targetBottom,
    target.height,
  );
  const sourceXs = [0, sourceLeft, sourceWidth - sourceRight];
  const sourceYs = [0, sourceTop, sourceHeight - sourceBottom];
  const sourceWidths = [
    sourceLeft,
    sourceWidth - sourceLeft - sourceRight,
    sourceRight,
  ];
  const sourceHeights = [
    sourceTop,
    sourceHeight - sourceTop - sourceBottom,
    sourceBottom,
  ];
  const targetXs = [
    target.x,
    target.x + fittedTargetLeft,
    target.x + target.width - fittedTargetRight,
  ];
  const targetYs = [
    target.y,
    target.y + fittedTargetTop,
    target.y + target.height - fittedTargetBottom,
  ];
  const targetWidths = [
    fittedTargetLeft,
    target.width - fittedTargetLeft - fittedTargetRight,
    fittedTargetRight,
  ];
  const targetHeights = [
    fittedTargetTop,
    target.height - fittedTargetTop - fittedTargetBottom,
    fittedTargetBottom,
  ];

  return (
    <>
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((column) => (
          <CroppedImage
            key={`${row}-${column}`}
            href={href}
            source={{
              x: sourceXs[column],
              y: sourceYs[row],
              width: sourceWidths[column],
              height: sourceHeights[row],
            }}
            target={{
              x: targetXs[column],
              y: targetYs[row],
              width: targetWidths[column],
              height: targetHeights[row],
            }}
            sourceImageWidth={sourceWidth}
            sourceImageHeight={sourceHeight}
            slice={`${row}-${column}`}
            filterId={
              row === 1 && column === 1 ? sourceFilterId : undefined
            }
          />
        )),
      )}
    </>
  );
}

function SourcePanel({
  href,
  frame,
  attachment,
  profilePixelScale,
  showOuterLeft,
  showOuterRight,
  sourceFilterId,
}: {
  href: string;
  frame: Rect;
  attachment: WindowWallAttachment;
  profilePixelScale: number;
  showOuterLeft: boolean;
  showOuterRight: boolean;
  sourceFilterId?: string;
}) {
  const targetLeftExtension =
    attachment === "LEFT"
      ? PANEL_SOURCE.leftAttachmentExtensionPx * profilePixelScale
      : 0;
  const targetRightExtension =
    attachment === "RIGHT"
      ? PANEL_SOURCE.rightAttachmentExtensionPx * profilePixelScale
      : 0;
  const source =
    attachment === "LEFT"
      ? LEFT_ATTACHMENT_SOURCE
      : attachment === "RIGHT"
        ? RIGHT_ATTACHMENT_SOURCE
        : PANEL_NINE_SLICE_SOURCE;
  const target: Rect = {
    x: frame.x - targetLeftExtension,
    y: frame.y,
    width: frame.width + targetLeftExtension + targetRightExtension,
    height: frame.height,
  };

  return (
    <g
      data-layer="WINDOW_WALL_SOURCE_PANEL"
      data-source-attachment={attachment}
      data-outer-left={showOuterLeft ? "VISIBLE" : "JOINED"}
      data-outer-right={showOuterRight ? "VISIBLE" : "JOINED"}
    >
      <NineSliceImage
        href={href}
        target={target}
        sourceWidth={source.width}
        sourceHeight={source.height}
        sourceLeft={source.left}
        sourceRight={source.right}
        sourceTop={source.top}
        sourceBottom={source.bottom}
        targetLeft={
          showOuterLeft ? source.left * profilePixelScale : 0
        }
        targetRight={
          showOuterRight ? source.right * profilePixelScale : 0
        }
        targetTop={source.top * profilePixelScale}
        targetBottom={source.bottom * profilePixelScale}
        sourceFilterId={sourceFilterId}
      />
    </g>
  );
}

function VerticalProfile({
  href,
  target,
  targetTop,
  targetBottom,
}: {
  href: string;
  target: Rect;
  targetTop: number;
  targetBottom: number;
}) {
  const [fittedTop, fittedBottom] = fitOpposingSlices(
    targetTop,
    targetBottom,
    target.height,
  );
  const sourceHeights = [
    INTERNAL_JOINT_SOURCE.top,
    INTERNAL_JOINT_SOURCE.height -
      INTERNAL_JOINT_SOURCE.top -
      INTERNAL_JOINT_SOURCE.bottom,
    INTERNAL_JOINT_SOURCE.bottom,
  ];
  const sourceYs = [
    0,
    INTERNAL_JOINT_SOURCE.top,
    INTERNAL_JOINT_SOURCE.height - INTERNAL_JOINT_SOURCE.bottom,
  ];
  const targetHeights = [
    fittedTop,
    target.height - fittedTop - fittedBottom,
    fittedBottom,
  ];
  const targetYs = [
    target.y,
    target.y + fittedTop,
    target.y + target.height - fittedBottom,
  ];

  return (
    <>
      {[0, 1, 2].map((index) => (
        <CroppedImage
          key={index}
          href={href}
          source={{
            x: 0,
            y: sourceYs[index],
            width: INTERNAL_JOINT_SOURCE.width,
            height: sourceHeights[index],
          }}
          target={{
            x: target.x,
            y: targetYs[index],
            width: target.width,
            height: targetHeights[index],
          }}
          sourceImageWidth={INTERNAL_JOINT_SOURCE.width}
          sourceImageHeight={INTERNAL_JOINT_SOURCE.height}
          slice={`vertical-${index}`}
        />
      ))}
    </>
  );
}

function HorizontalProfile({
  href,
  target,
  targetLeft,
  targetRight,
}: {
  href: string;
  target: Rect;
  targetLeft: number;
  targetRight: number;
}) {
  const [fittedLeft, fittedRight] = fitOpposingSlices(
    targetLeft,
    targetRight,
    target.width,
  );
  const sourceWidths = [
    HORIZONTAL_JOINT_SOURCE.left,
    HORIZONTAL_JOINT_SOURCE.width -
      HORIZONTAL_JOINT_SOURCE.left -
      HORIZONTAL_JOINT_SOURCE.right,
    HORIZONTAL_JOINT_SOURCE.right,
  ];
  const sourceXs = [
    0,
    HORIZONTAL_JOINT_SOURCE.left,
    HORIZONTAL_JOINT_SOURCE.width - HORIZONTAL_JOINT_SOURCE.right,
  ];
  const targetWidths = [
    fittedLeft,
    target.width - fittedLeft - fittedRight,
    fittedRight,
  ];
  const targetXs = [
    target.x,
    target.x + fittedLeft,
    target.x + target.width - fittedRight,
  ];

  return (
    <>
      {[0, 1, 2].map((index) => (
        <CroppedImage
          key={index}
          href={href}
          source={{
            x: sourceXs[index],
            y: 0,
            width: sourceWidths[index],
            height: HORIZONTAL_JOINT_SOURCE.height,
          }}
          target={{
            x: targetXs[index],
            y: target.y,
            width: targetWidths[index],
            height: target.height,
          }}
          sourceImageWidth={HORIZONTAL_JOINT_SOURCE.width}
          sourceImageHeight={HORIZONTAL_JOINT_SOURCE.height}
          slice={`horizontal-${index}`}
        />
      ))}
    </>
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
  const attachment = requestedAttachment;
  const frameColor = normalizeFrameColor(frameColorHex);
  const namespace = safeId(`${idNamespace ?? "ae-window-wall"}-${reactId}`);
  const sourceMarkFilterId = `${namespace}-remove-source-mark`;
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
  const glassInsetTop =
    (attachment === "RIGHT"
      ? RIGHT_ATTACHMENT_GLASS_INSET_TOP_PX
      : PANEL_SOURCE.glassInsetTopPx) * profilePixelScale;
  const glassInsetBottom =
    (attachment === "RIGHT"
      ? RIGHT_ATTACHMENT_GLASS_INSET_BOTTOM_PX
      : PANEL_SOURCE.glassInsetBottomPx) * profilePixelScale;
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
        <filter id={sourceMarkFilterId} colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values={`
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              2 -1 -1 0 -0.25
            `}
            result="redMark"
          />
          <feMorphology
            in="redMark"
            operator="dilate"
            radius="8"
            result="sourceMarkArea"
          />
          <feGaussianBlur
            in="sourceMarkArea"
            stdDeviation="2"
            result="sourceMarkAreaFeathered"
          />
          <feComposite
            in="SourceGraphic"
            in2="sourceMarkAreaFeathered"
            operator="out"
            result="sourceWithoutMark"
          />
          <feOffset
            in="SourceGraphic"
            dx="0"
            dy="120"
            result="cleanGlassAtMark"
          />
          <feComposite
            in="cleanGlassAtMark"
            in2="sourceMarkAreaFeathered"
            operator="in"
            result="markReplacement"
          />
          <feMerge>
            <feMergeNode in="sourceWithoutMark" />
            <feMergeNode in="markReplacement" />
          </feMerge>
        </filter>
      </defs>

      <g data-layer="WINDOW_WALL_APPROVED_PANEL_SOURCES">
        {panels.map((panel) => {
          const sourceAttachment: WindowWallAttachment =
            attachment === "LEFT" && panel.index === 0
              ? "LEFT"
              : attachment === "RIGHT" &&
                  panel.index === resolvedPanelCount - 1
                ? "RIGHT"
                : "NONE";
          const sourceAsset = joinAssetPath(
            assetBasePath,
            sourceAttachment === "LEFT"
              ? ASSETS.leftAttachment
              : sourceAttachment === "RIGHT"
                ? ASSETS.rightAttachment
                : ASSETS.panel,
          );

          return (
            <SourcePanel
              key={`source-panel-${panel.index}`}
              href={sourceAsset}
              frame={panel.frame}
              attachment={sourceAttachment}
              profilePixelScale={profilePixelScale}
              showOuterLeft={panel.index === 0}
              showOuterRight={panel.index === resolvedPanelCount - 1}
              sourceFilterId={sourceMarkFilterId}
            />
          );
        })}
      </g>

      {/* El PNG ya contiene el vidrio base; aquí solo van efectos transparentes. */}
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
            <g
              key={`internal-joint-${panel.index}`}
              data-internal-attachment="RIGHT"
            >
              <VerticalProfile
                href={internalJointAsset}
                target={{
                  x: boundaryX - jointWidth / 2,
                  y: frame.y,
                  width: jointWidth,
                  height: frame.height,
                }}
                targetTop={frame.height * INTERNAL_JOINT_CAP_RATIO}
                targetBottom={frame.height * INTERNAL_JOINT_CAP_RATIO}
              />
            </g>
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
          const leftSourceEnd = boundaryX - glassInsetRight;
          const leftJointEdge = boundaryX - jointWidth / 2;
          const rightJointEdge = boundaryX + jointWidth / 2;
          const rightSourceStart = nextPanel.frame.x + glassInsetLeft;

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
              <g
                key={`horizontal-${panel.index}-${horizontalHeight}-${index}`}
                data-horizontal-height={horizontalHeight}
              >
                <HorizontalProfile
                  href={horizontalJointAsset}
                  target={{
                    x: panel.frame.x,
                    y: centerY - horizontalJointHeight / 2,
                    width: panel.frame.width,
                    height: horizontalJointHeight,
                  }}
                  targetLeft={
                    panel.index === 0
                      ? exteriorGlassInsetLeft
                      : glassInsetLeft
                  }
                  targetRight={
                    panel.index === resolvedPanelCount - 1
                      ? exteriorGlassInsetRight
                      : glassInsetRight
                  }
                />
              </g>
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
