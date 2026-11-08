import React from "react";
import type { GlassOverlayRect } from "../glass-appearance";
import { doorFinish } from "../door-finish";
import catalog from "./french-door-designs.json";

type ArtworkPath = {
  d: string;
  width: number;
  filled?: boolean;
  fillRule?: "nonzero" | "evenodd";
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  miterLimit?: number;
  clip?: number;
};
type Artwork = {
  leafCount: number;
  viewBox: string;
  paths: ArtworkPath[];
  clips?: GlassOverlayRect[];
  details?: { d: string; width: number }[];
};
const artworks: Record<string, Artwork> = catalog as Record<string, Artwork>;

// Keys identify immutable artwork, independently of the editable sales code or price.
export function frenchDoorArtwork(key?: string | null) {
  return key && Object.prototype.hasOwnProperty.call(artworks, key) ? artworks[key] : null;
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
  const drawPaths = (outline: boolean) => design.paths.map((path, i) => {
    const shape = <path d={path.d} fill={path.filled ? (outline ? edge : "white") : "none"}
      fillRule={path.fillRule} strokeWidth={outline ? path.width + 9 : path.width}
      strokeLinecap={path.lineCap} strokeLinejoin={path.lineJoin} strokeMiterlimit={path.miterLimit} />;
    return <g key={i} clipPath={path.clip === undefined ? undefined : `url(#${idNamespace}-source-clip-${path.clip})`}>{shape}</g>;
  });

  return <g data-layer="FRENCH_DOOR_DESIGN" data-artwork-key={artworkKey} pointerEvents="none">
    <defs>
      <clipPath id={clipId}>{panes.map((pane, i) => <rect key={i} {...pane} />)}</clipPath>
      {design.clips?.map((clip, i) => <clipPath key={i} id={`${idNamespace}-source-clip-${i}`} clipPathUnits="userSpaceOnUse"><rect {...clip} /></clipPath>)}
      <mask id={maskId} maskUnits="userSpaceOnUse" {...bounds}>
        <svg {...viewport} fill="none" stroke="white">
          {drawPaths(false)}
        </svg>
      </mask>
    </defs>
    <g clipPath={`url(#${clipId})`}>
      <svg {...viewport} fill="none" stroke={edge}>
        {drawPaths(true)}
      </svg>
      <rect {...bounds} fill={`url(#${finishId})`} mask={`url(#${maskId})`} />
      {design.details && <svg {...viewport} fill="none" stroke={edge} strokeOpacity={0.7} data-part="design-panel-joints">
        {design.details.map((path, i) => <path key={i} d={path.d} strokeWidth={path.width} />)}
      </svg>}
    </g>
  </g>;
}
