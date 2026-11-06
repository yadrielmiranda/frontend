import React from "react";
import { doorFinish } from "../door-finish";
import type { GlassOverlayRect } from "../glass-appearance";
import { FrenchDoorFrameSurface } from "./french-door-finishes";
import { joinedJambWidth, type JoinedJambs } from "./series-600-frame-joint";

type Side = "left" | "right";

/** Visual offsets from the 944 × 1120 exterior reference, expressed in diagram inches. */
export function doubleFrenchDoorGeometry(width: number, height: number, activeLeaf: Side, joined?: JoinedJambs) {
  const profileScale = Math.min(1, width / 36, height / 44);
  const referenceJamb = 1.86;
  const leftJamb = joinedJambWidth(referenceJamb, joined?.left) * profileScale;
  const rightJamb = joinedJambWidth(referenceJamb, joined?.right) * profileScale;
  const openingLeft = leftJamb;
  const openingRight = width - rightJamb;
  const meetingX = width / 2 + (leftJamb - rightJamb) / 2;
  const leafWidth = meetingX - openingLeft;
  // The active leaf has a slightly narrower stile at the meeting edge in the reference.
  const glassFor = (side: Side): GlassOverlayRect => {
    const active = side === activeLeaf;
    const jamb = side === "left" ? leftJamb : rightJamb;
    const extraJamb = jamb - referenceJamb * profileScale;
    const outsideInset = (active ? 6.48 : 6.34) * profileScale + extraJamb;
    const centerInset = (active ? 4.15 : 4.38) * profileScale;
    const y = 6.13 * profileScale;
    return {
      x: side === "left" ? outsideInset : meetingX + centerInset,
      y,
      width: (side === "left" ? meetingX : width - meetingX) - outsideInset - centerInset,
      height: height - y - 5.75 * profileScale,
    };
  };
  return { profileScale, openingLeft, openingRight, meetingX, leafWidth, joined, leftGlass: glassFor("left"), rightGlass: glassFor("right") };
}

type ArtworkProps = {
  width: number;
  height: number;
  geometry: ReturnType<typeof doubleFrenchDoorGeometry>;
  idNamespace: string;
  frameColor: string;
  activeLeaf: Side;
  boreCount: 2 | 3;
};

