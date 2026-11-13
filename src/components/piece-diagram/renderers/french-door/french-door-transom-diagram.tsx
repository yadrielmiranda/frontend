import React, { useId } from "react";

import { DIMENSION_COLOR, dimensionMetrics } from "../dimension-style";
import {
  DIMENSION_LABEL_BELOW_LINE_PX,
  DimensionText,
  VerticalDimensionText,
  VERTICAL_DIMENSION_RESERVE_PX,
} from "../dimension-text";
import { doorFinish } from "../door-finish";
import { GlassAppearanceLayer, type GlassOverlayRect } from "../glass-appearance";
import { MuntinLayer, type MuntinGlassPanel, type ResolvedMuntin } from "../muntin-layer";
import { frenchDoorArtwork } from "./french-door-design-artwork";
import { FrenchDoorFrameSurface } from "./french-door-finishes";
import {
  FrenchDoorStructure,
  normalizeFrameColor,
  type PieceDiagramActiveLeaf,
  type PieceDiagramBoreCount,
  type PieceDiagramExteriorHingeSide,
} from "./series-600-door-diagram";
import { doubleFrenchDoorGeometry } from "./series-600-double-artwork";
import { singleFrenchDoorGeometry } from "./series-600-single-artwork";

export interface FrenchDoorTransomDiagramProps {
  width: number;
  height: number;
  doorHeight: number;
  configuration: "XT" | "XXT";
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  activeLeaf?: PieceDiagramActiveLeaf;
  boreCount?: PieceDiagramBoreCount;
  showHardware?: boolean;
  showMovement?: boolean;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  muntin?: ResolvedMuntin | null;
  frenchDoorDesignKey?: string | null;
  showDimensions?: boolean;
  className?: string;
}

