import React, { useId } from "react";
import { DIMENSION_COLOR, expandedViewBox } from "../dimension-style";
import { PivotDimensionText as DimensionText, PivotVerticalDimensionText as VerticalDimensionText, PIVOT_DIMENSION_RESERVE_PX as VERTICAL_DIMENSION_RESERVE_PX } from "./pivot-dimension-text";
import { GlassAppearanceLayer, type GlassOverlayRect } from "../glass-appearance";
import { MuntinLayer, type ResolvedMuntin } from "../muntin-layer";
import { pivotFixedLayout } from "./pivot-door-layout";

type FixedAppearanceProps = {
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  muntin?: ResolvedMuntin | null;
};

function safeMuntin(muntin?: ResolvedMuntin | null): ResolvedMuntin | null {
  return muntin && ["flat", "ogee"].includes(muntin.profile) && muntin.panels.length === 1
    && muntin.panels.every(panel => [panel.horizontalLites, panel.verticalLites].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 64))
    ? muntin : null;
}

/** Fixed glass is shared by standalone O and the upper light of O/X. */
export function PivotFixedPane({ rect, id, color, profileScale, unitsPerInch, panelIndex = 1, panelLabel = "Center", glassTintHex, hasCoating, hasPrivacy, muntin }: FixedAppearanceProps & {
  rect: GlassOverlayRect; id: string; color: string; profileScale: number; unitsPerInch: number;
  panelIndex?: number; panelLabel?: string;
}) {
  const url = (suffix: string) => `url(#${id}-${suffix})`;
  return <g data-part="pivot-fixed-pane" data-panel-code="O">
    <defs>
      <linearGradient id={`${id}-glass-fill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E5E5E7" /><stop offset="0.4" stopColor="#E1E1E3" /><stop offset="1" stopColor="#DDDFE0" /></linearGradient>
      <linearGradient id={`${id}-reflection`} x1="0" y1="0.18" x2="1" y2="0.38"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.02" /><stop offset="0.2" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.05 : 0.21} /><stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.025" /><stop offset="0.73" stopColor="#FFFFFF" stopOpacity={hasPrivacy ? 0.025 : 0.1} /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0.015" /></linearGradient>
      <clipPath id={`${id}-glass-clip`}><rect {...rect} /></clipPath>
    </defs>
    <g data-layer="GLASS" data-material="glass"><rect {...rect} fill={url("glass-fill")} data-part="pivot-fixed-glass" data-panel-code="O" /></g>
    <g clipPath={url("glass-clip")}>
      <GlassAppearanceLayer rects={[rect]} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} />
      <g data-layer="GLASS_REFLECTIONS" pointerEvents="none"><rect {...rect} fill={url("reflection")} /></g>
      <MuntinLayer muntin={safeMuntin(muntin)} glassPanels={[{ panelIndex, panelCode: "O", panelLabel, rect }]} frameColorHex={color} unitsPerInch={unitsPerInch} idNamespace={`${id}-fixed`} />
    </g>
    <rect {...rect} fill="none" stroke="#7C888C" strokeWidth={1.4 * profileScale} data-part="glass-gasket" />
    <g data-layer="CONFIGURATION_MARKER" data-configuration="O" fill="none" stroke="#D51028" strokeWidth={3.2 * profileScale}>
      <ellipse cx={rect.x + rect.width / 2} cy={rect.y + rect.height / 2} rx={Math.min(7.5 * profileScale, rect.width * 0.2)} ry={Math.min(16 * profileScale, rect.height * 0.2)} />
    </g>
  </g>;
}

export function PivotFixedDoorDiagram({ width, height, frameColorHex, glassTintHex, hasCoating = false, hasPrivacy = false, showDimensions = true, className, muntin }: FixedAppearanceProps & {
  width: number; height: number; showDimensions?: boolean; className?: string;
}) {
  const reactId = useId();
  const id = `pivot-fixed-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layout = pivotFixedLayout(width, height);
  if (!layout) return null;
  const { frame, glass, profileScale: p, sx, sy, unitsPerInch } = layout;
  const rawColor = frameColorHex?.trim();
  const color = rawColor && /^#[\da-f]{6}$/i.test(rawColor) ? rawColor.toUpperCase() : "#FFFFFF";
  const finish = (reference: string, amount: number) => color === "#FFFFFF" ? reference : `#${[1, 3, 5].map(start => {
    const channel = parseInt(color.slice(start, start + 2), 16);
    return Math.round(channel + ((amount < 0 ? 0 : 255) - channel) * Math.abs(amount)).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
  const fw = frame.width; const fh = frame.height; const r = 7 * Math.min(sx, sy);
  const gx = glass.x; const gy = glass.y; const gr = gx + glass.width; const gb = gy + glass.height;
  const framePath = `M${r} 0H${fw-r}Q${fw} 0 ${fw} ${r}V${fh-r}Q${fw} ${fh} ${fw-r} ${fh}H${r}Q0 ${fh} 0 ${fh-r}V${r}Q0 0 ${r} 0Z M${gx} ${gy}V${gb}H${gr}V${gy}Z`;
  const bottom = fh + 28 * p; const right = fw + 28 * p;
  const format = (value: number) => `${Number(value.toFixed(3))}\u2033`;
  const viewBox = expandedViewBox(frame, showDimensions ? { top: 20 * p, right: 70 * p, bottom: 65 * p, left: 24 * p } : { top: 16 * p, right: 27 * p, bottom: 23 * p, left: 24 * p });
  return <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="visible" role="img" aria-labelledby={`${id}-title ${id}-description`} className={className}
    style={{ boxSizing: "border-box", paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined, paddingBottom: showDimensions ? 18 : undefined }}
    data-diagram-family="PIVOT_DOOR" data-authentic-evolution-family="PIVOT_DOOR" data-configuration="O" data-view="EXTERIOR" data-width={width} data-height={height} data-frame-color={color} data-units-per-inch={unitsPerInch}>
    <title id={`${id}-title`}>Pivot Door — Fixed Configuration O</title>
    <desc id={`${id}-description`}>{`Exterior view of a fixed ${format(width)} × ${format(height)} glass panel. Dimensions describe the whole frame.`}</desc>
    <defs><linearGradient id={`${id}-frame-finish`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={finish("#F5F7F6", 0.16)} /><stop offset="0.46" stopColor={finish("#EEF1EF", 0)} /><stop offset="1" stopColor={finish("#E0E5E3", -0.16)} /></linearGradient></defs>
    <g data-part="pivot-fixed-artwork">
      <g data-layer="FRAME" data-material="frame">
        <path d={framePath} fill={`url(#${id}-frame-finish)`} fillRule="evenodd" stroke={finish("#526269", -0.56)} strokeWidth={2.1 * p} data-part="pivot-door-frame" data-width={fw} data-height={fh} />
        <path d={`M${3*sx} ${fh-6*sy}V${4*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={1.5*p} />
        <path d={`M${gx} ${3*sy}V${fh-3*sy}M${gr} ${3*sy}V${fh-3*sy}`} fill="none" stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} />
        <path d={`M${4*sx} ${fh-3*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth={1.3*p} />
      </g>
      <PivotFixedPane rect={glass} id={`${id}-pane`} color={color} profileScale={p} unitsPerInch={unitsPerInch} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={muntin} />
    </g>
    {showDimensions ? <g key={viewBox} data-dimensions="VISIBLE" fill="none" stroke={DIMENSION_COLOR} strokeWidth={1.3*p}>
      <path d={`M0 ${fh+12*p}V${bottom+11*p}M${fw} ${fh+12*p}V${bottom+11*p}M0 ${bottom}H${fw}M${fw+10*p} 0H${right+11*p}M${fw+10*p} ${fh}H${right+11*p}M${right} 0V${fh}`} />
      <path d={`M0 ${bottom}l${8*p} ${-3*p}v${6*p}z M${fw} ${bottom}l${-8*p} ${-3*p}v${6*p}z M${right} 0l${-3*p} ${8*p}h${6*p}z M${right} ${fh}l${-3*p} ${-8*p}h${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />
      <DimensionText x={fw/2} y={bottom} screenOffsetYPx={18} textAnchor="middle" fallbackFontSize={18}>{`W ${format(width)}`}</DimensionText>
      <VerticalDimensionText x={right} y={fh/2} fallbackFontSize={18}>{`H ${format(height)}`}</VerticalDimensionText>
    </g> : null}
  </svg>;
}
