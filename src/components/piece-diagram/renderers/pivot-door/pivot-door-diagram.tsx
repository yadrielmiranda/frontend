"use client";

import React, { useId, useState } from "react";

import { DIMENSION_COLOR, expandedViewBox } from "../dimension-style";
import { PivotDimensionText as DimensionText, PivotVerticalDimensionText as VerticalDimensionText, PIVOT_DIMENSION_RESERVE_PX as VERTICAL_DIMENSION_RESERVE_PX, PivotSegmentLabels } from "./pivot-dimension-text";
import { matchMuntinPanels, type ResolvedMuntin } from "../muntin-layer";
import { pivotDoorLayout, pivotSideliteLayout } from "./pivot-door-layout";
import { PivotFixedDoorDiagram, PivotFixedPane } from "./pivot-fixed-panel";
import { PivotDoorLeafArtwork } from "./pivot-door-leaf";
import { PivotCompositeDoorDiagram } from "./pivot-composite-diagram";

export interface PivotDoorDiagramProps {
  width: number;
  height: number;
  configuration?: "X" | "O" | "O/X" | "XO" | "OX" | "OXO" | "O/O-O/X" | "O/X-O/O" | "O/O-O/X-O/O";
  doorHeight?: number;
  doorWidth?: number;
  activeOptionName?: string | null;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  showDimensions?: boolean;
  className?: string;
  muntin?: ResolvedMuntin | null;
}

function frameColor(value?: string | null): string {
  const color = value?.trim();
  return color && /^#[\da-f]{6}$/i.test(color) ? color.toUpperCase() : "#FFFFFF";
}