function formatDimension(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function TransomDimensions({ width, height, doorHeight, transomHeight }: {
  width: number; height: number; doorHeight: number; transomHeight: number;
}) {
  const metrics = dimensionMetrics(height);
  const gap = height * 0.04;
  const tick = height * 0.012;
  const bottom = height + gap;
  const right = width + gap;
  const vertical = (x: number, start: number, end: number, value: number, name: string, side: "left" | "right") => (
    <g data-dimension={name}>
      <path d={`M${x} ${start}V${end} M${x-tick} ${start}H${x+tick} M${x-tick} ${end}H${x+tick}`}
        fill="none" stroke={DIMENSION_COLOR} strokeWidth={metrics.strokeWidth} />
      <VerticalDimensionText x={x} y={(start + end) / 2} side={side}
        fallbackFontSize={metrics.fontSize}>
        {`H. ${formatDimension(value)}"`}
      </VerticalDimensionText>
    </g>
  );
  return <g data-layer="FRENCH_DOOR_DIMENSIONS" pointerEvents="none" aria-hidden="true">
    <g data-dimension="width">
      <path d={`M0 ${bottom}H${width} M0 ${bottom-tick}V${bottom+tick} M${width} ${bottom-tick}V${bottom+tick}`}
        fill="none" stroke={DIMENSION_COLOR} strokeWidth={metrics.strokeWidth} />
      <DimensionText x={width / 2} y={bottom} textAnchor="middle"
        fallbackFontSize={metrics.fontSize} screenOffsetYPx={DIMENSION_LABEL_BELOW_LINE_PX}>
        {`W. ${formatDimension(width)}"`}
      </DimensionText>
    </g>
    {vertical(right, 0, height, height, "height", "right")}
    {vertical(-gap, 0, transomHeight, transomHeight, "transom-height", "left")}
    {vertical(-gap, transomHeight, height, doorHeight, "door-height", "left")}
  </g>;
}

/** French X/XX leaves below a full-width fixed light; all geometry is in inches. */
export function FrenchDoorTransomDiagram({
  width,
  height,
  doorHeight,
  configuration,
  exteriorHingeSide = "right",
  activeLeaf = "left",
  boreCount = 2,
  showHardware = false,
  showMovement = false,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  muntin,
  frenchDoorDesignKey,
  showDimensions = true,
  className,
}: FrenchDoorTransomDiagramProps) {
  const reactId = useId();
  const namespace = `ae-french-transom-${reactId}`.replace(/[^A-Za-z0-9_-]/g, "");
  const transomHeight = height - doorHeight;
  if (![width, height, doorHeight].every(value => Number.isFinite(value) && value > 0)
    || (configuration !== "XT" && configuration !== "XXT")
    || transomHeight < 10 - 1e-9) return null;

  const frameColor = normalizeFrameColor(frameColorHex);
  const finish = doorFinish(frameColor);
  const profileScale = Math.min(1, width / 18, transomHeight / 10);
  const inset = 2 * profileScale;
  const transomGlass: GlassOverlayRect = {
    x: inset, y: inset, width: width - 2 * inset, height: transomHeight - 2 * inset,
  };
  const leafConfiguration = configuration === "XT" ? "X" : "XX";
  const leafCount = leafConfiguration === "X" ? 1 : 2;
  const glassPanels: MuntinGlassPanel[] = [
    { panelIndex: 1, panelCode: "O", panelLabel: "Top", rect: transomGlass },
  ];
  if (leafConfiguration === "X") {
    const glass = singleFrenchDoorGeometry(width, doorHeight, exteriorHingeSide).glass;
    glassPanels.push({ panelIndex: 2, panelCode: "X", panelLabel: "Bottom", rect: {
      ...glass,
      x: exteriorHingeSide === "left" ? width - glass.x - glass.width : glass.x,
      y: transomHeight + glass.y,
    } });
  } else {
    const { leftGlass, rightGlass } = doubleFrenchDoorGeometry(width, doorHeight, activeLeaf);
    [leftGlass, rightGlass].forEach((glass, index) => glassPanels.push({
      panelIndex: index + 2, panelCode: "X", panelLabel: index === 0 ? "Left" : "Right",
      rect: { ...glass, y: transomHeight + glass.y },
    }));
  }
  const topId = `${namespace}-transom`;
  const margin = showDimensions ? height * 0.07 : 0;
  const topMargin = showDimensions ? height * 0.02 : 0;

  return <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"
    className={className} viewBox={`${-margin} ${-topMargin} ${width + 2 * margin} ${height + topMargin + margin}`}
    preserveAspectRatio="xMidYMid meet" overflow="visible" role="img"
    aria-label={`French Door ${configuration}, ${formatDimension(width)} by ${formatDimension(height)} inches, door ${formatDimension(doorHeight)} inches, transom ${formatDimension(transomHeight)} inches`}
    data-diagram-family="FRENCH_DOOR" data-configuration={configuration}
    data-door-height={doorHeight} data-transom-height={transomHeight} data-frame-color={frameColor}
    data-material-pipeline="STRUCTURE__DATABASE_GLASS__DATABASE_FRAME"
    style={{ backgroundColor: "transparent", boxSizing: "border-box",
      paddingLeft: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined,
      paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined,
      paddingTop: showDimensions ? 12 : undefined,
      paddingBottom: showDimensions ? DIMENSION_LABEL_BELOW_LINE_PX + 8 : undefined }}>
    <g data-part="french-door-transom" data-layer="FRENCH_DOOR_TRANSOM" data-panel-code="O" data-panel-index={1}>
      <FrenchDoorFrameSurface idNamespace={topId} width={width} height={transomHeight}
        frameColor={frameColor} profileScale={profileScale} includeHardware={false} part="sidelite-frame" />
      <rect x={inset - 0.2 * profileScale} y={inset - 0.2 * profileScale}
        width={transomGlass.width + 0.4 * profileScale} height={transomGlass.height + 0.4 * profileScale}
        fill={finish("#617071", -0.52)} />
      <rect {...transomGlass} fill={`url(#${topId}-glass)`} data-part="transom-glass" />
      <GlassAppearanceLayer rects={[transomGlass]} glassTintHex={glassTintHex}
        hasCoating={hasCoating} hasPrivacy={hasPrivacy} />
      <path d={`M${inset} ${transomHeight-inset}V${inset}H${width-inset}`}
        fill="none" stroke={finish("#899593", -0.38)} strokeWidth={0.12 * profileScale} />
      <path d={`M${inset} ${transomHeight-inset}H${width-inset}V${inset}`}
        fill="none" stroke="white" strokeOpacity={0.65} strokeWidth={0.1 * profileScale} />
    </g>
    <g data-part="french-door-leaves" transform={`translate(0 ${transomHeight})`}>
      <FrenchDoorStructure width={width} height={doorHeight} configuration={leafConfiguration}
        exteriorHingeSide={exteriorHingeSide} activeLeaf={activeLeaf} boreCount={boreCount}
        showHardware={showHardware} showMovement={showMovement} frameColorHex={frameColor}
        glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy}
        frenchDoorDesignKey={frenchDoorDesignKey} idNamespace={`${namespace}-door`} />
    </g>
    <line x1={0} x2={width} y1={transomHeight} y2={transomHeight}
      stroke={finish("#84918C", -0.4)} strokeWidth={0.16 * profileScale}
      data-part="french-door-transom-divider" />
    {/* One assembly-wide layer preserves the fixed/operable panel indices. */}
    <MuntinLayer muntin={frenchDoorArtwork(frenchDoorDesignKey)?.leafCount === leafCount ? null : muntin}
      glassPanels={glassPanels} frameColorHex={frameColor} unitsPerInch={1} idNamespace={`${namespace}-glass`} />
    {showDimensions && <TransomDimensions width={width} height={height} doorHeight={doorHeight} transomHeight={transomHeight} />}
  </svg>;
}
