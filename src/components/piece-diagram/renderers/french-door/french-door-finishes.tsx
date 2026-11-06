import React from "react";
import { doorFinish, DoorFrameGradient, DoorLeafGradient } from "../door-finish";
import { JOINED_JAMB_INCHES, type JoinedJambs } from "./series-600-frame-joint";

type FrameSurfaceProps = {
  idNamespace: string; frameColor: string; includeHardware?: boolean;
  width: number; height: number; profileScale: number; joined?: JoinedJambs;
  part: "single-frame" | "double-frame" | "sidelite-frame";
};

export function FrenchDoorFrameSurface({
  idNamespace, frameColor, includeHardware = true, width, height, profileScale, joined, part,
}: FrameSurfaceProps) {
  const finish = doorFinish(frameColor);
  const id = (part: string) => `${idNamespace}-${part}`;
  const faceWidth = JOINED_JAMB_INCHES * profileScale;
  const profilePaint = `url(#${id("finish")})`;
  return <>
    <defs>
      <DoorLeafGradient id={id("finish")} finish={finish} joinedHeight={joined?.left || joined?.right ? height : undefined} />
      <DoorFrameGradient id={id("jamb")} finish={finish} />
      <linearGradient id={id("glass")} x1="0%" y1="8%" x2="100%" y2="88%">
        <stop stopColor="#ECEBED" />
        <stop offset=".16" stopColor="#EAE9EB" />
        <stop offset=".27" stopColor="#E3E2E4" />
        <stop offset=".52" stopColor="#E2E1E3" />
        <stop offset=".68" stopColor="#E6E5E7" />
        <stop offset=".83" stopColor="#E2E1E3" />
        <stop offset="1" stopColor="#E4E3E5" />
      </linearGradient>
      {includeHardware && <>
        <linearGradient id={id("barrel")} x2="100%" y2="0%">
          <stop stopColor="#272529" stopOpacity=".48" />
          <stop offset=".15" stopColor="#787479" stopOpacity=".3" />
          <stop offset=".32" stopColor="white" stopOpacity=".45" />
          <stop offset=".61" stopColor="white" stopOpacity=".24" />
          <stop offset=".85" stopColor="#8D888D" stopOpacity=".32" />
          <stop offset="1" stopColor="#252329" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id={id("bore")} cx="82%" cy="78%" r="83%">
          <stop stopColor="#373431" />
          <stop offset=".56" stopColor="#292622" />
          <stop offset=".83" stopColor="#12100F" />
          <stop offset="1" stopColor="#080807" />
        </radialGradient>
      </>}
    </defs>
    <rect x={0} y={0} width={width} height={height} fill={`url(#${id("jamb")})`} data-part={part} />
    {joined?.left && <rect x={0} y={0} width={faceWidth} height={height} fill={profilePaint} data-part="joined-frame-face" />}
    {joined?.right && <rect x={width - faceWidth} y={0} width={faceWidth} height={height} fill={profilePaint} data-part="joined-frame-face" />}
  </>;
}
