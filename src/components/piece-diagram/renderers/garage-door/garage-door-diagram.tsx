import React, { useId } from "react";

import {
  DEFAULT_GARAGE_SLAT_COLOR,
  validateGarageDesignTemplate,
  type GarageDesignMaterial,
} from "@/lib/garage-design-templates";
import { DIMENSION_COLOR, expandedViewBox } from "../dimension-style";
import { DimensionText, VerticalDimensionText, VERTICAL_DIMENSION_RESERVE_PX } from "../dimension-text";
import { GlassAppearanceLayer, type GlassOverlayRect } from "../glass-appearance";
import { garageSectionLayout } from "./garage-door-layout";

export interface GarageDoorDiagramProps {
  width: number;
  height: number;
  maxSectionHeightIn?: number | null;
  template?: unknown;
  designName?: string | null;
  designColorHex?: string | null;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  className?: string;
}

type Cell = GlassOverlayRect & {
  row: number;
  column: number;
  material: GarageDesignMaterial;
};

function colorOr(value: string | null | undefined, fallback: string): string {
  const color = value?.trim();
  return color && /^#[\da-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  return `#${[1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value + (target - value) * Math.abs(amount)).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
}

function formatDimension(value: number): string {
  return `${Number(value.toFixed(3))}\u2033`;
}

