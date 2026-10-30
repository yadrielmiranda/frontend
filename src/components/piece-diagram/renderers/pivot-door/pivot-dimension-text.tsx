"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { DimensionText } from "../dimension-text";

export const PIVOT_DIMENSION_RESERVE_PX = 22;
const LANE_SPACING_PX = 18;

export function PivotDimensionText(props: React.ComponentProps<typeof DimensionText>) {
  return <DimensionText {...props} fallbackFontSize={18} screenFontSizePx={14} style={{ ...props.style, fontWeight: 600 }} />;
}

type VerticalProps = Omit<React.ComponentProps<typeof DimensionText>, "x" | "y" | "textAnchor" | "transform" | "screenOffsetXPx" | "screenOffsetYPx"> & {
  x: number; y: number; side?: "left" | "right";
};

export function PivotVerticalDimensionText({ x, y, side = "right", ...props }: VerticalProps) {
  return <PivotDimensionText {...props} x={x} y={y} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${x} ${y})`} screenOffsetYPx={side === "left" ? -13 : 13} data-dimension-orientation="vertical" />;
}

type Label = { key: string; x: number; y: number; text: string };
type Placement = { lane: number; shift: number };

/** Start aligned; add a lane only when actual 14px label bounds overlap. */
export function PivotSegmentLabels({ labels, axis, onLanesChange }: {
  labels: readonly Label[]; axis: "horizontal" | "vertical"; onLanesChange: (lanes: number) => void;
}) {
  const groupRef = useRef<SVGGElement>(null);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});
  const signature = labels.map(label => `${label.key}:${label.x}:${label.y}:${label.text}`).join("|");

  useLayoutEffect(() => {
    const group = groupRef.current;
    const svg = group?.ownerSVGElement;
    if (!group || !svg) return;
    let animationFrame = 0;
    const measure = () => {
      const viewport = svg.getBoundingClientRect();
      if (viewport.width <= 0 || viewport.height <= 0) return;
      const items = Array.from(group.querySelectorAll<SVGTextElement>("text[data-pivot-label-key]")).map(text => {
        const key = text.dataset.pivotLabelKey!;
        const bounds = text.getBoundingClientRect();
        // Recover ideal aligned bounds: previous lane shifts never determine
        // whether a collision exists, preventing stagger/unstagger feedback.
        const baseLeft = bounds.left - (placements[key]?.shift ?? 0);
        let shift = 0;
        if (axis === "horizontal") {
          if (baseLeft < viewport.left + 2) shift = viewport.left + 2 - baseLeft;
          if (baseLeft + bounds.width + shift > viewport.right - 2) shift = viewport.right - 2 - baseLeft - bounds.width;
        }
        return { key, shift, start: axis === "horizontal" ? baseLeft + shift : bounds.top, end: axis === "horizontal" ? baseLeft + shift + bounds.width : bounds.bottom };
      }).sort((a, b) => a.start - b.start);
      const lanes: { start: number; end: number }[][] = [];
      const next: Record<string, Placement> = {};
      for (const item of items) {
        let lane = 0;
        while (lanes[lane]?.some(placed => item.start < placed.end + 4 && item.end + 4 > placed.start)) lane++;
        (lanes[lane] ??= []).push(item);
        next[item.key] = { lane, shift: item.shift };
      }
      setPlacements(current => Object.keys(current).length === Object.keys(next).length
        && Object.entries(next).every(([key, value]) => current[key]?.lane === value.lane && Math.abs(current[key].shift - value.shift) < 0.2) ? current : next);
      onLanesChange(Math.max(1, lanes.length));
    };
    const schedule = () => { cancelAnimationFrame(animationFrame); animationFrame = requestAnimationFrame(measure); };
    // The shared text component finishes its CTM measurement before this frame.
    schedule();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(svg);
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(animationFrame); observer?.disconnect(); window.removeEventListener("resize", schedule); };
  }, [axis, signature, placements, onLanesChange]);

  return <g ref={groupRef} data-part="pivot-segment-labels" data-axis={axis}>
    {labels.map(label => {
      const placement = placements[label.key] ?? { lane: 0, shift: 0 };
      return <PivotDimensionText key={label.key} data-pivot-label-key={label.key} x={label.x} y={label.y} textAnchor="middle" dominantBaseline={axis === "vertical" ? "central" : undefined}
        transform={axis === "vertical" ? `rotate(-90 ${label.x} ${label.y})` : undefined} data-dimension-orientation={axis === "vertical" ? "vertical" : undefined}
        screenOffsetXPx={axis === "horizontal" ? placement.shift : 0} screenOffsetYPx={axis === "horizontal" ? -6 - placement.lane * LANE_SPACING_PX : -13 - placement.lane * LANE_SPACING_PX} fallbackFontSize={18}>{label.text}</PivotDimensionText>;
    })}
  </g>;
}
