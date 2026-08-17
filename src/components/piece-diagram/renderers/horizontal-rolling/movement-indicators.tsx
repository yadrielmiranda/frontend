// Authentic Evolution movement indicators — C057 FINAL.
// Approved visual source: C056_REVIEW; runtime baseline: C042 FINAL.
// Vector-only layer. It never mutates product masters, glass, frame, hardware,
// dimensions, pricing, or manufacturing rules.
import React from "react";

export type MovementIndicatorHingeSide = "left" | "right";
export type MovementIndicatorRole =
  | "OPERABLE"
  | "ACTIVE"
  | "SECONDARY"
  | "FIXED";

export interface MovementIndicatorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Serie600MovementPanel =
  | {
      kind: "O";
      glass: MovementIndicatorRect;
      role?: "FIXED";
      /** C056 standalone O reference. Mixed assemblies infer size from X. */
      standaloneReferenceWidth?: number;
    }
  | {
      kind: "X";
      glass: MovementIndicatorRect;
      hingeSide: MovementIndicatorHingeSide;
      role?: Exclude<MovementIndicatorRole, "FIXED">;
      /** Defaults to true. Secondary leaves must set this to false. */
      showArrow?: boolean;
    };

export interface Serie600MovementIndicatorsProps {
  panels: readonly Serie600MovementPanel[];
  movementIndicatorColor?: string;
  idNamespace?: string;
}

export type HorizontalRollerMovementPanel =
  | {
      kind: "O";
      glass: MovementIndicatorRect;
    }
  | {
      kind: "X";
      glass: MovementIndicatorRect;
      /** Physical side before an optional outer mirror transform. */
      side: "left" | "right";
    };

export interface HorizontalRollerMovementIndicatorsProps {
  panels: readonly HorizontalRollerMovementPanel[];
  centerY: number;
  movementIndicatorColor?: string;
  idNamespace?: string;
  /** Inverts only semantic direction metadata when an outer group mirrors geometry. */
  mirrorDirectionMetadata?: boolean;
}

export const DEFAULT_MOVEMENT_INDICATOR_COLOR = "#C6020C";
export const SOFT_BLACK_SCREEN_THREAD_COLOR = "#000000";

const ARROW = Object.freeze({
  referenceGlassWidth: 604,
  triangleLength: 31,
  triangleHalfBase: 22,
  mainStroke: 7,
  shadowStroke: 9,
  shadowTriangleStroke: 2,
  triangleOutline: 1.25,
  specularLine: 1.15,
  specularTriangle: 0.9,
  shadowOffsetX: 2,
  shadowOffsetY: 3,
  specularOffsetX: -0.85,
  specularOffsetY: -0.85,
  shadowBlur: 2.2,
  specularBlur: 0.3,
});

const DOOR = Object.freeze({
  labelReferenceGlassWidth: 373,
  labelHalfWidth: 5.8,
  labelHalfHeight: 8.2,
  labelStroke: 3.2,
  labelOpacity: 0.8,
  oRadiusX: 6.6286,
  oRadiusY: 8.7655,
  standaloneOReferenceGlassWidth: 224.1675,
  arrowXToTailGap: 33,
  arrowTailToTip: 215,
  arrowLengthFactor: 0.55,
});

const HR = Object.freeze({
  labelReferenceGlassWidth: 604,
  xOffset: 116,
  xHalfWidth: 10.5,
  xHalfHeight: 14.5,
  oRadiusX: 12,
  oRadiusY: 15.5,
  arrowStartOffset: 83,
  arrowTipOffset: 132,
  labelStroke: 3.2,
  labelOpacity: 0.8,
});

type Palette = {
  base: string;
  highlight: string;
  shadow: string;
  ghost: string;
  specular: string;
};

