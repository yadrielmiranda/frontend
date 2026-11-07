import React from "react";
import { doorFinish } from "../door-finish";
import { FrenchDoorFrameSurface } from "./french-door-finishes";
import { joinedJambWidth, type JoinedJambs } from "./series-600-frame-joint";

// Exterior, hinge-right reference. The 586 × 1466 frame crop has the proportions
// of a 32 × 80 door. These are visual offsets in inches, not fabrication sizes.
export function singleFrenchDoorGeometry(width: number, height: number, hingeSide: "left" | "right" = "right", joined?: JoinedJambs) {
  const profileScale = Math.min(1, width / 18, height / 44);
  // The artwork is hinge-right before its exterior handedness transform.
  const artworkJoins = joined && hingeSide === "left" ? { left: joined.right, right: joined.left } : joined;
  const jambLeft = joinedJambWidth(1.52, artworkJoins?.left) * profileScale;
  const jambRight = width - joinedJambWidth(1.72, artworkJoins?.right) * profileScale;
  const glassLeft = jambLeft + 4.16 * profileScale;
  const glassRight = jambRight - 4.23 * profileScale;
  const top = 5.57 * profileScale;
  const bottom = 5.4 * profileScale;
  return {
    profileScale, jambLeft, jambRight, joined: artworkJoins,
    glass: { x: glassLeft, y: top, width: glassRight - glassLeft, height: height - top - bottom },
  };
}

type ArtworkProps = {
  width: number;
  height: number;
  geometry: ReturnType<typeof singleFrenchDoorGeometry>;
  idNamespace: string;
  frameColor: string;
  showHardware?: boolean;
};

export function Series600SingleArtwork({ width, height, geometry, idNamespace, frameColor, showHardware = true }: ArtworkProps) {
  const { profileScale: p, glass, jambLeft, jambRight } = geometry;
  const finish = doorFinish(frameColor);
  const finishId = `${idNamespace}-single`;
  const paint = (part: string) => `url(#${finishId}-${part})`;
  const head = 1.04 * p;
  const sill = height - 0.92 * p;
  const leaf = { x: jambLeft, y: head, width: jambRight - jambLeft, height: sill - head };
  const beadWidth = 0.73 * p;
  const beadLeft = glass.x - beadWidth;
  const beadRight = glass.x + glass.width + beadWidth;
  const beadTop = glass.y - beadWidth;
  const beadBottom = glass.y + glass.height + beadWidth;
  const glassRight = glass.x + glass.width;
  const glassBottom = glass.y + glass.height;
  const hingeTop = 11.45 * p;
  const hingeBottom = height - 10.9 * p;
  const lowerBore = height / 2;
  const boreX = jambLeft + 1.7 * p;

  return <g data-layer="FRENCH_DOOR_STRUCTURE" data-artwork="vector">
    <FrenchDoorFrameSurface idNamespace={finishId} frameColor={frameColor} width={width} height={height}
      profileScale={p} joined={geometry.joined} part="single-frame" />
    <path d={`M0 ${0.10*p}H${width}M0 ${height-0.06*p}H${width}`}
      fill="none" stroke="#211F20" strokeOpacity=".48" strokeWidth={0.12*p} />
    <path d={`M${jambLeft} ${head}L${jambLeft-0.64*p} 0M${jambRight} ${head}l${0.32*p} ${-head}
      M${jambLeft} ${sill}l${-0.75*p} ${height-sill}M${jambRight} ${sill}l${0.38*p} ${height-sill}`}
      fill="none" stroke="#474347" strokeOpacity=".2" strokeWidth={0.045*p} />

    <rect {...leaf} fill={paint("finish")} stroke={finish("#98A5A7", -0.32)} strokeWidth={0.12*p} data-part="single-leaf" />
    <path d={`M${jambLeft} ${head}H${jambRight}M${jambLeft} ${sill}H${jambRight}`}
      fill="none" stroke="#171618" strokeWidth={0.14*p} />
    <path d={`M${jambLeft+0.12*p} ${head+0.14*p}H${jambRight-0.10*p}M${jambLeft} ${sill+0.12*p}H${jambRight}`}
      fill="none" stroke="white" strokeOpacity=".58" strokeWidth={0.065*p} />
    <path d={`M${jambLeft+0.5*p} ${head+0.15*p}V${sill}M${beadLeft} ${head+0.12*p}V${sill}
      M${beadRight} ${head+0.12*p}V${sill}`}
      fill="none" stroke="#494449" strokeOpacity=".23" strokeWidth={0.055*p} />

    {/* The glazing bead stands slightly proud of the stiles. Keep its reveal the same width at any size. */}
    <path d={`M${beadLeft} ${beadTop}H${beadRight}L${glassRight} ${glass.y}H${glass.x}Z`}
      fill="white" fillOpacity=".18" />
    <path d={`M${beadLeft} ${beadTop}L${glass.x} ${glass.y}V${glassBottom}L${beadLeft} ${beadBottom}Z`}
      fill="#625C64" fillOpacity=".047" />
    <path d={`M${beadRight} ${beadTop}V${beadBottom}L${glassRight} ${glassBottom}V${glass.y}Z`}
      fill="white" fillOpacity=".14" />
    <path d={`M${beadLeft} ${beadBottom}L${glass.x} ${glassBottom}H${glassRight}L${beadRight} ${beadBottom}Z`}
      fill="#625C64" fillOpacity=".045" />
    <path d={`M${beadLeft} ${beadBottom}V${beadTop}H${beadRight}M${beadLeft} ${beadBottom}H${beadRight}`}
      fill="none" stroke="white" strokeOpacity=".68" strokeWidth={0.085*p} />
    <rect {...glass} fill={paint("glass")} data-part="single-glass" />
    <path d={`M${glass.x} ${glassBottom}V${glass.y}H${glassRight}`}
      fill="none" stroke="#5B555C" strokeOpacity=".3" strokeWidth={0.08*p} />
    <path d={`M${glass.x} ${glassBottom}H${glassRight}V${glass.y}`}
      fill="none" stroke="white" strokeOpacity=".74" strokeWidth={0.09*p} />

    {showHardware && [lowerBore - 3.82*p, lowerBore].map(cy => <g key={cy}>
      <circle cx={boreX} cy={cy+0.04*p} r={0.955*p} fill={frameColor}
        stroke="white" strokeOpacity=".58" strokeWidth={0.07*p} />
      <circle cx={boreX} cy={cy} r={0.88*p} fill={paint("bore")}
        stroke="#484342" strokeWidth={0.035*p} data-part="lock-bore" />
    </g>)}
    {showHardware && [hingeTop, (hingeTop+hingeBottom)/2, hingeBottom].map(cy =>
      <g key={cy} transform={`translate(${jambRight} ${cy}) scale(${p})`} data-part="barrel-hinge">
        <rect x="-.28" y="-3.40" width=".8" height="7.14" rx=".13" fill="#211D20" opacity=".26" />
        <rect x="-.32" y="-3.54" width=".66" height="7.08" rx=".12" fill={frameColor} />
        <rect x="-.32" y="-3.54" width=".66" height="7.08" rx=".12" fill={paint("barrel")} />
        <path d="M-.31 -1.17h.64M-.31 1.19h.64" stroke="#302C30" strokeOpacity=".62" strokeWidth=".085" />
        <path d="M-.27 -1.07h.56M-.27 1.29h.56M-.23 -3.46h.45" stroke="white" strokeOpacity=".63" strokeWidth=".07" />
      </g>)}
  </g>;
}
