import React from "react";
import { GlassAppearanceLayer } from "../glass-appearance";
import { matchMuntinPanels, type ResolvedMuntin } from "../muntin-layer";
import { pivotPolygon, pivotQuadPath, pivotQuadPoint, type PivotDoorLayout } from "./pivot-door-layout";

function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  return `#${[1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value + (target - value) * Math.abs(amount)).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
}

function ProjectedMuntin({ muntin, layout, color, id }: {
  muntin?: ResolvedMuntin | null; layout: PivotDoorLayout; color: string; id: string;
}) {
  if (!muntin || !["flat", "ogee"].includes(muntin.profile)) return null;
  const matched = matchMuntinPanels(muntin, [{ panelIndex: 1, panelCode: "X", panelLabel: "Center", rect: layout.glassBounds }]);
  if (matched.length !== 1) return null;
  const panel = matched[0].panel;
  const h = panel.horizontalLites;
  const v = panel.verticalLites;
  const paneWidth = layout.glass.tr.x - layout.glass.tl.x;
  const paneHeight = (layout.glass.bl.y + layout.glass.br.y - layout.glass.tl.y - layout.glass.tr.y) / 2;
  const projectedInch = layout.unitsPerInch * (460 / 548);
  if (![h, v].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 64)
    || (h > 1 && paneWidth / h <= projectedInch) || (v > 1 && paneHeight / v <= layout.unitsPerInch)) return null;
  const stops = muntin.profile === "ogee"
    ? [[0, -0.32], [0.13, -0.1], [0.3, 0.35], [0.48, 0.15], [0.7, -0.04], [0.9, -0.2], [1, -0.32]]
    : [[0, -0.2], [0.1, 0], [0.9, 0], [1, -0.2]];
  const bar = (u1: number, v1: number, u2: number, v2: number) => pivotPolygon([
    pivotQuadPoint(layout.glass, u1, v1), pivotQuadPoint(layout.glass, u2, v1),
    pivotQuadPoint(layout.glass, u2, v2), pivotQuadPoint(layout.glass, u1, v2),
  ]);
  return <g data-part="muntin-layer" data-muntin-profile={muntin.profile} pointerEvents="none" clipPath={`url(#${id}-glass-clip)`}>
    <defs>{(["vertical", "horizontal"] as const).map(axis => <linearGradient key={axis} id={`${id}-muntin-${axis}`} x1="0" y1="0" x2={axis === "vertical" ? "1" : "0"} y2={axis === "horizontal" ? "1" : "0"}>
      {stops.map(([offset, amount]) => <stop key={offset} offset={offset} stopColor={shade(color, amount)} />)}
    </linearGradient>)}</defs>
    <g data-part="muntin-panel" data-panel-index={panel.panelIndex} data-horizontal-lites={h} data-vertical-lites={v}>
      {Array.from({ length: h - 1 }, (_, index) => {
        const u = (index + 1) / h; const half = projectedInch / paneWidth / 2;
        return <path key={`v-${index}`} data-part="muntin-bar" data-axis="vertical" d={bar(u - half, 0, u + half, 1)} fill={`url(#${id}-muntin-vertical)`} />;
      })}
      {Array.from({ length: v - 1 }, (_, index) => {
        const fraction = (index + 1) / v; const half = layout.unitsPerInch / paneHeight / 2;
        return <path key={`h-${index}`} data-part="muntin-bar" data-axis="horizontal" d={bar(0, fraction - half, 1, fraction + half)} fill={`url(#${id}-muntin-horizontal)`} />;
      })}
    </g>
  </g>;
}

