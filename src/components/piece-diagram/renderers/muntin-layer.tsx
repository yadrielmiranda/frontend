import React from "react";
import type { ResolvedMuntin } from "../muntin-data";

export type { ResolvedMuntin } from "../muntin-data";

export type MuntinGlassPanel = {
  panelIndex: number;
  panelCode: string;
  panelLabel: string;
  rect: { x: number; y: number; width: number; height: number };
};

function positionOf(panel: { panelCode?: string | null; panelLabel: string }): string | null {
  const label = `${panel.panelLabel} ${panel.panelCode ?? ""}`.toUpperCase().replace(/[_-]/g, " ");
  const positions = [
    ["left", /\b(?:LEFT|IZQUIERD[OA]|L)\b/],
    ["right", /\b(?:RIGHT|DERECH[OA]|R)\b/],
    ["top", /\b(?:TOP|UPPER|SUPERIOR|T)\b/],
    ["bottom", /\b(?:BOTTOM|LOWER|INFERIOR|B)\b/],
    ["center", /\b(?:CENTER|CENTRE|MIDDLE|CENTRAL|C)\b/],
  ] as const;
  const matches = positions.filter(([, expression]) => expression.test(label));
  if (matches.length > 1) return "conflict";
  if (matches.length === 1) return matches[0][0];
  return null;
}

// Prefer an explicit position or a unique operating code. The index fallback
// is the complete configuration layout in exterior order, never array order.
export function matchMuntinPanels(muntin: ResolvedMuntin, glassPanels: readonly MuntinGlassPanel[]) {
  if (muntin.panels.length !== glassPanels.length) return [];
  const completeIndices = muntin.panels.every((panel) =>
    glassPanels.some((glass) => glass.panelIndex === panel.panelIndex));
  const used = new Set<number>();
  const matched: { panel: ResolvedMuntin["panels"][number]; glass: MuntinGlassPanel }[] = [];
  for (const panel of muntin.panels) {
    const position = positionOf(panel);
    if (position === "conflict") return [];
    const code = panel.panelCode?.trim().toUpperCase();
    let candidates = position
      ? glassPanels.filter((glass) => positionOf(glass) === position)
      : [];
    // SH-over-fixed has a third fixed light as well as the upper fixed sash.
    if (!position && /\b(?:FIXED|FIX|FIJO)\b/i.test(panel.panelLabel) && glassPanels.some((glass) => glass.panelLabel === "Fixed")) {
      candidates = glassPanels.filter((glass) => glass.panelLabel === "Fixed");
    }
    if (position && candidates.length !== 1) return [];
    if (!candidates.length && code) {
      const byCode = glassPanels.filter((glass) => glass.panelCode === code);
      if (byCode.length === 1) candidates = byCode;
    }
    if (!candidates.length && completeIndices) {
      candidates = glassPanels.filter((glass) => glass.panelIndex === panel.panelIndex);
    }
    if (candidates.length !== 1 || used.has(candidates[0].panelIndex)) return [];
    if ((code === "X" || code === "O") && candidates[0].panelCode !== code) return [];
    used.add(candidates[0].panelIndex);
    matched.push({ panel, glass: candidates[0] });
  }
  return matched;
}

function shade(hex: string, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(amount > 0 ? value + (255 - value) * amount : value * (1 + amount))
      .toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

export function MuntinLayer({ muntin, glassPanels, frameColorHex, unitsPerInch, idNamespace }: {
  muntin?: ResolvedMuntin | null;
  glassPanels: readonly MuntinGlassPanel[];
  frameColorHex: string;
  unitsPerInch: number;
  idNamespace: string;
}) {
  if (!muntin || !Number.isFinite(unitsPerInch) || unitsPerInch <= 0) return null;
  const matched = matchMuntinPanels(muntin, glassPanels);
  if (!matched.length) return null;
  const color = /^#[0-9a-f]{6}$/i.test(frameColorHex) ? frameColorHex : "#FFFFFF";
  const namespace = `${idNamespace}-muntin`;
  const stops = muntin.profile === "ogee"
    ? [[0, -0.32], [0.13, -0.1], [0.3, 0.35], [0.48, 0.15], [0.7, -0.04], [0.9, -0.2], [1, -0.32]]
    : [[0, -0.2], [0.1, 0], [0.9, 0], [1, -0.2]];

  return <g data-part="muntin-layer" data-muntin-profile={muntin.profile} pointerEvents="none">
    <defs>
      {(["vertical", "horizontal"] as const).map((axis) => <linearGradient
        key={axis} id={`${namespace}-${axis}`} x1="0" y1="0"
        x2={axis === "vertical" ? "1" : "0"} y2={axis === "horizontal" ? "1" : "0"}
      >
        {stops.map(([offset, amount]) => <stop key={offset} offset={offset} stopColor={shade(color, amount)} />)}
      </linearGradient>)}
      {matched.map(({ glass }) => <clipPath key={glass.panelIndex} id={`${namespace}-clip-${glass.panelIndex}`}>
        <rect {...glass.rect} />
      </clipPath>)}
    </defs>
    {matched.map(({ panel, glass }) => {
      const { x, y, width, height } = glass.rect;
      const h = panel.horizontalLites;
      const v = panel.verticalLites;
      // Guard transient/invalid dimensions and impossible grids without changing
      // form validation or drawing thousands of overlapping bars.
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 ||
        !Number.isSafeInteger(h) || !Number.isSafeInteger(v) || h < 1 || v < 1 ||
        (h > 1 && width / h <= unitsPerInch) || (v > 1 && height / v <= unitsPerInch)) return null;
      return <g key={glass.panelIndex} clipPath={`url(#${namespace}-clip-${glass.panelIndex})`}
        data-part="muntin-panel" data-panel-index={panel.panelIndex} data-glass-position={glass.panelLabel}
        data-horizontal-lites={h} data-vertical-lites={v}>
        {Array.from({ length: h - 1 }, (_, index) => <rect key={`v-${index}`}
          data-part="muntin-bar" data-axis="vertical"
          x={x + width * (index + 1) / h - unitsPerInch / 2} y={y}
          width={unitsPerInch} height={height} fill={`url(#${namespace}-vertical)`} />)}
        {Array.from({ length: v - 1 }, (_, index) => <rect key={`h-${index}`}
          data-part="muntin-bar" data-axis="horizontal"
          x={x} y={y + height * (index + 1) / v - unitsPerInch / 2}
          width={width} height={unitsPerInch} fill={`url(#${namespace}-horizontal)`} />)}
      </g>;
    })}
  </g>;
}
