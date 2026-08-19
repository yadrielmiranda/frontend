import React from "react";

import { normalizeMovementIndicatorColor } from "./movement-indicators";

export interface HorizontalRollingScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HorizontalRollingScreenPanelGeometry {
  outer: HorizontalRollingScreenRect;
  mesh: HorizontalRollingScreenRect;
  scaleX: number;
  scaleY: number;
}

const SCREEN_THREAD_COLOR = "#000000";
const SCREEN_PATTERN_PX = 7;
const SCREEN_STROKE_PX = 1;
const SCREEN_OPACITY = 0.34;

function hexToRgb(input: string): { r: number; g: number; b: number } {
  const value = normalizeMovementIndicatorColor(input);
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase();
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

function multiplyHex(left: string, right: string): string {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  return rgbToHex({
    r: (a.r * b.r) / 255,
    g: (a.g * b.g) / 255,
    b: (a.b * b.b) / 255,
  });
}

function screenFramePalette(frameColorHex: string) {
  const requested = normalizeMovementIndicatorColor(frameColorHex);
  return {
    requested,
    base: multiplyHex("#ECECEA", requested),
    highlight: multiplyHex("#EDEDEB", requested),
    mid: multiplyHex("#EBEAE8", requested),
    shadow: mixHex(requested, "#000000", 0.28),
    edge: mixHex(requested, "#000000", 0.38),
  };
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "") || "ae-hr-screen";
}

function screenRing(
  outer: HorizontalRollingScreenRect,
  mesh: HorizontalRollingScreenRect,
): string {
  return [
    `M ${outer.x} ${outer.y}`,
    `H ${outer.x + outer.width}`,
    `V ${outer.y + outer.height}`,
    `H ${outer.x}`,
    "Z",
    `M ${mesh.x} ${mesh.y}`,
    `H ${mesh.x + mesh.width}`,
    `V ${mesh.y + mesh.height}`,
    `H ${mesh.x}`,
    "Z",
  ].join(" ");
}

/**
 * Draws the same procedural screen material used by Single Hung. The layer is
 * created only for X panels, so no screen PNG is required.
 */
export function HorizontalRollingScreenLayer({
  panels,
  frameColorHex,
  idNamespace,
}: {
  panels: readonly HorizontalRollingScreenPanelGeometry[];
  frameColorHex: string;
  idNamespace: string;
}): React.ReactElement {
  const colors = screenFramePalette(frameColorHex);
  const prefix = safeId(idNamespace);
  const patternId = `${prefix}-mesh`;
  const gradientId = `${prefix}-frame`;

  return (
    <g
      data-layer="SCREEN"
      data-screen="ON"
      data-screen-layer-order="ABOVE_INDICATORS"
      data-screen-source="PROCEDURAL_SVG_SINGLE_HUNG"
      data-frame-color={colors.requested}
      data-screen-frame-color={colors.base}
    >
      <defs>
        <pattern
          id={patternId}
          width={SCREEN_PATTERN_PX}
          height={SCREEN_PATTERN_PX}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 3.5 H 7 M 3.5 0 V 7"
            fill="none"
            stroke={SCREEN_THREAD_COLOR}
            strokeWidth={SCREEN_STROKE_PX}
            strokeOpacity={SCREEN_OPACITY}
            shapeRendering="crispEdges"
          />
        </pattern>
        <linearGradient id={gradientId} x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor={colors.highlight} />
          <stop offset="48%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.base} />
        </linearGradient>
        {panels.map((panel, index) => (
          <clipPath id={`${prefix}-panel-${index}-clip`} key={`clip-${index}`}>
            <rect {...panel.outer} />
          </clipPath>
        ))}
      </defs>

      {panels.map((panel, index) => {
        const { outer, mesh, scaleX, scaleY } = panel;
        const outerRight = outer.x + outer.width;
        const outerBottom = outer.y + outer.height;
        const latchY = outerBottom - 22 * scaleY;
        const strokeScale = Math.min(scaleX, scaleY);

        return (
          <g
            key={`screen-${index}`}
            clipPath={`url(#${prefix}-panel-${index}-clip)`}
            data-screen-panel={index}
            data-screen-panel-role="X_ONLY"
            data-screen-style="SINGLE_HUNG_FINE_MESH_FULL_WIDTH_THIN_EQUAL_RAILS"
          >
            <rect
              {...mesh}
              fill={`url(#${patternId})`}
              data-screen-part="MESH"
              data-screen-thread-color={SCREEN_THREAD_COLOR}
              data-screen-pattern-px={SCREEN_PATTERN_PX}
              data-screen-opacity={SCREEN_OPACITY}
            />
            <path
              d={screenRing(outer, mesh)}
              fill={`url(#${gradientId})`}
              fillRule="evenodd"
              clipRule="evenodd"
              data-screen-part="FRAME_FULL_WIDTH_THIN_EQUAL_RAILS"
            />
            <rect
              x={outer.x + scaleX}
              y={outer.y + scaleY}
              width={outer.width - 2 * scaleX}
              height={outer.height - 2 * scaleY}
              fill="none"
              stroke={colors.edge}
              strokeWidth={2 * strokeScale}
              opacity={0.62}
            />
            <rect
              {...mesh}
              fill="none"
              stroke={colors.shadow}
              strokeWidth={2 * strokeScale}
              opacity={0.72}
            />
            <g
              fill={`url(#${gradientId})`}
              stroke={colors.edge}
              strokeWidth={strokeScale}
              data-screen-part="LATCHES"
            >
              <path
                d={`M ${outer.x + 18 * scaleX} ${latchY} h ${24 * scaleX} v ${10 * scaleY} h ${-7 * scaleX} v ${-4 * scaleY} h ${-17 * scaleX} z`}
              />
              <path
                d={`M ${outerRight - 42 * scaleX} ${latchY} h ${24 * scaleX} v ${10 * scaleY} h ${-17 * scaleX} v ${4 * scaleY} h ${-7 * scaleX} z`}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