/** A dimensional product drawing; the catalog thumbnails remain independent. */
export function GarageDoorDiagram({
  width,
  height,
  maxSectionHeightIn,
  template,
  designName,
  designColorHex,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  showDimensions = true,
  className,
}: GarageDoorDiagramProps) {
  const reactId = useId();
  const id = `garage-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

  const design = validateGarageDesignTemplate(template);
  const sectionCount = maxSectionHeightIn == null ? undefined : Math.ceil(height / maxSectionHeightIn);
  if (maxSectionHeightIn != null && (!Number.isFinite(maxSectionHeightIn) || maxSectionHeightIn <= 0
    || !Number.isInteger(sectionCount) || sectionCount! < 1 || sectionCount! > 120)) return null;
  // The system controls physical section height; the database template
  // supplies the material layout independently of the selector's row count.
  const layout = garageSectionLayout(design, sectionCount);
  const { columns, rows } = layout;
  const slatColor = colorOr(designColorHex, DEFAULT_GARAGE_SLAT_COLOR);
  const frameColor = design ? slatColor : colorOr(frameColorHex, "#FFFFFF");
  const scale = 1000 / Math.max(width, height);
  const doorWidth = width * scale;
  const doorHeight = height * scale;
  const frame = Math.min(1.2 * scale, Math.min(doorWidth, doorHeight) * 0.035);
  // The side jambs and header surround the door; there is no bottom frame rail.
  const body = { x: frame, y: frame, width: doorWidth - 2 * frame, height: doorHeight - frame };
  const slatPitch = Math.max(5, Math.min(25, 1.65 * scale));
  const joint = Math.max(0.7, Math.min(2.2, scale * 0.16));
  const movementLength = Math.min(45, body.width * 0.12, body.height * 0.12);
  const movementHead = Math.min(7, movementLength * 0.2);
  const cells: Cell[] = [];
  const seams: number[] = [];
  let y = body.y;
  rows.forEach((part, row) => {
    const cellHeight = part * body.height;
    let x = body.x;
    columns.forEach((columnPart, column) => {
      const cellWidth = columnPart * body.width;
      cells.push({ x, y, width: cellWidth, height: cellHeight, row: row + 1, column: column + 1, material: layout.cells[row][column] });
      x += cellWidth;
    });
    y += cellHeight;
    if (row < rows.length - 1) seams.push(y);
  });
  const glassRects = cells.filter(cell => cell.material === "glass").map(({ x, y, width: cellWidth, height: cellHeight }) => ({ x, y, width: cellWidth, height: cellHeight }));
  const label = design ? designName?.trim() || "Garage door design" : "GF — Garage door without design";
  const viewBox = expandedViewBox({ x: 0, y: 0, width: doorWidth, height: doorHeight }, showDimensions
    ? { top: 78, right: 115, bottom: 20, left: 20 }
    : { top: 10, right: 10, bottom: 10, left: 10 });
  const url = (suffix: string) => `url(#${id}-${suffix})`;

  return <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={viewBox}
    overflow="visible" style={{ boxSizing: "border-box", paddingTop: showDimensions ? 20 : undefined, paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined }}
    preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title`} className={className}
    data-authentic-evolution-family="GARAGE_DOOR" data-garage-mode={design ? "DESIGN" : "GF"}
    data-frame-color={frameColor} data-slat-color={design ? slatColor : undefined}
    data-width={width} data-height={height} data-section-count={rows.length} data-view="EXTERIOR">
    <title id={`${id}-title`}>{label}</title>
    <defs>
      <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={shade(frameColor, 0.18)} />
        <stop offset="0.48" stopColor={frameColor} />
        <stop offset="1" stopColor={shade(frameColor, -0.35)} />
      </linearGradient>
      <linearGradient id={`${id}-slat-face`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={shade(slatColor, -0.34)} />
        <stop offset="0.09" stopColor={shade(slatColor, 0.14)} />
        <stop offset="0.24" stopColor={shade(slatColor, 0.06)} />
        <stop offset="0.75" stopColor={slatColor} />
        <stop offset="0.91" stopColor={shade(slatColor, -0.14)} />
        <stop offset="1" stopColor={shade(slatColor, -0.43)} />
      </linearGradient>
      <pattern id={`${id}-slats`} width={slatPitch} height={128} patternUnits="userSpaceOnUse" x={body.x} y={body.y}>
        <rect width={slatPitch} height={128} fill={url("slat-face")} />
        <path d={`M0 0 V128`} stroke={shade(slatColor, -0.65)} strokeWidth={slatPitch * 0.055} />
        <path d={`M${slatPitch * 0.115} 0 V128`} stroke={shade(slatColor, 0.3)} strokeOpacity={0.7} strokeWidth={slatPitch * 0.035} />
        <path d={`M${slatPitch * 0.45} 0 C${slatPitch * 0.36} 34 ${slatPitch * 0.57} 76 ${slatPitch * 0.44} 128 M${slatPitch * 0.65} 0 V128`}
          fill="none" stroke={shade(slatColor, -0.6)} strokeOpacity={0.08} strokeWidth={0.55} />
      </pattern>
      <linearGradient id={`${id}-section-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} />
        <stop offset="0.08" stopColor="#FFFFFF" stopOpacity={0.01} />
        <stop offset="0.88" stopColor="#000000" stopOpacity={0.035} />
        <stop offset="1" stopColor="#000000" stopOpacity={0.14} />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stopColor="#E8F0F3" />
        <stop offset="0.43" stopColor="#CFDDE3" />
        <stop offset="1" stopColor="#B8CBD3" />
      </linearGradient>
      <linearGradient id={`${id}-reflection`} x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.02} />
        <stop offset="0.25" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.08 : 0.38} />
        <stop offset="0.53" stopColor="#FFFFFF" stopOpacity={0.01} />
        <stop offset="0.83" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.04 : 0.17} />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id={`${id}-edge-shadow`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000000" stopOpacity={0.35} />
        <stop offset="1" stopColor="#000000" stopOpacity={0} />
      </linearGradient>
    </defs>
    <path d={`M0 ${doorHeight} V0 H${doorWidth} V${doorHeight} H${doorWidth - frame} V${frame} H${frame} V${doorHeight} Z`}
      fill={url("frame")} stroke={shade(frameColor, -0.45)} strokeWidth={1.1} data-layer="FRAME_FINISH" />
    <rect {...body} fill="#263139" />
    <g data-layer="SECTION_PANELS">
      {cells.map(cell => <g key={`${cell.row}-${cell.column}`} data-row={cell.row} data-column={cell.column} data-material={cell.material}>
        <rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} fill={url(cell.material === "slat" ? "slats" : "glass")} data-panel-face="true" />
        <rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} fill={url("section-shade")} />
      </g>)}
    </g>
    <GlassAppearanceLayer rects={glassRects} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} />
    <g data-layer="GLASS_REFLECTIONS" pointerEvents="none">
      {glassRects.map((rect, index) => <rect key={index} {...rect} fill={url("reflection")} />)}
    </g>
    <g data-layer="PANEL_JOINTS" pointerEvents="none">
      {cells.filter(cell => cell.column > 1).map(cell => <g key={`${cell.row}-${cell.column}`}>
        <path d={`M${cell.x} ${cell.y} v${cell.height}`} stroke="#172026" strokeOpacity={0.55} strokeWidth={joint} />
        <path d={`M${cell.x + joint} ${cell.y} v${cell.height}`} stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={joint * 0.5} />
      </g>)}
      {seams.map(seam => <g key={seam}>
        <path d={`M${body.x} ${seam} h${body.width}`} stroke="#172026" strokeOpacity={0.8} strokeWidth={joint * 1.5} />
        <path d={`M${body.x} ${seam + joint} h${body.width}`} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={joint * 0.55} />
      </g>)}
    </g>
    <path d={`M${body.x} ${doorHeight} V${body.y} H${body.x + body.width} V${doorHeight}`}
      fill="none" stroke="#101820" strokeOpacity={0.5} strokeWidth={joint * 1.6} data-layer="FRAME_GASKET" />
    <rect x={body.x} y={body.y} width={body.width} height={Math.min(frame * 1.4, body.height)} fill={url("edge-shadow")} />
    <path d={`M1 ${doorHeight - 1} V1 H${doorWidth - 1}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} />
    <path d={`M${frame * 0.48} ${doorHeight - frame * 0.48} V${frame * 0.48} H${doorWidth - frame * 0.48} V${doorHeight - frame * 0.48}`}
      fill="none" stroke={shade(frameColor, -0.25)} strokeWidth={Math.max(0.6, frame * 0.08)} />
    <g data-layer="UPWARD_MOVEMENT" stroke="#CE3030" strokeWidth={2.3} fill="none" pointerEvents="none">
      <path d={`M${doorWidth / 2} ${doorHeight / 2 + movementLength / 2} v${-movementLength} m${-movementHead} ${movementHead} l${movementHead} ${-movementHead} l${movementHead} ${movementHead}`} />
    </g>
    {showDimensions ? <g data-dimensions="VISIBLE" fill="none" stroke={DIMENSION_COLOR} strokeWidth={1.3}>
      <path d={`M0 -9 V-47 M${doorWidth} -9 V-47 M0 -36 H${doorWidth} M${doorWidth + 9} 0 H${doorWidth + 47} M${doorWidth + 9} ${doorHeight} H${doorWidth + 47} M${doorWidth + 36} 0 V${doorHeight}`} />
      <path d={`M0 -36 l8 -3 v6 z M${doorWidth} -36 l-8 -3 v6 z M${doorWidth + 36} 0 l-3 8 h6 z M${doorWidth + 36} ${doorHeight} l-3 -8 h6 z`} fill={DIMENSION_COLOR} stroke="none" />
      <DimensionText x={doorWidth / 2} y={-49} textAnchor="middle" fallbackFontSize={26}>{`F.W. ${formatDimension(width)}`}</DimensionText>
      <VerticalDimensionText x={doorWidth + 36} y={doorHeight / 2} fallbackFontSize={26}>{`F.H. ${formatDimension(height)}`}</VerticalDimensionText>
    </g> : null}
  </svg>;
}
