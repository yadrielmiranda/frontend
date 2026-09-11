import React, { useId } from "react";

import { formatInchesFromEighthStep } from "@/lib/dimensions";

import {
  DIMENSION_COLOR,
  dimensionMetrics,
  expandedViewBox,
} from "../dimension-style";
import { DimensionText } from "../dimension-text";
import type { MullionDiagramSpec } from "./mullion-spec";

export interface MullionDiagramProps {
  spec: MullionDiagramSpec;
  length: number;
  frameColorHex?: string | null;
  showDimensions?: boolean;
  className?: string;
}

const METRICS = dimensionMetrics(2048);
// Las cuatro referencias separan los clips del tubo con una franja transparente.
const CLIPS_BOTTOM = 190;
// Tamaños ilustrativos: mejoran la lectura sin triplicar el perfil de 2x6.
// No representan medidas de fabricación ni alteran la longitud solicitada.
const TUBE_VISUAL_HEIGHT_BY_PROFILE: Record<MullionDiagramSpec["profile"], number> = {
  "1x3": 120,
  "1x4": 132,
  "2x4": 146,
  "2x6": 160,
};
// Se amplían los dos clips por igual en ambos ejes, sin deformarlos.
const CLIPS_VISUAL_SCALE = 1.6;
const CLIPS_TUBE_GAP = 28;
// Reduce el contraste de las sombras del PNG, sin desenfoque ni sombra añadida.
const TUBE_SHADOW_CONTRAST = 0.6;
// Borde superior del tubo en cada PNG, para ampliarlo sin desplazarlo hacia los clips.
const TUBE_TOP_BY_PROFILE: Record<MullionDiagramSpec["profile"], number> = {
  "1x3": 230,
  "1x4": 225,
  "2x4": 215,
  "2x6": 205,
};