export function Series600DoubleArtwork({ width, height, geometry, idNamespace, frameColor, activeLeaf, boreCount }: ArtworkProps) {
  const { leftGlass, rightGlass, profileScale: p, openingLeft, openingRight, meetingX: mid, leafWidth } = geometry;
  const prefix = `${idNamespace}-double`;
  const paint = (surface: string) => `url(#${prefix}-${surface})`;
  const finish = doorFinish(frameColor);
  const head = 0.82 * p;
  const sill = height - 0.80 * p;
  const astragalWidth = 0.56 * p;
  const bead = 0.74 * p;

  const hardwareInset = 1.86 * p;
  const activeBoreX = activeLeaf === "left" ? mid - hardwareInset : mid + hardwareInset;
  const lowerBoreY = height / 2;
  const bores = [
    { role: "active-upper", x: activeBoreX, y: lowerBoreY - 3.82 * p },
    { role: "active-lower", x: activeBoreX, y: lowerBoreY },
  ];
  if (boreCount === 3) bores.push({ role: "inactive", x: 2 * mid - activeBoreX, y: lowerBoreY });

  // The middle hinge sits a little above the midpoint of the hinge run on both leaves.
  const topHinge = 9.45 * p;
  const bottomHinge = height - 11.2 * p;
  const hingeCenters = [topHinge, topHinge + (bottomHinge - topHinge) * 0.435, bottomHinge];

  return <g data-layer="FRENCH_DOOR_STRUCTURE" data-artwork="vector">
    <FrenchDoorFrameSurface idNamespace={prefix} frameColor={frameColor} width={width} height={height}
      profileScale={p} joined={geometry.joined} part="double-frame" />
    <path d={`M0 ${0.13*p}H${width} M0 ${height-0.12*p}H${width}`}
      fill="none" stroke={finish("#667270", -0.4)} strokeWidth={0.15*p} />
    <path d={`M0 0L${openingLeft} ${head} M${width} 0L${openingRight} ${head} M0 ${height}L${openingLeft} ${sill} M${width} ${height}L${openingRight} ${sill}`}
      fill="none" stroke={finish("#BFC7C5", -0.18)} strokeWidth={0.055*p} />

    {([["left", leftGlass], ["right", rightGlass]] as const).map(([side, glass]) => {
      const left = side === "left" ? openingLeft : mid;
      const innerRight = glass.x + glass.width;
      const innerBottom = glass.y + glass.height;
      const beadLeft = glass.x - bead;
      const beadTop = glass.y - bead;
      const beadRight = innerRight + bead;
      const beadBottom = innerBottom + bead;
      return <g key={side} data-leaf-side={side}>
        <rect x={left} y={head} width={leafWidth} height={sill-head}
          fill={paint("finish")} stroke={finish("#98A5A7", -0.32)} strokeWidth={0.12*p} data-part="double-leaf" />
        <path d={`M${beadLeft} ${head}V${sill} M${beadRight} ${head}V${sill}`}
          fill="none" stroke={finish("#C1C7C6", -0.18)} strokeWidth={0.055*p} />
        <path d={`M${beadLeft} ${beadTop}H${beadRight}L${innerRight} ${glass.y}H${glass.x}Z`}
          fill="white" fillOpacity=".18" />
        <path d={`M${beadLeft} ${beadTop}L${glass.x} ${glass.y}V${innerBottom}L${beadLeft} ${beadBottom}Z
          M${beadLeft} ${beadBottom}L${glass.x} ${innerBottom}H${innerRight}L${beadRight} ${beadBottom}Z`}
          fill="#625C64" fillOpacity=".045" />
        <path d={`M${beadRight} ${beadTop}V${beadBottom}L${innerRight} ${innerBottom}V${glass.y}Z`}
          fill="white" fillOpacity=".14" />
        <path d={`M${beadLeft} ${beadBottom}V${beadTop}H${beadRight} M${beadLeft} ${beadBottom}H${beadRight}`}
          fill="none" stroke="white" strokeOpacity=".66" strokeWidth={0.085*p} />
        <rect {...glass} fill={paint("glass")} data-part="double-glass" />
        <path d={`M${glass.x} ${innerBottom}V${glass.y}H${innerRight}`}
          fill="none" stroke={finish("#869090", -0.38)} strokeWidth={0.12*p} />
        <path d={`M${glass.x} ${innerBottom}H${innerRight}V${glass.y}`}
          fill="none" stroke="white" strokeOpacity=".75" strokeWidth={0.09*p} />
      </g>;
    })}
    <path d={`M${openingLeft} ${head}H${openingRight} M${openingLeft} ${sill}H${openingRight}`}
      fill="none" stroke={finish("#485654", -0.55)} strokeWidth={0.13*p} />
    <rect x={mid - astragalWidth / 2} y={head} width={astragalWidth} height={sill-head}
      fill={paint("jamb")} stroke={finish("#9EA9A8", -0.29)} strokeWidth={0.07*p} data-part="meeting-stile" />
    <path d={`M${mid-astragalWidth/2+0.07*p} ${head}V${sill}`}
      fill="none" stroke="white" strokeOpacity=".6" strokeWidth={0.09*p} />

    {bores.map(({ role, x, y }) => <g key={role}>
      <circle cx={x} cy={y+0.04*p} r={0.98*p} fill={frameColor} stroke="white" strokeOpacity=".62" strokeWidth={0.07*p} />
      <circle cx={x} cy={y} r={0.89*p} fill={paint("bore")} stroke="#484342" strokeWidth={0.035*p}
        data-part="lock-bore" data-bore-role={role} />
    </g>)}
    {[openingLeft, openingRight].map(x => <g key={x}>
      {hingeCenters.map(y => <g key={y} transform={`translate(${x} ${y}) scale(${p})`} data-part="barrel-hinge">
        <rect x="-.30" y="-2.53" width=".76" height="5.34" rx=".11" fill="#211D20" opacity=".25" />
        <rect x="-.31" y="-2.63" width=".62" height="5.26" rx=".11" fill={frameColor} />
        <rect x="-.31" y="-2.63" width=".62" height="5.26" rx=".11" fill={paint("barrel")} />
        <path d="M-.30 -.88h.60M-.30 .88h.60" stroke="#302C30" strokeOpacity=".62" strokeWidth=".08" />
        <path d="M-.26 -.80h.52M-.26 .96h.52M-.21 -2.55h.42" stroke="white" strokeOpacity=".63" strokeWidth=".07" />
      </g>)}
    </g>)}
  </g>;
}
