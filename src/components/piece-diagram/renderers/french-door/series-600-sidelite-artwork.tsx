import React from "react";
import { doorFinish } from "../door-finish";
import { FrenchDoorFrameSurface } from "./french-door-finishes";
import { joinedJambWidth, type JoinedJambs } from "./series-600-frame-joint";

// The 370 × 1648 exterior reference has the proportions of an 18″ × 80″ sidelite.
// Keep its profiles at the reference depth as the daylight opening changes.
export function frenchDoorSideliteGeometry(width: number, height: number, mirror = false, joined?: JoinedJambs) {
  const profileScale = Math.min(1, width / 8, height / 20);
  const referenceUnit = 80 / 1648;
  const unit = referenceUnit * profileScale;
  const leftSeam = joinedJambWidth((mirror ? 44 : 43) * referenceUnit, joined?.left) * profileScale;
  const rightSeam = width - joinedJambWidth((mirror ? 43 : 44) * referenceUnit, joined?.right) * profileScale;
  const bead = 20 * unit;
  return {
    profileScale, joined,
    leftSeam,
    rightSeam,
    head: 76 * unit,
    sill: height - 84 * unit,
    glass: { x: leftSeam + bead, y: 97 * unit, width: rightSeam - leftSeam - 2 * bead, height: height - (97 + 107) * unit },
  };
}

type ArtworkProps = {
  width: number;
  height: number;
  geometry: ReturnType<typeof frenchDoorSideliteGeometry>;
  frameColor: string;
  idNamespace: string;
};

export function Series600SideliteArtwork({ width, height, geometry, frameColor, idNamespace }: ArtworkProps) {
  const { leftSeam, rightSeam, head, sill, glass, profileScale: p } = geometry;
  const finish = doorFinish(frameColor);
  const finishId = `${idNamespace}-sidelite`;
  const paint = (part: string) => `url(#${finishId}-${part})`;
  const { x, y } = glass;
  const right = x + glass.width;
  const bottom = y + glass.height;
  const seal = 0.17 * p;

  return <g data-layer="FRENCH_DOOR_STRUCTURE" data-artwork="vector">
    <FrenchDoorFrameSurface idNamespace={finishId} frameColor={frameColor} width={width} height={height}
      profileScale={p} joined={geometry.joined} part="sidelite-frame" includeHardware={false} />
    <rect x={leftSeam} width={rightSeam - leftSeam} height={height} fill={paint("finish")} data-part="sidelite-profile" />

    {/* Fixed head and sill rails butt into the full-height side stiles. */}
    <path d={`M${leftSeam} 0V${height} M${rightSeam} 0V${height}`}
      fill="none" stroke={finish("#A7B0AF", -0.27)} strokeWidth={0.065 * p} />
    <path d={`M0 ${0.065*p}H${width} M${leftSeam} ${sill}H${rightSeam}`}
      fill="none" stroke="white" strokeOpacity=".7" strokeWidth={0.12 * p} />
    <path d={`M0 ${height-0.06*p}H${width} M${leftSeam} ${head}H${rightSeam}`}
      fill="none" stroke={finish("#899593", -0.38)} strokeWidth={0.12 * p} />

    {/* Beveled stops follow the opening. Light stays on the same side when the panel moves. */}
    <path d={`M${leftSeam} ${head}H${rightSeam}L${right} ${y}H${x}Z`}
      fill={finish("#899593", -0.38)} fillOpacity=".18" />
    <path d={`M${rightSeam} ${head}V${sill}L${right} ${bottom}V${y}Z`}
      fill={finish("#809192", -0.34)} fillOpacity=".24" />
    <path d={`M${leftSeam} ${head}L${x} ${y}V${bottom}L${leftSeam} ${sill}Z
      M${leftSeam} ${sill}L${x} ${bottom}H${right}L${rightSeam} ${sill}Z`}
      fill="white" fillOpacity=".16" />
    <rect x={x-seal} y={y-seal} width={glass.width+2*seal} height={glass.height+2*seal}
      fill={finish("#617071", -0.52)} />
    <path d={`M${x-seal/2} ${bottom}V${y-seal/2}H${right}`}
      fill="none" stroke={finish("#A7B2B0", -0.28)} strokeWidth={seal} />
    <rect {...glass} fill={paint("glass")} data-part="sidelite-glass" />
  </g>;
}