/** Shared approved outward leaf; all assembly placement stays outside this component. */
export function PivotDoorLeafArtwork({ layout, color, id, glassTintHex, hasCoating = false, hasPrivacy = false, muntin }: {
  layout: PivotDoorLayout; color: string; id: string; glassTintHex?: string | null;
  hasCoating?: boolean; hasPrivacy?: boolean; muntin?: ResolvedMuntin | null;
}) {
  const { leaf, glass, glassBounds, handle, profileScale: p, sx, sy } = layout;
  const finish = (reference: string, amount: number) => color === "#FFFFFF" ? reference : shade(color, amount);
  const url = (suffix: string) => `url(#${id}-${suffix})`;
  const glassPath = pivotQuadPath(glass);
  const leafPath = pivotQuadPath(leaf);
  const rightBackTop = { x: leaf.tr.x + 9 * sx, y: leaf.tr.y + 15 * sy };
  const rightBackBottom = { x: leaf.br.x + 9 * sx, y: leaf.br.y - 13 * sy };
  const leafWidth = leaf.tr.x - leaf.tl.x;
  const point = (u: number, v: number) => pivotQuadPoint(leaf, u, v);
  const insetLeft = 2 * sx / leafWidth;
  const insetRight = 1 - insetLeft;
  const highlightLeftTop = point(insetLeft, 0.0018);
  const highlightLeftBottom = point(insetLeft, 0.998);
  const highlightRightTop = point(insetRight, 0.0025);
  const highlightRightBottom = point(insetRight, 0.997);
  const mountLine = (fraction: number, endInset: number, highlight = false) => {
    const startX = handle.x + handle.width / 2 + (highlight ? 1.8 : 0.8) * sx;
    const startY = handle.y + handle.height * fraction - (highlight ? 2.1 * sy : 0);
    const u = (startX - leaf.tl.x) / leafWidth;
    const top = point(u, 0).y; const bottom = point(u, 1).y;
    const end = point((leafWidth - endInset * sx) / leafWidth, (startY - top) / (bottom - top));
    return `M${startX} ${startY}L${end.x} ${end.y}`;
  };
  const marker = pivotQuadPoint(glass, 0.5, 0.5);
  const xSize = 10 * sx; const ySize = 13 * sy;
  return <>
    <defs>
      <linearGradient id={`${id}-leaf-finish`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={finish("#F2F4F2", 0.12)} /><stop offset="0.62" stopColor={finish("#F0F2F0", 0)} /><stop offset="1" stopColor={finish("#ECEFED", -0.07)} />
      </linearGradient>
      <linearGradient id={`${id}-leaf-edge`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={finish("#A6B2B4", -0.3)} /><stop offset="0.42" stopColor={finish("#D0D7D7", -0.12)} /><stop offset="1" stopColor={finish("#6D8288", -0.46)} />
      </linearGradient>
      <linearGradient id={`${id}-glass-fill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E5E5E7" /><stop offset="0.4" stopColor="#E1E1E3" /><stop offset="1" stopColor="#DDDFE0" /></linearGradient>
      <linearGradient id={`${id}-glass-reflection`} x1="0" y1="0.18" x2="1" y2="0.38"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.02" /><stop offset="0.2" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.05 : 0.21} /><stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.025" /><stop offset="0.73" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.025 : 0.1} /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0.015" /></linearGradient>
      <linearGradient id={`${id}-handle-metal`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7C8C92" /><stop offset="0.22" stopColor="#CDD6D8" /><stop offset="0.42" stopColor="#F1F4F4" /><stop offset="0.66" stopColor="#C3CDD0" /><stop offset="1" stopColor="#77898F" /></linearGradient>
      <filter id={`${id}-leaf-shadow`} x="-7%" y="-3%" width="117%" height="109%" colorInterpolationFilters="sRGB"><feDropShadow dx={3 * sx} dy={9 * sy} stdDeviation={5 * p} floodColor="#142B33" floodOpacity="0.23" /></filter>
      <filter id={`${id}-hardware-shadow`} x="-40%" y="-5%" width="190%" height="112%" colorInterpolationFilters="sRGB"><feDropShadow dx={2 * sx} dy={3 * sy} stdDeviation={1.8 * p} floodColor="#19313B" floodOpacity="0.3" /></filter>
      <clipPath id={`${id}-glass-clip`}><path d={glassPath} /></clipPath>
    </defs>
    <g data-layer="OPEN_LEAF" data-material="frame">
      <path d={pivotPolygon([leaf.tl, leaf.tr, rightBackTop, rightBackBottom, leaf.br, leaf.bl])} fill={finish("#E9EDEB", -0.08)} filter={url("leaf-shadow")} />
      <path d={pivotPolygon([leaf.tr, rightBackTop, rightBackBottom, leaf.br])} fill={url("leaf-edge")} stroke={finish("#627980", -0.48)} strokeWidth={1.2*p} />
      <path d={`M${leaf.tr.x+4*sx} ${leaf.tr.y+8*sy}V${leaf.br.y-7*sy}`} fill="none" stroke={finish("#EFF3F2", 0.2)} strokeOpacity="0.6" strokeWidth={p} />
      <path d={leafPath} fill={url("leaf-finish")} stroke={finish("#98A5A7", -0.32)} strokeWidth={1.8*p} data-part="pivot-door-leaf" data-opening-direction="OUTWARD" />
      <path d={`M${highlightLeftBottom.x} ${highlightLeftBottom.y}L${highlightLeftTop.x} ${highlightLeftTop.y}L${highlightRightTop.x} ${highlightRightTop.y}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.66" strokeWidth={1.1*p} />
      <path d={`M${highlightRightTop.x} ${highlightRightTop.y}L${highlightRightBottom.x} ${highlightRightBottom.y}L${highlightLeftBottom.x} ${highlightLeftBottom.y}`} fill="none" stroke={finish("#CBD2D1", -0.15)} strokeWidth={1.1*p} />
      <g data-layer="GLASS" data-material="glass"><path d={glassPath} fill={url("glass-fill")} data-part="pivot-glass" data-panel-code="X" /></g>
      <g clipPath={url("glass-clip")}><GlassAppearanceLayer rects={[glassBounds]} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} /></g>
      <g data-layer="GLASS_REFLECTIONS" clipPath={url("glass-clip")} pointerEvents="none"><path d={glassPath} fill={url("glass-reflection")} /><path d={`M${glass.tl.x+2*sx} ${glass.tl.y+2*sy}L${glass.tr.x-2*sx} ${glass.tr.y+2*sy}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.23" strokeWidth={2*p} /></g>
      <ProjectedMuntin muntin={muntin} layout={layout} color={color} id={id} />
      <path d={glassPath} fill="none" stroke={finish("#46545A", -0.63)} strokeWidth={1.8*p} data-part="glass-gasket" />
    </g>
    <g data-layer="PULL_HANDLE" data-material="hardware" filter={url("hardware-shadow")}>
      <g fill="none" strokeLinecap="round">
        {[0.092965, 0.50298, 0.91506].map((fraction, index) => <React.Fragment key={index}><path d={mountLine(fraction, 24)} stroke="#8B9BA1" strokeWidth={10*p} /><path d={mountLine(fraction, 25, true)} stroke="#E1E7E8" strokeWidth={2.9*p} /></React.Fragment>)}
        <path d={mountLine(0.68167, 38)} stroke="#899AA0" strokeWidth={8.3*p} data-part="short-lever" /><path d={mountLine(0.68167, 39, true)} stroke="#DFE6E7" strokeWidth={2.3*p} />
      </g>
      <rect x={handle.x} y={handle.y} width={handle.width} height={handle.height} rx={handle.radius} fill={url("handle-metal")} stroke="#576C76" strokeWidth={1.5*p} data-part="pivot-pull-bar" />
      <path d={`M${handle.x+4.6*sx} ${handle.y+5*sy}V${handle.y+handle.height-5.3*sy}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.54" strokeWidth={1.2*p} strokeLinecap="round" />
    </g>
    <g data-layer="CONFIGURATION_MARKER" data-configuration="X" fill="none" stroke="#D51028" strokeWidth={3.5*p} strokeLinecap="round"><path d={`M${marker.x-xSize} ${marker.y-ySize}L${marker.x+xSize} ${marker.y+ySize}M${marker.x+xSize} ${marker.y-ySize}L${marker.x-xSize} ${marker.y+ySize}`} /></g>
  </>;
}
