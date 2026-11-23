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
  // Center this source path on its own glass pane, preserving its size.
  centerOnLeaf?: boolean;
};
type Artwork = {
  leafCount: number;
  // ECO sources describe each glass opening independently of the meeting stiles.
  projection?: "leaf";
  viewBox: string;
  paths: ArtworkPath[];
  clips?: GlassOverlayRect[];
  details?: { d: string; width: number; clip?: number }[];
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
  const projectLeaf = (shape: React.ReactElement, clip: number | undefined, key: number) => {
    if (design.projection !== "leaf" || clip === undefined) return shape;
    const source = design.clips?.[clip];
    const pane = panes[clip];
    if (!source || !pane) return null;
    const [x, y, width, height] = design.viewBox.split(" ").map(Number);
    // These coordinates live inside the outer SVG. The nested viewport maps the
    // complete source opening onto the actual pane, including its exact center.
    return <svg key={key}
      x={x + (pane.x - bounds.x) * width / bounds.width}
      y={y + (pane.y - bounds.y) * height / bounds.height}
      width={pane.width * width / bounds.width} height={pane.height * height / bounds.height}
      viewBox={`${source.x} ${source.y} ${source.width} ${source.height}`}
      preserveAspectRatio="none" overflow="hidden" data-leaf-projection={clip}>
      {shape}
    </svg>;
  };
  const drawPaths = (outline: boolean) => design.paths.map((path, i) => {
    const pane = path.centerOnLeaf && path.clip !== undefined ? panes[path.clip] : undefined;
    const sourceClip = path.centerOnLeaf && path.clip !== undefined ? design.clips?.[path.clip] : undefined;
    let centerOffset: number | undefined;
    if (pane && sourceClip) {
      const [sourceX, , sourceWidth] = design.viewBox.split(" ").map(Number);
      centerOffset = sourceX + (pane.x + pane.width / 2 - bounds.x) * sourceWidth / bounds.width
        - (sourceClip.x + sourceClip.width / 2);
    }
    const shape = <path d={path.d} fill={path.filled ? (outline ? edge : "white") : "none"}
      fillRule={path.fillRule} strokeWidth={outline ? path.width + 9 : path.width}
      strokeLinecap={path.lineCap} strokeLinejoin={path.lineJoin} strokeMiterlimit={path.miterLimit}
      transform={centerOffset === undefined ? undefined : `translate(${centerOffset} 0)`} />;
    return projectLeaf(<g key={i} clipPath={path.clip === undefined ? undefined : `url(#${idNamespace}-source-clip-${path.clip})`}>{shape}</g>, path.clip, i);
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
        {design.details.map((path, i) => projectLeaf(<path key={i} d={path.d} strokeWidth={path.width} />, path.clip, i))}
      </svg>}
    </g>
  </g>;
}