/** Vista ilustrativa con grosor ampliado para legibilidad; no es un plano a escala. */
export function MullionDiagram({
  spec,
  length,
  frameColorHex,
  showDimensions = true,
  className,
}: MullionDiagramProps) {
  const id = `mullion-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!Number.isFinite(length) || length <= 0) return null;

  const color = frameColorHex?.trim();
  const frameColor = color && /^#[0-9a-f]{6}$/i.test(color)
    ? color.toUpperCase()
    : "#FFFFFF";
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(frameColor.slice(offset, offset + 2), 16) / 255;
    // Conserva las sombras y un reflejo visible incluso para acabados negros.
    return channel + (1 - channel) * 0.16;
  });
  const label = formatInchesFromEighthStep(length);
  const { bounds, image } = spec;
  const leftX = bounds.x;
  const rightX = bounds.x + bounds.width;
  const tubeTop = TUBE_TOP_BY_PROFILE[spec.profile];
  const tubeHeight = TUBE_VISUAL_HEIGHT_BY_PROFILE[spec.profile];
  const tubeScale = tubeHeight / (bounds.y + bounds.height - tubeTop);
  const bottomY = tubeTop + tubeHeight;
  const clipsBaseY = tubeTop - CLIPS_TUBE_GAP;
  const clipsTop = clipsBaseY + (bounds.y - CLIPS_BOTTOM) * CLIPS_VISUAL_SCALE;
  const visualBounds = { ...bounds, y: clipsTop, height: bottomY - clipsTop };
  const clipsTransform = `translate(${(leftX + rightX) / 2} ${clipsBaseY}) scale(${CLIPS_VISUAL_SCALE}) translate(${-image.width / 2} ${-CLIPS_BOTTOM})`;
  const tubeTransform = `translate(0 ${tubeTop}) scale(1 ${tubeScale}) translate(0 ${-tubeTop})`;
  const dimensionY = bottomY + 64;
  const textY = dimensionY + 110;
  const viewBox = expandedViewBox(visualBounds, {
    top: 28,
    right: 72,
    bottom: showDimensions ? 320 : 28,
    left: 72,
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={`${id}-title`}
      className={className}
      data-family="LINEAR_MATERIAL"
      data-renderer="CLIPPED_TUBE_MULLION"
      data-profile={spec.profile}
      data-length-in={length}
      data-frame-color={frameColor}
      data-view="REFERENCE_ILLUSTRATION"
    >
      <title id={`${id}-title`}>
        {`${spec.profile} Standard Mullion W/Clips, length ${label} inches`}
      </title>
      <desc>
        Reference illustration of a rectangular tube and two clips. Tube thickness
        is enlarged for visibility. The length label is the requested cut length;
        the illustration is not to scale.
      </desc>
      <defs>
        <clipPath id={`${id}-clips`}>
          <rect x={0} y={0} width={image.width} height={CLIPS_BOTTOM} />
        </clipPath>
        <clipPath id={`${id}-tube`}>
          <rect x={0} y={CLIPS_BOTTOM} width={image.width} height={image.height - CLIPS_BOTTOM} />
        </clipPath>
        <filter
          id={`${id}-finish`}
          x="0%" y="0%" width="100%" height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* El acabado mantiene el tono elegido; se aclaran solo sus zonas sombreadas. */}
          <feComponentTransfer>
            <feFuncR type="linear" slope={channels[0] * TUBE_SHADOW_CONTRAST} intercept={channels[0] * (1 - TUBE_SHADOW_CONTRAST)} />
            <feFuncG type="linear" slope={channels[1] * TUBE_SHADOW_CONTRAST} intercept={channels[1] * (1 - TUBE_SHADOW_CONTRAST)} />
            <feFuncB type="linear" slope={channels[2] * TUBE_SHADOW_CONTRAST} intercept={channels[2] * (1 - TUBE_SHADOW_CONTRAST)} />
            <feFuncA type="identity" />
          </feComponentTransfer>
        </filter>
      </defs>
      <g data-layer="MULLION_REFERENCE">
        {/* Clips más visibles, centrados sobre el tubo y con el aluminio original. */}
        <g transform={clipsTransform} data-clips-visual-scale={CLIPS_VISUAL_SCALE}>
          <image
            href={image.src}
            x={0} y={0} width={image.width} height={image.height}
            clipPath={`url(#${id}-clips)`}
            data-layer="MULLION_CLIPS"
          />
        </g>
        {/* La ampliación solo afecta al tubo. Las cotas usan sus nuevos límites visuales. */}
        <g transform={tubeTransform} data-tube-visual-scale={tubeScale}>
          <g clipPath={`url(#${id}-tube)`}>
            <image
              href={image.src}
              x={0} y={0} width={image.width} height={image.height}
              filter={`url(#${id}-finish)`}
              data-layer="MULLION_TUBE"
            />
          </g>
        </g>
      </g>
      {showDimensions ? (
        <g
          stroke={DIMENSION_COLOR}
          strokeWidth={METRICS.strokeWidth}
          fill={DIMENSION_COLOR}
          data-layer="MULLION_LENGTH"
        >
          {/* La única dimensión variable es la longitud almacenada en Piece.width. */}
          <path
            d={`M ${leftX} ${bottomY + 14} V ${dimensionY + 18} M ${rightX} ${bottomY + 14} V ${dimensionY + 18} M ${leftX} ${dimensionY} H ${rightX}`}
            fill="none"
          />
          <path
            d={`M ${leftX} ${dimensionY} l ${METRICS.terminalLength} -${METRICS.terminalHalfWidth} v ${METRICS.terminalHalfWidth * 2} Z M ${rightX} ${dimensionY} l -${METRICS.terminalLength} -${METRICS.terminalHalfWidth} v ${METRICS.terminalHalfWidth * 2} Z`}
            stroke="none"
          />
          <DimensionText
            x={(leftX + rightX) / 2}
            y={textY}
            textAnchor="middle"
            dominantBaseline="middle"
            fallbackFontSize={METRICS.fontSize}
            screenFontSizePx={20}
          >
            {`L. ${label}"`}
          </DimensionText>
        </g>
      ) : null}
    </svg>
  );
}
