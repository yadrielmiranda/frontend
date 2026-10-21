import React from "react";
import {
  GlassAppearanceLayer,
  type GlassOverlayRect,
} from "../glass-appearance";
import { MuntinLayer, type ResolvedMuntin } from "../muntin-layer";

type Rect = GlassOverlayRect;
const SOURCE_SIZE = 1254;
const UNITS_PER_INCH = 16;

export function pictureWindowLayout(
  width: number,
  height: number,
  sourceFrame: Rect,
  sourceGlass: Rect,
  referenceWidth: number,
) {
  // One scale for every profile and corner, independent of the requested size.
  // The approved reference supplies the profile; only the rail lengths change.
  const profileScale = (referenceWidth * UNITS_PER_INCH) / sourceFrame.width;
  const left = (sourceGlass.x - sourceFrame.x) * profileScale;
  const top = (sourceGlass.y - sourceFrame.y) * profileScale;
  const right =
    (sourceFrame.x + sourceFrame.width - sourceGlass.x - sourceGlass.width) *
    profileScale;
  const bottom =
    (sourceFrame.y + sourceFrame.height - sourceGlass.y - sourceGlass.height) *
    profileScale;
  const frame = {
    x: 0,
    y: 0,
    width: width * UNITS_PER_INCH,
    height: height * UNITS_PER_INCH,
  };
  const glass = {
    x: left,
    y: top,
    width: frame.width - left - right,
    height: frame.height - top - bottom,
  };
  return { frame, glass, profileScale, unitsPerInch: UNITS_PER_INCH };
}

export type PictureWindowLayout = ReturnType<typeof pictureWindowLayout>;

function SourceSlice({
  source,
  target,
  href,
  children,
  part,
}: {
  source: Rect;
  target: Rect;
  href: string;
  children?: React.ReactNode;
  part?: string;
}) {
  return (
    <svg
      {...target}
      viewBox={`${source.x} ${source.y} ${source.width} ${source.height}`}
      preserveAspectRatio="none"
      overflow="hidden"
      data-part={part}
    >
      <g style={{ isolation: "isolate" }}>
        <image
          href={href}
          width={SOURCE_SIZE}
          height={SOURCE_SIZE}
          preserveAspectRatio="none"
        />
        {children}
      </g>
    </svg>
  );
}

export function PictureWindowArtwork({
  layout,
  sourceFrame,
  sourceGlass,
  sourceIndicator,
  href,
  frameMaskId,
  frameColorHex,
  glassTintHex,
  hasCoating,
  hasPrivacy,
  muntin,
  idNamespace,
}: {
  layout: PictureWindowLayout;
  sourceFrame: Rect;
  sourceGlass: Rect;
  sourceIndicator: Rect;
  href: string;
  frameMaskId: string;
  frameColorHex: string;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  muntin?: ResolvedMuntin | null;
  idNamespace: string;
}) {
  const { frame, glass, profileScale, unitsPerInch } = layout;
  const sourceX = [
    sourceFrame.x,
    sourceGlass.x,
    sourceGlass.x + sourceGlass.width,
    sourceFrame.x + sourceFrame.width,
  ];
  const sourceY = [
    sourceFrame.y,
    sourceGlass.y,
    sourceGlass.y + sourceGlass.height,
    sourceFrame.y + sourceFrame.height,
  ];
  const targetX = [
    frame.x,
    glass.x,
    glass.x + glass.width,
    frame.x + frame.width,
  ];
  const targetY = [
    frame.y,
    glass.y,
    glass.y + glass.height,
    frame.y + frame.height,
  ];
  const glassClipId = `${idNamespace}-picture-glass`;
  const appearance = { glassTintHex, hasCoating, hasPrivacy };
  const indicator = {
    x: glass.x + (glass.width - sourceIndicator.width * profileScale) / 2,
    y: glass.y + (glass.height - sourceIndicator.height * profileScale) / 2,
    width: sourceIndicator.width * profileScale,
    height: sourceIndicator.height * profileScale,
  };

  return (
    <g
      data-layer="STRUCTURAL_BASE"
      data-part="picture-window-frame"
      data-width={frame.width}
      data-height={frame.height}
      data-units-per-inch={unitsPerInch}
    >
      <defs>
        <clipPath id={glassClipId}>
          <rect {...glass} data-part="picture-window-glass" />
        </clipPath>
      </defs>
      {/* A continuous finish under the slices prevents subpixel seams at joins. */}
      <rect {...frame} fill={frameColorHex} />
      {/* Reuse an unmarked portion of the approved glass, keeping its baked-in O
        separate so neither the indicator nor the frame stretches with it. */}
      {glass.width > 0 && glass.height > 0 && (
        <g clipPath={`url(#${glassClipId})`}>
          <SourceSlice
            href={href}
            target={glass}
            source={{
              x: sourceGlass.x + 2,
              y: sourceGlass.y + 2,
              width: sourceGlass.width - 4,
              height: sourceIndicator.y - sourceGlass.y - 4,
            }}
            part="picture-window-glass-texture"
          />
          <GlassAppearanceLayer rects={[glass]} {...appearance} />
          <MuntinLayer
            muntin={muntin}
            glassPanels={[
              {
                panelIndex: 1,
                panelCode: "O",
                panelLabel: "Center",
                rect: glass,
              },
            ]}
            frameColorHex={frameColorHex}
            unitsPerInch={unitsPerInch}
            idNamespace={idNamespace}
          />
          <g data-layer="FIXED_INDICATOR">
            <SourceSlice
              href={href}
              source={sourceIndicator}
              target={indicator}
              part="picture-window-indicator"
            />
            <GlassAppearanceLayer rects={[indicator]} {...appearance} />
          </g>
        </g>
      )}
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((column) => {
          if (row === 1 && column === 1) return null;
          const source = {
            x: sourceX[column],
            y: sourceY[row],
            width: sourceX[column + 1] - sourceX[column],
            height: sourceY[row + 1] - sourceY[row],
          };
          const target = {
            x: targetX[column],
            y: targetY[row],
            width: targetX[column + 1] - targetX[column],
            height: targetY[row + 1] - targetY[row],
          };
          if (target.width <= 0 || target.height <= 0) return null;
          return (
            <SourceSlice
              key={`${row}-${column}`}
              source={source}
              target={target}
              href={href}
              part={`picture-window-profile-${row}-${column}`}
            >
              {frameColorHex !== "#FFFFFF" && (
                <rect
                  width={SOURCE_SIZE}
                  height={SOURCE_SIZE}
                  fill={frameColorHex}
                  mask={`url(#${frameMaskId})`}
                  style={{ mixBlendMode: "multiply" }}
                  data-layer="WINDOW_FRAME_FINISH"
                />
              )}
            </SourceSlice>
          );
        }),
      )}
    </g>
  );
}
