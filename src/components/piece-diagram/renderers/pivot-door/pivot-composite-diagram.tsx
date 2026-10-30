"use client";

import React, { useId, useState } from "react";
import type { PivotDoorDiagramProps } from "./pivot-door-diagram";
import { PivotDoorLeafArtwork } from "./pivot-door-leaf";
import { PivotFixedPane } from "./pivot-fixed-panel";
import { matchPivotCompositeMuntin, pivotCompositeLayout, type PivotCompositeConfiguration } from "./pivot-composite-layout";
import { DIMENSION_COLOR, expandedViewBox } from "../dimension-style";
import { PivotDimensionText as DimensionText, PivotVerticalDimensionText as VerticalDimensionText, PIVOT_DIMENSION_RESERVE_PX as VERTICAL_DIMENSION_RESERVE_PX, PivotSegmentLabels } from "./pivot-dimension-text";

export function PivotCompositeDoorDiagram({ configuration, width, height, doorWidth, doorHeight, activeOptionName, frameColorHex, glassTintHex, hasCoating = false, hasPrivacy = false, showDimensions = true, className, muntin }: Omit<PivotDoorDiagramProps, "configuration"> & { configuration: PivotCompositeConfiguration }) {
  const reactId = useId();
  const [widthLanes, setWidthLanes] = useState(1);
  const [heightLanes, setHeightLanes] = useState(1);
  const id = `pivot-composite-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layout = pivotCompositeLayout(configuration, width, height, doorWidth, doorHeight);
  if (!layout) return null;
  const { frame, door, columns, panes, verticalDividers, horizontalDivider, hasTransom, transomHeight, transomUnits, sideliteWidth, sideCount, doorOffset } = layout;
  const { sx, sy, profileScale: p, unitsPerInch } = door;
  const rawColor = frameColorHex?.trim();
  const color = rawColor && /^#[\da-f]{6}$/i.test(rawColor) ? rawColor.toUpperCase() : "#FFFFFF";
  const finish = (reference: string, amount: number) => color === "#FFFFFF" ? reference : `#${[1, 3, 5].map(start => {
    const channel = parseInt(color.slice(start, start + 2), 16);
    return Math.round(channel + ((amount < 0 ? 0 : 255) - channel) * Math.abs(amount)).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
  const words: string[] = (activeOptionName ?? "").toUpperCase().match(/[A-Z]+/g) ?? [];
  const rightActive = words.includes("RIGHT") && words.includes("ACTIVE") && !words.includes("LEFT");
  const matched = matchPivotCompositeMuntin(muntin, layout);
  const paneMuntin = (index: number) => {
    const match = matched.find(item => item.glass.panelIndex === index);
    return muntin && match ? { profile: muntin.profile, panels: [match.panel] } : null;
  };
  const fw = frame.width; const fh = frame.height; const r = 7 * Math.min(sx, sy);
  const outline = `M${r} 0H${fw-r}Q${fw} 0 ${fw} ${r}V${fh-r}Q${fw} ${fh} ${fw-r} ${fh}H${r}Q0 ${fh} 0 ${fh-r}V${r}Q0 0 ${r} 0Z`;
  const framePath = outline + panes.map(({ opening: rect }) => ` M${rect.x} ${rect.y}V${rect.y+rect.height}H${rect.x+rect.width}V${rect.y}Z`).join("");
  const doorPane = panes.find(pane => pane.panelCode === "X")!;
  const fixedPanes = panes.filter(pane => pane.panelCode === "O");
  const leftSide = columns[0].code === "O";
  const rightSide = columns[columns.length - 1].code === "O";
  const bottom = Math.max(fh, door.leaf.br.y + transomUnits) + 28 * p;
  const right = fw + 28 * p;
  const top = Math.min(0, door.leaf.tr.y + transomUnits);
  const viewBox = expandedViewBox({ x: 0, y: top, width: fw, height: Math.max(fh, door.leaf.br.y + transomUnits) - top }, showDimensions
    ? { top: 52 * p, right: 70 * p, bottom: 65 * p, left: (hasTransom ? 70 : 24) * p }
    : { top: 16 * p, right: 27 * p, bottom: 23 * p, left: 24 * p });
  const format = (value: number) => `${Number(value.toFixed(3))}\u2033`;
  const widthLine = -28 * p;
  const widthEnds = [0, ...columns.map(column => column.x + column.width)];

  return <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" overflow="visible" role="img" aria-labelledby={`${id}-title ${id}-description`} className={className}
    style={{ boxSizing: "border-box", paddingTop: showDimensions ? 18 * widthLanes : undefined, paddingRight: showDimensions ? VERTICAL_DIMENSION_RESERVE_PX : undefined, paddingLeft: showDimensions && hasTransom ? VERTICAL_DIMENSION_RESERVE_PX + 18 * (heightLanes - 1) : undefined, paddingBottom: showDimensions ? 18 : undefined }}
    data-diagram-family="PIVOT_DOOR" data-authentic-evolution-family="PIVOT_DOOR" data-configuration={configuration} data-view="EXTERIOR" data-opening-direction="OUTWARD" data-exterior-pivot-side={rightActive ? "right" : "left"} data-schematic-opening-deg="24"
    data-width={width} data-height={height} data-door-width={doorWidth} data-door-height={hasTransom ? doorHeight : undefined} data-transom-height={hasTransom ? transomHeight : undefined} data-sidelite-width={sideliteWidth} data-sidelite-count={sideCount} data-left-sidelite-width={leftSide ? sideliteWidth : undefined} data-right-sidelite-width={rightSide ? sideliteWidth : undefined} data-frame-color={color} data-units-per-inch={unitsPerInch}>
    <title id={`${id}-title`}>{`Pivot Door — Configuration ${configuration}`}</title>
    <desc id={`${id}-description`}>{`Exterior view of a ${format(width)} × ${format(height)} assembly with an outward-opening ${format(doorWidth!)} pivot door and ${sideCount} fixed sidelite${sideCount === 1 ? "" : "s"}, each ${format(sideliteWidth)} wide. ${hasTransom ? `An aligned ${format(transomHeight)} fixed transom row sits above the ${format(doorHeight!)} door. ` : ""}Only the door leaf reflects the selected ${rightActive ? "right" : "left"} active pivot side.`}</desc>
    <defs><linearGradient id={`${id}-frame-finish`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={finish("#F5F7F6", 0.16)} /><stop offset="0.46" stopColor={finish("#EEF1EF", 0)} /><stop offset="1" stopColor={finish("#E0E5E3", -0.16)} /></linearGradient></defs>
    <g data-part="pivot-door-artwork">
      <g data-layer="FRAME" data-material="frame">
        <path d={framePath} fill={`url(#${id}-frame-finish)`} fillRule="evenodd" stroke={finish("#526269", -0.56)} strokeWidth={2.1*p} data-part="pivot-door-frame" data-width={fw} data-height={fh} />
        <path d={`M${3*sx} ${fh-6*sy}V${4*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={1.5*p} />
        <path d={`M${4*sx} ${fh-3*sy}H${fw-4*sx}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth={1.3*p} />
        {verticalDividers.map((divider, index) => <rect key={index} {...divider} fill={`url(#${id}-frame-finish)`} stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} data-part="pivot-sidelite-divider" data-divider-index={index+1} />)}
        {horizontalDivider ? <rect {...horizontalDivider} fill={`url(#${id}-frame-finish)`} stroke={finish("#B3BFBE", -0.22)} strokeWidth={p} data-part="pivot-transom-divider" /> : null}
        <path d={`M${doorOffset+door.opening.x} ${transomUnits+door.opening.y+door.opening.height}V${transomUnits+door.opening.y}H${doorOffset+door.opening.x+door.opening.width}V${transomUnits+door.opening.y+door.opening.height}`} fill="none" stroke={finish("#1F333D", -0.72)} strokeWidth={2.2*p} />
      </g>
      {fixedPanes.map(pane => <g key={pane.panelIndex} data-layer={pane.row === "top" ? "TRANSOM" : "SIDELITE"} data-part={pane.row === "top" ? "pivot-transom" : "pivot-sidelite"} data-side={pane.column} data-panel-index={pane.panelIndex} data-panel-code={pane.panelCode} data-panel-label={pane.panelLabel} data-row={pane.row} data-column={pane.column}>
        <PivotFixedPane rect={pane.rect} id={`${id}-pane-${pane.panelIndex}`} color={color} profileScale={p} unitsPerInch={unitsPerInch} panelIndex={pane.panelIndex} panelLabel={pane.panelLabel} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={paneMuntin(pane.panelIndex)} />
      </g>)}
      <g data-part="pivot-door-leaf-artwork" data-door-offset={doorOffset} data-door-offset-y={transomUnits} data-door-width={door.frame.width} data-panel-index={doorPane.panelIndex} data-panel-code="X" data-panel-label={doorPane.panelLabel} data-row="bottom" data-column={doorPane.column}
        transform={`translate(${doorOffset} ${transomUnits})${rightActive ? ` translate(${door.frame.width} 0) scale(-1 1)` : ""}`}>
        <PivotDoorLeafArtwork layout={door} color={color} id={`${id}-door`} glassTintHex={glassTintHex} hasCoating={hasCoating} hasPrivacy={hasPrivacy} muntin={paneMuntin(doorPane.panelIndex)} />
      </g>
    </g>
    {showDimensions ? <g key={`${configuration}:${viewBox}:${widthLanes}:${heightLanes}`} data-dimensions="VISIBLE" fill="none" stroke={DIMENSION_COLOR} strokeWidth={1.3*p}>
      <path d={`M0 ${fh+12*p}V${bottom+11*p}M${fw} ${fh+12*p}V${bottom+11*p}M0 ${bottom}H${fw}M${fw+10*p} 0H${right+11*p}M${fw+10*p} ${fh}H${right+11*p}M${right} 0V${fh}`} />
      <path d={`M0 ${bottom}l${8*p} ${-3*p}v${6*p}z M${fw} ${bottom}l${-8*p} ${-3*p}v${6*p}z M${right} 0l${-3*p} ${8*p}h${6*p}z M${right} ${fh}l${-3*p} ${-8*p}h${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />
      <DimensionText x={fw/2} y={bottom} screenOffsetYPx={18} textAnchor="middle" fallbackFontSize={18}>{`W ${format(width)}`}</DimensionText>
      <VerticalDimensionText x={right} y={fh/2} fallbackFontSize={18}>{`H ${format(height)}`}</VerticalDimensionText>
      <g data-part="pivot-width-segment-dimensions">
        <path d={`${widthEnds.map(x => `M${x} ${-12*p}V${widthLine-11*p}`).join(" ")} M0 ${widthLine}H${fw}`} />
        {columns.map(column => <path key={column.column} d={`M${column.x} ${widthLine}l${8*p} ${-3*p}v${6*p}z M${column.x+column.width} ${widthLine}l${-8*p} ${-3*p}v${6*p}z`} fill={DIMENSION_COLOR} stroke="none" />)}
        <PivotSegmentLabels axis="horizontal" onLanesChange={setWidthLanes} labels={columns.map(column => ({
          key: column.column, x: column.x+column.width/2, y: widthLine, text: `W ${format(column.code === "X" ? doorWidth! : sideliteWidth)}`,
        }))} />
      </g>
      {hasTransom ? <g data-part="pivot-segment-dimensions">
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