export function normalizeMovementIndicatorColor(input: string): string {
  if (typeof input !== "string") {
    throw new Error(
      "movementIndicatorColor must be a hexadecimal color string",
    );
  }
  const value = input.trim();
  const short = value.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    return `#${short[1]
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`.toUpperCase();
  }
  const full = value.match(/^#([0-9a-fA-F]{6})$/);
  if (!full) {
    throw new Error(
      "movementIndicatorColor must use #RGB or #RRGGBB hexadecimal format",
    );
  }
  return `#${full[1].toUpperCase()}`;
}

function hexToRgb(input: string): { r: number; g: number; b: number } {
  const value = normalizeMovementIndicatorColor(input);
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
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

function palette(input: string): Palette {
  const base = normalizeMovementIndicatorColor(input);
  return {
    base,
    highlight: mixHex(base, "#FFFFFF", 0.15),
    shadow: mixHex(base, "#000000", 0.23),
    ghost: mixHex(base, "#000000", 0.34),
    specular: mixHex(base, "#FFFFFF", 0.92),
  };
}

function safeId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "");
  return normalized || "movement-c056";
}

function center(rect: MovementIndicatorRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function XGlyph({
  centerX,
  centerY,
  halfWidth,
  halfHeight,
  stroke,
  color,
  opacity,
}: {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
  stroke: number;
  color: string;
  opacity: number;
}) {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      shapeRendering="geometricPrecision"
      data-indicator-glyph="X"
    >
      <path
        d={`M ${centerX - halfWidth} ${centerY - halfHeight} L ${centerX + halfWidth} ${centerY + halfHeight}`}
      />
      <path
        d={`M ${centerX + halfWidth} ${centerY - halfHeight} L ${centerX - halfWidth} ${centerY + halfHeight}`}
      />
    </g>
  );
}

function OGlyph({
  centerX,
  centerY,
  radiusX,
  radiusY,
  stroke,
  color,
  opacity,
}: {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  stroke: number;
  color: string;
  opacity: number;
}) {
  return (
    <ellipse
      cx={centerX}
      cy={centerY}
      rx={radiusX}
      ry={radiusY}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      opacity={opacity}
      shapeRendering="geometricPrecision"
      data-indicator-glyph="O"
    />
  );
}

function Arrow({
  id,
  centerY,
  startX,
  tipX,
  scale,
  colors,
  metadataDirection,
}: {
  id: string;
  centerY: number;
  startX: number;
  tipX: number;
  scale: number;
  colors: Palette;
  metadataDirection?: "left" | "right";
}) {
  const direction = tipX > startX ? 1 : -1;
  const baseX = tipX - direction * ARROW.triangleLength * scale;
  const halfBase = ARROW.triangleHalfBase * scale;
  const linePath = `M ${startX} ${centerY} L ${baseX} ${centerY}`;
  const trianglePath = `M ${tipX} ${centerY} L ${baseX} ${centerY - halfBase} L ${baseX} ${centerY + halfBase} Z`;
  const gradientId = `${id}-gradient`;
  const shadowId = `${id}-shadow`;
  const specularId = `${id}-specular`;

  return (
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-indicator-arrow="HINGE_OR_MOVEMENT"
      data-closed-triangle="true"
      data-arrow-direction={
        metadataDirection ?? (tipX > startX ? "right" : "left")
      }
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={startX}
          y1={centerY}
          x2={tipX}
          y2={centerY}
        >
          <stop offset="0%" stopColor={colors.highlight} stopOpacity={0.72} />
          <stop offset="52%" stopColor={colors.base} stopOpacity={0.86} />
          <stop offset="100%" stopColor={colors.shadow} stopOpacity={0.96} />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-40%" width="180%" height="200%">
          <feGaussianBlur stdDeviation={ARROW.shadowBlur * scale} />
        </filter>
        <filter
          id={specularId}
          x="-30%"
          y="-40%"
          width="180%"
          height="200%"
        >
          <feGaussianBlur stdDeviation={ARROW.specularBlur * scale} />
        </filter>
      </defs>
      <g
        transform={`translate(${ARROW.shadowOffsetX * scale * direction} ${ARROW.shadowOffsetY * scale})`}
        filter={`url(#${shadowId})`}
        opacity={0.12}
      >
        <path
          d={linePath}
          stroke={colors.ghost}
          strokeWidth={ARROW.shadowStroke * scale}
        />
        <path
          d={trianglePath}
          fill={colors.ghost}
          stroke={colors.ghost}
          strokeWidth={ARROW.shadowTriangleStroke * scale}
        />
      </g>
      <path
        d={linePath}
        stroke={`url(#${gradientId})`}
        strokeWidth={ARROW.mainStroke * scale}
        opacity={0.88}
      />
      <path
        d={trianglePath}
        fill={`url(#${gradientId})`}
        stroke={colors.shadow}
        strokeWidth={ARROW.triangleOutline * scale}
        opacity={0.9}
      />
      <g
        transform={`translate(${ARROW.specularOffsetX * scale * direction} ${ARROW.specularOffsetY * scale})`}
        opacity={0.21}
        filter={`url(#${specularId})`}
      >
        <path
          d={linePath}
          stroke={colors.specular}
          strokeWidth={ARROW.specularLine * scale}
        />
        <path
          d={trianglePath}
          fill="none"
          stroke={colors.specular}
          strokeWidth={ARROW.specularTriangle * scale}
        />
      </g>
    </g>
  );
}