function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  return `#${[1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value + (target - value) * Math.abs(amount)).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
}

/** Fixed O and the approved outward-opening X, with a fixed transom or sidelite. */
export function PivotDoorDiagram({ width, height, configuration = "X", doorHeight, doorWidth, activeOptionName, frameColorHex, glassTintHex, hasCoating = false, hasPrivacy = false, showDimensions = true, className, muntin }: PivotDoorDiagramProps) {
  const reactId = useId();
  const [widthLanes, setWidthLanes] = useState(1);
  const [heightLanes, setHeightLanes] = useState(1);
  const id = `pivot-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (configuration === "O") return <PivotFixedDoorDiagram width={width} height={height} frameColorHex={frameColorHex} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} showDimensions={showDimensions} className={className} muntin={muntin} />;
  if (configuration === "OXO" || configuration === "O/O-O/X" || configuration === "O/X-O/O" || configuration === "O/O-O/X-O/O") return <PivotCompositeDoorDiagram configuration={configuration} width={width} height={height} doorWidth={doorWidth} doorHeight={doorHeight} activeOptionName={activeOptionName} frameColorHex={frameColorHex} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} showDimensions={showDimensions} className={className} muntin={muntin} />;
  if (configuration !== "X" && configuration !== "O/X" && configuration !== "XO" && configuration !== "OX") return null;
  const isTransom = configuration === "O/X";
  const isSidelite = configuration === "XO" || configuration === "OX";
  if (isTransom && (!Number.isFinite(height) || !Number.isFinite(doorHeight) || !doorHeight || doorHeight <= 0 || doorHeight >= height)) return null;
  const sidelite = isSidelite ? pivotSideliteLayout(width, height, doorWidth, configuration) : null;
  if (isSidelite && !sidelite) return null;
  const layout = sidelite?.door ?? pivotDoorLayout(width, isTransom ? doorHeight! : height);
  if (!layout) return null;
  const { opening, leaf, glassBounds, profileScale: p, sx, sy } = layout;
  const transomHeight = isTransom ? height - doorHeight! : 0;
  const transomUnits = transomHeight * layout.unitsPerInch;
  const doorOffset = sidelite?.doorOffset ?? 0;
  const frame = sidelite?.frame ?? (isTransom ? { ...layout.frame, height: height * layout.unitsPerInch } : layout.frame);
  if (![frame.height, transomUnits].every(Number.isFinite)) return null;
  const transomGlass = {
    x: opening.x, y: Math.min(opening.y, transomUnits / 3), width: opening.width,
    height: transomUnits - Math.min(opening.y, transomUnits / 3),
  };
  const muntinPanels = isTransom ? [
    { panelIndex: 1, panelCode: "O", panelLabel: "Top", rect: transomGlass },
    { panelIndex: 2, panelCode: "X", panelLabel: "Bottom", rect: { ...glassBounds, y: glassBounds.y + transomUnits } },
  ] : sidelite ? [
    { panelIndex: sidelite.doorPanelIndex, panelCode: "X", panelLabel: sidelite.side === "left" ? "Right" : "Left", rect: { ...glassBounds, x: glassBounds.x + doorOffset } },
    { panelIndex: sidelite.fixedPanelIndex, panelCode: "O", panelLabel: sidelite.side === "left" ? "Left" : "Right", rect: sidelite.glass },
  ] : [];
  const matchedMuntin = muntin && muntinPanels.length ? matchMuntinPanels(muntin, muntinPanels) : [];
  const matchedPanelMuntin = (code: "O" | "X"): ResolvedMuntin | null => {
    const match = matchedMuntin.find(item => item.glass.panelCode === code);
    return muntin && match ? { profile: muntin.profile, panels: [match.panel] } : null;
  };
  const activeWords: string[] = (activeOptionName ?? "").toUpperCase().match(/[A-Z]+/g) ?? [];
  const rightActive = activeWords.includes("RIGHT") && activeWords.includes("ACTIVE") && !activeWords.includes("LEFT");
  const color = frameColor(frameColorHex);
  // White retains the approved subtle neutral finish; other frame colors use
  // the same highlights and profile boundaries without tinting the glass.
  const finish = (reference: string, amount: number) => color === "#FFFFFF" ? reference : shade(color, amount);
  const url = (suffix: string) => `url(#${id}-${suffix})`;
  const r = 7 * Math.min(sx, sy);
  const fw = frame.width; const fh = frame.height;
  const ox = opening.x + doorOffset; const oy = opening.y + transomUnits; const or = ox + opening.width; const ob = oy + opening.height;
  const fixedOpening = sidelite?.glass;
  const framePath = `M${r} 0H${fw-r}Q${fw} 0 ${fw} ${r}V${fh-r}Q${fw} ${fh} ${fw-r} ${fh}H${r}Q0 ${fh} 0 ${fh-r}V${r}Q0 0 ${r} 0Z M${ox} ${oy}V${ob}H${or}V${oy}Z${isTransom ? ` M${ox} ${transomGlass.y}V${transomUnits}H${or}V${transomGlass.y}Z` : ""}${fixedOpening ? ` M${fixedOpening.x} ${fixedOpening.y}V${fixedOpening.y+fixedOpening.height}H${fixedOpening.x+fixedOpening.width}V${fixedOpening.y}Z` : ""}`;
  const dimensionOffset = 28 * p;
  const dimensionBottom = Math.max(fh, leaf.br.y + transomUnits) + dimensionOffset;
  const dimensionRight = fw + dimensionOffset;
  const viewBox = expandedViewBox({ x: 0, y: Math.min(0, leaf.tr.y + transomUnits), width: fw, height: Math.max(fh, leaf.br.y + transomUnits) - Math.min(0, leaf.tr.y + transomUnits) }, showDimensions
    ? { top: (isSidelite ? 52 : 20) * p, right: 70 * p, bottom: 65 * p, left: (isTransom ? 70 : 24) * p }
    : { top: 16 * p, right: 27 * p, bottom: 23 * p, left: 24 * p });
  const format = (value: number) => `${Number(value.toFixed(3))}\u2033`;

  return <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="visible" role="img" aria-labelledby={`${id}-title ${id}-description`} className={className}
    style={{ boxSizing: "border-box", paddingTop: showDimensions && isSidelite ? 18 * widthLanes : undefined, paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined, paddingLeft: showDimensions && isTransom ? VERTICAL_DIMENSION_RESERVE_PX + 18 * (heightLanes - 1) : undefined, paddingBottom: showDimensions ? 18 : undefined }}
    data-diagram-family="PIVOT_DOOR" data-authentic-evolution-family="PIVOT_DOOR" data-configuration={configuration} data-view="EXTERIOR" data-opening-direction="OUTWARD" data-exterior-pivot-side={rightActive ? "right" : "left"} data-schematic-opening-deg="24" data-width={width} data-height={height} data-door-height={isTransom ? doorHeight : undefined} data-transom-height={isTransom ? transomHeight : undefined} data-door-width={isSidelite ? doorWidth : undefined} data-sidelite-width={sidelite?.sideliteWidth} data-frame-color={color} data-units-per-inch={layout.unitsPerInch}>
    <title id={`${id}-title`}>{`Pivot Door — Configuration ${configuration}`}</title>
    <desc id={`${id}-description`}>{`Exterior view of a ${format(width)} × ${format(height)} pivot door opening outward toward the observer about a hidden inboard pivot on the ${rightActive ? "right" : "left"}, with a long metal pull handle on the ${rightActive ? "left" : "right"}. ${isTransom ? `A fixed ${format(transomHeight)} transom sits above the ${format(doorHeight!)} door. ` : ""}${sidelite ? `A fixed ${format(sidelite.sideliteWidth)} sidelite sits to the ${sidelite.side} of the ${format(doorWidth!)} door. ` : ""}The frame dimensions describe the closed opening.`}</desc>
    <defs>
      <linearGradient id={`${id}-frame-finish`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={finish("#F5F7F6", 0.16)} /><stop offset="0.46" stopColor={finish("#EEF1EF", 0)} /><stop offset="1" stopColor={finish("#E0E5E3", -0.16)} />
      </linearGradient>
    </defs>
    {/* Mirror the product only; closed-frame dimensions remain readable. */}
    <g data-part="pivot-door-artwork" transform={rightActive && !isTransom && !isSidelite ? `translate(${fw} 0) scale(-1 1)` : undefined}>
    <g data-layer="FRAME" data-material="frame">
      <path d={framePath} fill={url("frame-finish")} fillRule="evenodd" stroke={finish("#526269", -0.56)} strokeWidth={2.1 * p} data-part="pivot-door-frame" data-width={fw} data-height={fh} />
      <path d={`M${3*sx} ${fh-6*sy}V${4*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={1.5*p} />
      <path d={`M${29*sx} ${3*sy}V${fh-3*sy}M${or} ${3*sy}V${fh-3*sy}`} fill="none" stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} />
      <path d={`M${ox} ${ob}V${oy}H${or}V${ob}Z`} fill="none" stroke={finish("#1F333D", -0.72)} strokeWidth={2.2*p} />
      <path d={`M${ox+4*sx} ${ob-3*sy}V${oy+3*sy}M${or-3*sx} ${oy+3*sy}V${ob-3*sy}`} fill="none" stroke={finish("#7D9199", -0.4)} strokeWidth={p} />
      <path d={`M${4*sx} ${fh-3*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth={1.3*p} />
      {isTransom ? <rect x={ox} y={transomUnits} width={opening.width} height={opening.y} fill={url("frame-finish")} stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} data-part="pivot-transom-divider" /> : null}
      {sidelite ? <rect {...sidelite.divider} fill={url("frame-finish")} stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} data-part="pivot-sidelite-divider" /> : null}
    </g>
    {isTransom ? <g data-layer="TRANSOM" data-part="pivot-transom" data-height={transomUnits}>
      <PivotFixedPane rect={transomGlass} id={`${id}-transom`} color={color} profileScale={p} unitsPerInch={layout.unitsPerInch} panelIndex={1} panelLabel="Top" glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={matchedPanelMuntin("O")} />
    </g> : null}
    {sidelite ? <g data-layer="SIDELITE" data-part="pivot-sidelite" data-side={sidelite.side} data-width={sidelite.sideliteUnits}>
      <PivotFixedPane rect={sidelite.glass} id={`${id}-sidelite`} color={color} profileScale={p} unitsPerInch={layout.unitsPerInch} panelIndex={sidelite.fixedPanelIndex} panelLabel={sidelite.side === "left" ? "Left" : "Right"} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={matchedPanelMuntin("O")} />
    </g> : null}
    <g data-part="pivot-door-leaf-artwork" data-door-offset={isSidelite ? doorOffset : undefined} data-door-width={isSidelite ? layout.frame.width : undefined} transform={isTransom ? `translate(0 ${transomUnits})${rightActive ? ` translate(${fw} 0) scale(-1 1)` : ""}` : sidelite ? `translate(${doorOffset} 0)${rightActive ? ` translate(${layout.frame.width} 0) scale(-1 1)` : ""}` : undefined}>
      <PivotDoorLeafArtwork layout={layout} color={color} id={id} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={isTransom || isSidelite ? matchedPanelMuntin("X") : muntin} />
    </g>
    </g>
    {showDimensions ? <g key={`${configuration}:${viewBox}:${widthLanes}:${heightLanes}`} data-dimensions="VISIBLE" fill="none" stroke={DIMENSION_COLOR} strokeWidth={1.3*p}>
      <path d={`M0 ${fh+12*p}V${dimensionBottom+11*p}M${fw} ${fh+12*p}V${dimensionBottom+11*p}M0 ${dimensionBottom}H${fw}M${fw+10*p} 0H${dimensionRight+11*p}M${fw+10*p} ${fh}H${dimensionRight+11*p}M${dimensionRight} 0V${fh}`} />
      <path d={`M0 ${dimensionBottom}l${8*p} ${-3*p}v${6*p}z M${fw} ${dimensionBottom}l${-8*p} ${-3*p}v${6*p}z M${dimensionRight} 0l${-3*p} ${8*p}h${6*p}z M${dimensionRight} ${fh}l${-3*p} ${-8*p}h${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />
      <DimensionText x={fw/2} y={dimensionBottom} screenOffsetYPx={18} textAnchor="middle" fallbackFontSize={18}>{`W ${format(width)}`}</DimensionText>
      <VerticalDimensionText x={dimensionRight} y={fh/2} fallbackFontSize={18}>{`H ${format(height)}`}</VerticalDimensionText>
      {sidelite ? <g data-part="pivot-width-segment-dimensions">
        <path d={`M0 ${-12*p}V${-39*p}M${sidelite.split} ${-12*p}V${-39*p}M${fw} ${-12*p}V${-39*p}M0 ${-28*p}H${fw}`} />
        <path d={`M0 ${-28*p}l${8*p} ${-3*p}v${6*p}z M${sidelite.split} ${-28*p}l${-8*p} ${-3*p}v${6*p}z M${sidelite.split} ${-28*p}l${8*p} ${-3*p}v${6*p}z M${fw} ${-28*p}l${-8*p} ${-3*p}v${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />
        <PivotSegmentLabels axis="horizontal" onLanesChange={setWidthLanes} labels={[
          { key: "door", x: doorOffset+layout.frame.width/2, y: -28*p, text: `W ${format(doorWidth!)}` },
          { key: "sidelite", x: sidelite.side === "left" ? sidelite.sideliteUnits/2 : layout.frame.width+sidelite.sideliteUnits/2, y: -28*p, text: `W ${format(sidelite.sideliteWidth)}` },
        ]} />
      </g> : null}
      {isTransom ? <g data-part="pivot-segment-dimensions">
        <path d={`M${-10*p} 0H${-39*p}M${-10*p} ${transomUnits}H${-39*p}M${-10*p} ${fh}H${-39*p}M${-28*p} 0V${fh}`} />
        <path d={`M${-28*p} 0l${-3*p} ${8*p}h${6*p}z M${-28*p} ${transomUnits}l${-3*p} ${-8*p}h${6*p}z M${-28*p} ${transomUnits}l${-3*p} ${8*p}h${6*p}z M${-28*p} ${fh}l${-3*p} ${-8*p}h${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />
        <PivotSegmentLabels axis="vertical" onLanesChange={setHeightLanes} labels={[
          { key: "transom", x: -28*p, y: transomUnits/2, text: `H ${format(transomHeight)}` },
          { key: "door", x: -28*p, y: (transomUnits+fh)/2, text: `H ${format(doorHeight!)}` },
        ]} />
      </g> : null}
    </g> : null}
  </svg>;
}
