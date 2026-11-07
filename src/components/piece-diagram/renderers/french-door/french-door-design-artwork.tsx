import React from "react";
import type { GlassOverlayRect } from "../glass-appearance";
import { doorFinish } from "../door-finish";
import catalog from "./french-door-designs.json";

type ArtworkKey = keyof typeof catalog;

// Keys identify immutable artwork, independently of the editable sales code or price.
export function frenchDoorArtwork(key?: string | null) {
  return key && Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key as ArtworkKey] : null;
}

type DesignProps = {
  artworkKey?: string | null;
  panes: readonly GlassOverlayRect[];
  frameColor: string;
  finishId: string;
  idNamespace: string;
};

export function FrenchDoorDesignArtwork({ artworkKey, panes, frameColor, finishId, idNamespace }: DesignProps) {
  const design = frenchDoorArtwork(artworkKey);
  if (!design || design.leafCount !== panes.length) return null;
  const first = panes[0];
  const last = panes[panes.length - 1];
  // Project the double motif only once, across the entire span. The meeting stiles
  // interrupt the artwork; flipping hardware must never flip or duplicate the design.
  const bounds = { x: first.x, y: first.y, width: last.x + last.width - first.x, height: first.height };
  const clipId = `${idNamespace}-design-lights`;
  const maskId = `${idNamespace}-design-mask`;
  const edge = doorFinish(frameColor)("#97A2A1", -0.24);
  const viewport = { ...bounds, viewBox: design.viewBox, preserveAspectRatio: "none", overflow: "hidden" } as const;

  return <g data-layer="FRENCH_DOOR_DESIGN" data-artwork-key={artworkKey} pointerEvents="none">
    <defs>
      <clipPath id={clipId}>{panes.map((pane, i) => <rect key={i} {...pane} />)}</clipPath>
      <mask id={maskId} maskUnits="userSpaceOnUse" {...bounds}>
        <svg {...viewport} fill="none" stroke="white">
          {design.paths.map(({ d, width }, i) => <path key={i} d={d} strokeWidth={width} />)}
        </svg>
      </mask>
    </defs>
    <g clipPath={`url(#${clipId})`}>
      <svg {...viewport} fill="none" stroke={edge}>
        {design.paths.map(({ d, width }, i) => <path key={i} d={d} strokeWidth={width + 9} />)}
      </svg>
      <rect {...bounds} fill={`url(#${finishId})`} mask={`url(#${maskId})`} />
    </g>
  </g>;
}