export function Serie600MovementIndicators({
  panels,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  idNamespace,
}: Serie600MovementIndicatorsProps): React.ReactElement {
  const reactId = React.useId();
  const rootId = safeId(`${idNamespace ?? "movement-c057"}-${reactId}`);
  const colors = palette(movementIndicatorColor);
  const xLabelScales = panels
    .filter((panel): panel is Extract<Serie600MovementPanel, { kind: "X" }> =>
      panel.kind === "X",
    )
    .map((panel) => panel.glass.width / DOOR.labelReferenceGlassWidth);
  const sharedXLabelScale =
    xLabelScales.length > 0
      ? xLabelScales.reduce((sum, value) => sum + value, 0) /
        xLabelScales.length
      : null;

  return (
    <g
      data-release="C057_FINAL"
      data-approved-visual-source="C056_REVIEW_APPROVED_BY_USER"
      data-indicator-family="SERIE_600"
      data-movement-indicator-color={colors.base}
    >
      {panels.map((panel, index) => {
        const clipId = `${rootId}-door-${index}-clip`;
        const panelCenter = center(panel.glass);
        if (panel.kind === "O") {
          const labelScale =
            sharedXLabelScale ??
            panel.glass.width /
              (panel.standaloneReferenceWidth ??
                DOOR.standaloneOReferenceGlassWidth);
          return (
            <g
              key={`${clipId}-o`}
              data-indicator-panel="O"
              data-indicator-role={panel.role ?? "FIXED"}
            >
              <defs>
                <clipPath id={clipId}>
                  <rect {...panel.glass} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId})`}>
                <OGlyph
                  centerX={panelCenter.x}
                  centerY={panelCenter.y}
                  radiusX={DOOR.oRadiusX * labelScale}
                  radiusY={DOOR.oRadiusY * labelScale}
                  stroke={DOOR.labelStroke * labelScale}
                  color={colors.base}
                  opacity={DOOR.labelOpacity}
                />
              </g>
            </g>
          );
        }

        const direction = panel.hingeSide === "right" ? 1 : -1;
        const showArrow = panel.showArrow !== false;
        const labelScale =
          panel.glass.width / DOOR.labelReferenceGlassWidth;
        const arrowScale = panel.glass.width / ARROW.referenceGlassWidth;
        const startX =
          panelCenter.x + direction * DOOR.arrowXToTailGap * arrowScale;
        const tipX =
          startX +
          direction *
            DOOR.arrowTailToTip *
            DOOR.arrowLengthFactor *
            arrowScale;
        return (
          <g
            key={`${clipId}-x`}
            data-indicator-panel="X"
            data-indicator-role={
              panel.role ?? (showArrow ? "OPERABLE" : "SECONDARY")
            }
            data-hinge-side={panel.hingeSide}
            data-show-arrow={String(showArrow)}
          >
            <defs>
              <clipPath id={clipId}>
                <rect {...panel.glass} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <XGlyph
                centerX={panelCenter.x}
                centerY={panelCenter.y}
                halfWidth={DOOR.labelHalfWidth * labelScale}
                halfHeight={DOOR.labelHalfHeight * labelScale}
                stroke={DOOR.labelStroke * labelScale}
                color={colors.base}
                opacity={DOOR.labelOpacity}
              />
              {showArrow ? (
                <Arrow
                  id={`${rootId}-door-${index}`}
                  centerY={panelCenter.y}
                  startX={startX}
                  tipX={tipX}
                  scale={arrowScale}
                  colors={colors}
                />
              ) : null}
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function HorizontalRollerMovementIndicators({
  panels,
  centerY,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  idNamespace,
  mirrorDirectionMetadata = false,
}: HorizontalRollerMovementIndicatorsProps): React.ReactElement {
  const reactId = React.useId();
  const rootId = safeId(`${idNamespace ?? "movement-c057"}-${reactId}`);
  const colors = palette(movementIndicatorColor);
  const xScales = panels
    .filter(
      (panel): panel is Extract<HorizontalRollerMovementPanel, { kind: "X" }> =>
        panel.kind === "X",
    )
    .map((panel) => panel.glass.width / HR.labelReferenceGlassWidth);
  const sharedScale =
    xScales.reduce((sum, value) => sum + value, 0) /
    Math.max(xScales.length, 1);

  return (
    <g
      data-release="C057_FINAL"
      data-approved-visual-source="C056_REVIEW_APPROVED_BY_USER"
      data-indicator-family="HORIZONTAL_ROLLER"
      data-movement-indicator-color={colors.base}
    >
      {panels.map((panel, index) => {
        const clipId = `${rootId}-hr-${index}-clip`;
        const panelCenterX = panel.glass.x + panel.glass.width / 2;
        if (panel.kind === "O") {
          return (
            <g key={`${clipId}-o`} data-indicator-panel="O">
              <defs>
                <clipPath id={clipId}>
                  <rect {...panel.glass} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId})`}>
                <OGlyph
                  centerX={panelCenterX}
                  centerY={centerY}
                  radiusX={HR.oRadiusX * sharedScale}
                  radiusY={HR.oRadiusY * sharedScale}
                  stroke={HR.labelStroke * sharedScale}
                  color={colors.base}
                  opacity={HR.labelOpacity}
                />
              </g>
            </g>
          );
        }

        const direction = panel.side === "left" ? 1 : -1;
        const physicalSide = mirrorDirectionMetadata
          ? panel.side === "left"
            ? "right"
            : "left"
          : panel.side;
        const scale = panel.glass.width / HR.labelReferenceGlassWidth;
        const xCenter = panelCenterX - direction * HR.xOffset * scale;
        const startX =
          panelCenterX - direction * HR.arrowStartOffset * scale;
        const tipX =
          panelCenterX + direction * HR.arrowTipOffset * scale;
        return (
          <g
            key={`${clipId}-x`}
            data-indicator-panel="X"
            data-panel-side={physicalSide}
          >
            <defs>
              <clipPath id={clipId}>
                <rect {...panel.glass} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <XGlyph
                centerX={xCenter}
                centerY={centerY}
                halfWidth={HR.xHalfWidth * scale}
                halfHeight={HR.xHalfHeight * scale}
                stroke={HR.labelStroke * scale}
                color={colors.base}
                opacity={HR.labelOpacity}
              />
              <Arrow
                id={`${rootId}-hr-${index}`}
                centerY={centerY}
                startX={startX}
                tipX={tipX}
                scale={scale}
                colors={colors}
                metadataDirection={
                  mirrorDirectionMetadata
                    ? direction > 0
                      ? "left"
                      : "right"
                    : direction > 0
                      ? "right"
                      : "left"
                }
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
