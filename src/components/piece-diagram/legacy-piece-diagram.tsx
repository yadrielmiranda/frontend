// src/components/piece-diagram.tsx
import React from "react";

import type { DiagramFamily, DimensionMode } from "@/lib/types";

import { DimensionText } from "./renderers/dimension-text";

type DiagramValue = string | number | null | undefined;

export type PieceDiagramVariant = "editor" | "report";

export interface PieceDiagramData {
  width?: DiagramValue;
  height?: DiagramValue;
  heightLeft?: DiagramValue;
  heightRight?: DiagramValue;
  legHeight?: DiagramValue;
  sashHeight?: DiagramValue;
  windowHeight?: DiagramValue;

  doorWidth?: DiagramValue;
  doorHeight?: DiagramValue;
  leftSideliteWidth?: DiagramValue;
  rightSideliteWidth?: DiagramValue;
  leftPanels?: DiagramValue;
  rightPanels?: DiagramValue;
  panelCount?: DiagramValue;
  horizontalHeights?: number[] | null;
}

interface PieceDiagramProps {
  diagramFamily?: DiagramFamily;
  configuration?: string;
  dimensionMode?: DimensionMode;
  piece?: PieceDiagramData;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  variant?: PieceDiagramVariant;
  className?: string;
}

type MovementDirection = "left" | "right";

type HorizontalSliderPanel = {
  code: "X" | "O";
  weight: number;
  direction?: MovementDirection;
};

type HorizontalSliderLayout = {
  panels: HorizontalSliderPanel[];
  groupBreaks: number[];
};

interface ResolvedDimensions {
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number | null;
}

const DEFAULT_GLASS_FILL = "#F7FBFF";

function resolveGlassFill(hexCode?: string | null): string {
  const value = hexCode?.trim();

  return value && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.toUpperCase()
    : DEFAULT_GLASS_FILL;
}

function mixHexColors(
  baseHex: string,
  overlayHex: string,
  overlayWeight: number,
): string {
  const weight = Math.min(Math.max(overlayWeight, 0), 1);

  const mixChannel = (start: number) => {
    const base = Number.parseInt(baseHex.slice(start, start + 2), 16);
    const overlay = Number.parseInt(overlayHex.slice(start, start + 2), 16);

    return Math.round(base * (1 - weight) + overlay * weight)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${mixChannel(1)}${mixChannel(3)}${mixChannel(5)}`.toUpperCase();
}

function resolveFrameFill(hexCode?: string | null): string {
  const value = hexCode?.trim();

  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#FFFFFF";
}

type CircularShapeKey = "CIRCLE" | "HALF_CIRCLE" | "QUARTER_CIRCLE";

function circularShapeKeyFromConfiguration(
  configuration?: string,
): CircularShapeKey | null {
  const value = (configuration ?? "").trim().toLowerCase();

  if (value.includes("half circle")) {
    return "HALF_CIRCLE";
  }

  if (value.includes("quarter")) {
    return "QUARTER_CIRCLE";
  }

  if (value === "circle") {
    return "CIRCLE";
  }

  return null;
}

function supportsCircularShapes(diagramFamily: DiagramFamily): boolean {
  return diagramFamily === "GENERIC" || diagramFamily === "FIXED_SHAPE";
}

function toPositiveNumber(value: DiagramValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toNonNegativeInteger(value: DiagramValue): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function formatDimension(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(3)));
}

function resolveDimensions({
  piece,
  diagramFamily,
  configuration,
}: {
  piece?: PieceDiagramData;
  diagramFamily: DiagramFamily;
  configuration?: string;
}): ResolvedDimensions {
  const standardWidth = toPositiveNumber(piece?.width);
  const standardHeight = toPositiveNumber(piece?.height);

  const circularShape = supportsCircularShapes(diagramFamily)
    ? circularShapeKeyFromConfiguration(configuration)
    : null;

  const derivedShapeHeight =
    standardWidth === null
      ? null
      : circularShape === "HALF_CIRCLE"
        ? standardWidth / 2
        : circularShape === "CIRCLE" || circularShape === "QUARTER_CIRCLE"
          ? standardWidth
          : null;

  const doorWidth = toPositiveNumber(piece?.doorWidth) ?? 0;
  const doorHeight = toPositiveNumber(piece?.doorHeight);

  const leftSideliteWidth = toPositiveNumber(piece?.leftSideliteWidth) ?? 0;

  const rightSideliteWidth = toPositiveNumber(piece?.rightSideliteWidth) ?? 0;

  const leftPanels = toNonNegativeInteger(piece?.leftPanels);
  const rightPanels = toNonNegativeInteger(piece?.rightPanels);

  const calculatedDoorAssemblyWidth =
    doorWidth +
    leftSideliteWidth * leftPanels +
    rightSideliteWidth * rightPanels;

  const resolvedWidth =
    standardWidth ??
    (calculatedDoorAssemblyWidth > 0 ? calculatedDoorAssemblyWidth : null) ??
    doorWidth;

  const resolvedHeight = derivedShapeHeight ?? standardHeight ?? doorHeight;

  if (diagramFamily === "LINEAR_MATERIAL") {
    const materialLength = resolvedWidth ?? 0;

    return {
      width: materialLength,
      height: materialLength > 0 ? Math.max(materialLength * 0.08, 8) : 0,
      displayWidth: materialLength,
      displayHeight: null,
    };
  }

  return {
    width: resolvedWidth ?? 0,
    height: resolvedHeight ?? 0,
    displayWidth: resolvedWidth ?? 0,
    displayHeight: resolvedHeight ?? null,
  };
}

function parseFraction(value: string): number | null {
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) {
    return null;
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    return null;
  }

  return numerator / denominator;
}

function inferMovementDirection(
  group: string,
  panelIndex: number,
): MovementDirection {
  const fixedPanelIndexes = Array.from(group)
    .map((code, index) => ({ code, index }))
    .filter((item) => item.code === "O")
    .map((item) => item.index);

  if (fixedPanelIndexes.length === 0) {
    return panelIndex < group.length / 2 ? "right" : "left";
  }

  const nearestFixedPanel = [...fixedPanelIndexes].sort((a, b) => {
    const distanceA = Math.abs(a - panelIndex);
    const distanceB = Math.abs(b - panelIndex);

    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    return a - b;
  })[0];

  return nearestFixedPanel > panelIndex ? "right" : "left";
}

function parseHorizontalSliderLayout(
  configuration?: string,
): HorizontalSliderLayout {
  const normalized = (configuration ?? "XO")
    .trim()
    .toUpperCase()
    .replace(/\[[^\]]*]/g, " ");

  const patternMatch = normalized.match(/[XO]+(?:-[XO]+)*/);
  const pattern = patternMatch?.[0] ?? "XO";

  const groups = pattern
    .split("-")
    .map((group) => group.trim())
    .filter(Boolean);

  const flatCodes = groups.flatMap((group) =>
    Array.from(group).filter(
      (code): code is "X" | "O" => code === "X" || code === "O",
    ),
  );

  const fractionValues = Array.from(normalized.matchAll(/\d+\s*\/\s*\d+/g))
    .map((match) => parseFraction(match[0]))
    .filter((value): value is number => value !== null);

  const weights =
    fractionValues.length === flatCodes.length
      ? fractionValues
      : flatCodes.map(() => 1);

  const panels: HorizontalSliderPanel[] = [];
  const groupBreaks: number[] = [];

  let globalPanelIndex = 0;

  groups.forEach((group, groupIndex) => {
    Array.from(group).forEach((code, indexInGroup) => {
      if (code !== "X" && code !== "O") {
        return;
      }

      panels.push({
        code,
        weight: weights[globalPanelIndex] ?? 1,
        direction:
          code === "X"
            ? inferMovementDirection(group, indexInGroup)
            : undefined,
      });

      globalPanelIndex += 1;
    });

    if (groupIndex < groups.length - 1) {
      groupBreaks.push(globalPanelIndex);
    }
  });

  if (panels.length === 0) {
    return {
      panels: [
        {
          code: "X",
          weight: 1,
          direction: "right",
        },
        {
          code: "O",
          weight: 1,
        },
      ],
      groupBreaks: [],
    };
  }

  return {
    panels,
    groupBreaks,
  };
}

function MovementArrow({
  x,
  y,
  width,
  direction,
  strokeWidth,
}: {
  x: number;
  y: number;
  width: number;
  direction: MovementDirection;
  strokeWidth: number;
}) {
  const arrowLength = Math.max(width * 0.4, 10);
  const arrowHeadSize = Math.min(Math.max(width * 0.08, 3), 6);

  const centerX = x + width / 2;

  const startX =
    direction === "right"
      ? centerX - arrowLength / 2
      : centerX + arrowLength / 2;

  const endX =
    direction === "right"
      ? centerX + arrowLength / 2
      : centerX - arrowLength / 2;

  const headDirection = direction === "right" ? -1 : 1;

  return (
    <g
      fill="none"
      stroke="black"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={startX} y1={y} x2={endX} y2={y} />

      <polyline
        points={[
          `${endX + headDirection * arrowHeadSize},${y - arrowHeadSize}`,
          `${endX},${y}`,
          `${endX + headDirection * arrowHeadSize},${y + arrowHeadSize}`,
        ].join(" ")}
      />
    </g>
  );
}

function HorizontalSliderDiagram({
  width,
  height,
  configuration,
  variant,
}: {
  width: number;
  height: number;
  configuration?: string;
  variant: PieceDiagramVariant;
}) {
  const layout = parseHorizontalSliderLayout(configuration);

  const frameThickness = Math.min(
    Math.max(Math.min(width, height) * 0.06, 4),
    10,
  );

  const strokeWidth = variant === "report" ? 1.1 : 1.4;
  const arrowStrokeWidth = variant === "report" ? 1.2 : 1.8;

  const innerLeft = frameThickness;
  const innerTop = frameThickness;
  const innerWidth = Math.max(width - frameThickness * 2, 1);
  const innerHeight = Math.max(height - frameThickness * 2, 1);
  const innerRight = innerLeft + innerWidth;
  const innerBottom = innerTop + innerHeight;

  const totalWeight = layout.panels.reduce(
    (total, panel) => total + panel.weight,
    0,
  );

  let currentX = innerLeft;

  const panelGeometries = layout.panels.map((panel) => {
    const panelWidth = innerWidth * (panel.weight / totalWeight);

    const geometry = {
      panel,
      x: currentX,
      width: panelWidth,
    };

    currentX += panelWidth;

    return geometry;
  });

  /*
   * Cada letra representa una hoja completa. Las X se dibujan primero porque
   * corren por el riel interior; las O se dibujan después y quedan al frente
   * en los encuentros, como se ve desde el exterior.
   */
  const desiredSashProfile = Math.max(frameThickness * 0.55, 2);
  const groupBreaks = new Set(layout.groupBreaks);

  const sashGeometries = panelGeometries.map((geometry, index) => {
    const previousPanel = panelGeometries[index - 1]?.panel;
    const nextPanel = panelGeometries[index + 1]?.panel;

    const meetsPreviousPanel =
      previousPanel !== undefined && !groupBreaks.has(index);
    const meetsNextPanel =
      nextPanel !== undefined && !groupBreaks.has(index + 1);

    const leftNeedsOverlap =
      meetsPreviousPanel && previousPanel.code !== geometry.panel.code;
    const rightNeedsOverlap =
      meetsNextPanel && nextPanel.code !== geometry.panel.code;

    const overlapLimit = Math.max(geometry.width * 0.08, 0.75);
    const meetingStileOverlap = Math.min(
      desiredSashProfile * 0.55,
      overlapLimit,
    );

    const sashLeft = Math.max(
      innerLeft,
      geometry.x - (leftNeedsOverlap ? meetingStileOverlap : 0),
    );
    const sashRight = Math.min(
      innerRight,
      geometry.x +
        geometry.width +
        (rightNeedsOverlap ? meetingStileOverlap : 0),
    );
    const sashWidth = Math.max(sashRight - sashLeft, 1);

    const sideProfile = Math.min(
      desiredSashProfile,
      Math.max(sashWidth * 0.2, 0.5),
    );
    const railProfile = Math.min(
      desiredSashProfile,
      Math.max(innerHeight * 0.2, 0.5),
    );

    const glassX = sashLeft + sideProfile;
    const glassY = innerTop + railProfile;
    const glassWidth = Math.max(sashWidth - sideProfile * 2, 1);
    const glassHeight = Math.max(innerHeight - railProfile * 2, 1);

    return {
      ...geometry,
      index,
      sashX: sashLeft,
      sashWidth,
      glassX,
      glassY,
      glassWidth,
      glassHeight,
    };
  });

  const orderedSashes = [...sashGeometries].sort((a, b) => {
    if (a.panel.code !== b.panel.code) {
      return a.panel.code === "X" ? -1 : 1;
    }

    return a.index - b.index;
  });

  const labelFontSize = variant === "report" ? 7 : 9;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      {orderedSashes.map((sash) => (
        <g key={`sash-${sash.panel.code}-${sash.index}`}>
          <rect
            x={sash.sashX}
            y={innerTop}
            width={sash.sashWidth}
            height={innerHeight}
            fill="var(--frame-fill, #FFFFFF)"
            stroke="black"
            strokeWidth={strokeWidth}
          />

          <rect
            x={sash.glassX}
            y={sash.glassY}
            width={sash.glassWidth}
            height={sash.glassHeight}
            fill="var(--glass-fill, #F7FBFF)"
            fillOpacity="var(--glass-opacity, 1)"
            stroke="black"
            strokeWidth={strokeWidth}
          />
        </g>
      ))}

      {layout.groupBreaks.map((breakIndex) => {
        const breakGeometry = panelGeometries[breakIndex];

        if (!breakGeometry) {
          return null;
        }

        const breakX = breakGeometry.x;
        const separation = Math.max(frameThickness * 0.22, 1.5);

        return (
          <g key={`group-break-${breakIndex}`}>
            <rect
              x={breakX - separation}
              y={innerTop}
              width={separation * 2}
              height={innerHeight}
              fill="var(--frame-fill, #FFFFFF)"
            />

            <line
              x1={breakX - separation}
              y1={innerTop}
              x2={breakX - separation}
              y2={innerBottom}
              stroke="black"
              strokeWidth={strokeWidth}
            />

            <line
              x1={breakX + separation}
              y1={innerTop}
              x2={breakX + separation}
              y2={innerBottom}
              stroke="black"
              strokeWidth={strokeWidth}
            />
          </g>
        );
      })}

      {sashGeometries.map((sash) => {
        const glassCenterX = sash.glassX + sash.glassWidth / 2;
        const glassCenterY = sash.glassY + sash.glassHeight / 2;
        const labelY =
          sash.glassY + sash.glassHeight - Math.min(4, sash.glassHeight * 0.2);

        return (
          <g key={`detail-${sash.panel.code}-${sash.index}`}>
            {sash.panel.code === "X" && sash.panel.direction && (
              <MovementArrow
                x={sash.glassX}
                y={glassCenterY}
                width={sash.glassWidth}
                direction={sash.panel.direction}
                strokeWidth={arrowStrokeWidth}
              />
            )}

            <text
              x={glassCenterX}
              y={labelY}
              textAnchor="middle"
              fontSize={labelFontSize}
              fontWeight={600}
              fill="black"
            >
              {sash.panel.code}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function UpArrow({
  x,
  startY,
  endY,
  strokeWidth,
}: {
  x: number;
  startY: number;
  endY: number;
  strokeWidth: number;
}) {
  const arrowHeadSize = Math.min(Math.max(Math.abs(startY - endY) * 0.1, 3), 6);

  return (
    <g
      fill="none"
      stroke="black"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={x} y1={startY} x2={x} y2={endY} />

      <polyline
        points={[
          `${x - arrowHeadSize},${endY + arrowHeadSize}`,
          `${x},${endY}`,
          `${x + arrowHeadSize},${endY + arrowHeadSize}`,
        ].join(" ")}
      />
    </g>
  );
}

function SingleHungDiagram({
  width,
  height,
  actualHeight,
  sashHeight,
  windowHeight,
  variant,
}: {
  width: number;
  height: number;
  actualHeight: number;
  sashHeight?: DiagramValue;
  windowHeight?: DiagramValue;
  variant: PieceDiagramVariant;
}) {
  const frameThickness = Math.min(
    Math.max(Math.min(width, height) * 0.06, 4),
    10,
  );

  const strokeWidth = variant === "report" ? 1.1 : 1.4;

  const innerLeft = frameThickness;
  const innerTop = frameThickness;
  const innerWidth = Math.max(width - frameThickness * 2, 1);
  const innerHeight = Math.max(height - frameThickness * 2, 1);
  const innerBottom = innerTop + innerHeight;

  const resolvedSashHeight = toPositiveNumber(sashHeight);
  const resolvedWindowHeight = toPositiveNumber(windowHeight);

  const hasWindowHeight =
    resolvedWindowHeight !== null && resolvedWindowHeight < actualHeight;

  const windowSectionHeight = hasWindowHeight
    ? innerHeight * (resolvedWindowHeight / actualHeight)
    : innerHeight;

  const windowSectionBottom = innerTop + windowSectionHeight;

  let meetingRailY = innerTop + windowSectionHeight / 2;

  if (
    !hasWindowHeight &&
    resolvedSashHeight !== null &&
    resolvedSashHeight < actualHeight
  ) {
    meetingRailY =
      innerBottom - innerHeight * (resolvedSashHeight / actualHeight);
  }

  const upperSashTop = innerTop;
  const upperSashHeight = Math.max(meetingRailY - upperSashTop, 1);
  const baseLowerSashHeight = Math.max(windowSectionBottom - meetingRailY, 1);

  /*
   * Las dos hojas ocupan toda la abertura. Así los perfiles se unen al frame
   * y se solapan ligeramente en el meeting rail, como ocurre en una single hung.
   */
  const desiredSashProfile = Math.max(frameThickness * 0.55, 2);
  const meetingRailOverlap = Math.min(
    desiredSashProfile * 0.55,
    baseLowerSashHeight * 0.2,
  );
  const lowerSashTop = Math.max(meetingRailY - meetingRailOverlap, innerTop);
  const lowerSashHeight = Math.max(windowSectionBottom - lowerSashTop, 1);

  const sashSideProfile = Math.min(
    desiredSashProfile,
    Math.max(innerWidth * 0.22, 0.5),
  );
  const upperRailProfile = Math.min(
    desiredSashProfile,
    Math.max(upperSashHeight * 0.24, 0.5),
  );
  const lowerRailProfile = Math.min(
    desiredSashProfile,
    Math.max(lowerSashHeight * 0.24, 0.5),
  );

  const upperGlassX = innerLeft + sashSideProfile;
  const upperGlassY = upperSashTop + upperRailProfile;
  const upperGlassWidth = Math.max(innerWidth - sashSideProfile * 2, 1);
  const upperGlassHeight = Math.max(upperSashHeight - upperRailProfile * 2, 1);

  const lowerGlassX = innerLeft + sashSideProfile;
  const lowerGlassY = lowerSashTop + lowerRailProfile;
  const lowerGlassWidth = Math.max(innerWidth - sashSideProfile * 2, 1);
  const lowerGlassHeight = Math.max(lowerSashHeight - lowerRailProfile * 2, 1);

  const fixedSectionHeight = Math.max(innerBottom - windowSectionBottom, 0);
  const fixedRailProfile = Math.min(
    desiredSashProfile,
    Math.max(fixedSectionHeight * 0.24, 0.5),
  );

  const fixedGlassX = innerLeft + sashSideProfile;
  const fixedGlassY = windowSectionBottom + fixedRailProfile;
  const fixedGlassWidth = Math.max(innerWidth - sashSideProfile * 2, 1);
  const fixedGlassHeight = Math.max(
    fixedSectionHeight - fixedRailProfile * 2,
    1,
  );

  const labelFontSize = variant === "report" ? 7 : 9;
  const lowerGlassCenterX = lowerGlassX + lowerGlassWidth / 2;
  const lowerGlassCenterY = lowerGlassY + lowerGlassHeight / 2;
  const arrowHalfLength = Math.max(Math.min(lowerGlassHeight * 0.22, 18), 4);
  const lowerLabelY =
    lowerGlassY + lowerGlassHeight - Math.min(4, lowerGlassHeight * 0.2);

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      {/* Hoja inferior móvil; se dibuja primero para quedar detrás */}
      <rect
        x={innerLeft}
        y={lowerSashTop}
        width={innerWidth}
        height={lowerSashHeight}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <rect
        x={lowerGlassX}
        y={lowerGlassY}
        width={lowerGlassWidth}
        height={lowerGlassHeight}
        fill="var(--glass-fill, #F7FBFF)"
        fillOpacity="var(--glass-opacity, 1)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      {/* Hoja superior fija; se dibuja después para quedar al frente */}
      <rect
        x={innerLeft}
        y={upperSashTop}
        width={innerWidth}
        height={upperSashHeight}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <rect
        x={upperGlassX}
        y={upperGlassY}
        width={upperGlassWidth}
        height={upperGlassHeight}
        fill="var(--glass-fill, #F7FBFF)"
        fillOpacity="var(--glass-opacity, 1)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      {lowerGlassHeight >= 14 && (
        <UpArrow
          x={lowerGlassCenterX}
          startY={lowerGlassCenterY + arrowHalfLength}
          endY={lowerGlassCenterY - arrowHalfLength}
          strokeWidth={variant === "report" ? 1.2 : 1.8}
        />
      )}

      <text
        x={upperGlassX + upperGlassWidth / 2}
        y={upperGlassY + upperGlassHeight / 2 + labelFontSize / 3}
        textAnchor="middle"
        fontSize={labelFontSize}
        fontWeight={600}
        fill="black"
      >
        O
      </text>

      <text
        x={lowerGlassCenterX}
        y={lowerLabelY}
        textAnchor="middle"
        fontSize={labelFontSize}
        fontWeight={600}
        fill="black"
      >
        X
      </text>

      {hasWindowHeight && (
        <>
          {/* Lite fijo inferior de las configuraciones con windowHeight */}
          <rect
            x={innerLeft}
            y={windowSectionBottom}
            width={innerWidth}
            height={fixedSectionHeight}
            fill="var(--frame-fill, #FFFFFF)"
            stroke="black"
            strokeWidth={strokeWidth}
          />

          <rect
            x={fixedGlassX}
            y={fixedGlassY}
            width={fixedGlassWidth}
            height={fixedGlassHeight}
            fill="var(--glass-fill, #F7FBFF)"
            fillOpacity="var(--glass-opacity, 1)"
            stroke="black"
            strokeWidth={strokeWidth}
          />

          <text
            x={fixedGlassX + fixedGlassWidth / 2}
            y={fixedGlassY + fixedGlassHeight / 2 + labelFontSize / 3}
            textAnchor="middle"
            fontSize={labelFontSize}
            fontWeight={600}
            fill="black"
          >
            FIX
          </text>
        </>
      )}
    </g>
  );
}

function LinearMaterialDiagram({
  width,
  height,
  variant,
}: {
  width: number;
  height: number;
  variant: PieceDiagramVariant;
}) {
  const strokeWidth = variant === "report" ? 1.1 : 1.5;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={Math.min(height * 0.2, 4)}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <line
        x1={height * 0.25}
        y1={height / 2}
        x2={width - height * 0.25}
        y2={height / 2}
        stroke="black"
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function CircularShapeDiagram({
  shape,
  width,
  height,
  variant,
}: {
  shape: CircularShapeKey;
  width: number;
  height: number;
  variant: PieceDiagramVariant;
}) {
  const strokeWidth = variant === "report" ? 1.1 : 1.5;
  const frameThickness = Math.min(
    Math.max(Math.min(width, height) * 0.06, 4),
    10,
  );

  if (shape === "CIRCLE") {
    const diameter = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.max(diameter / 2 - strokeWidth, 1);
    const innerRadius = Math.max(outerRadius - frameThickness, 1);

    return (
      <g>
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="var(--frame-fill, #FFFFFF)"
          stroke="black"
          strokeWidth={strokeWidth}
        />

        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="var(--glass-fill, #F7FBFF)"
          fillOpacity="var(--glass-opacity, 1)"
          stroke="black"
          strokeWidth={strokeWidth}
        />
      </g>
    );
  }

  const inset = Math.min(
    frameThickness,
    Math.max(Math.min(width, height) / 3, 1),
  );

  const innerLeft = inset;
  const innerTop = inset;
  const innerRight = Math.max(width - inset, innerLeft + 1);
  const innerBottom = Math.max(height - inset, innerTop + 1);
  const innerWidth = innerRight - innerLeft;
  const innerHeight = innerBottom - innerTop;

  const outerPath =
    shape === "HALF_CIRCLE"
      ? `M 0 ${height} A ${width / 2} ${height} 0 0 1 ${width} ${height} Z`
      : `M 0 ${height} L 0 0 A ${width} ${height} 0 0 1 ${width} ${height} Z`;

  const innerPath =
    shape === "HALF_CIRCLE"
      ? `M ${innerLeft} ${innerBottom} A ${innerWidth / 2} ${innerHeight} 0 0 1 ${innerRight} ${innerBottom} Z`
      : `M ${innerLeft} ${innerBottom} L ${innerLeft} ${innerTop} A ${innerWidth} ${innerHeight} 0 0 1 ${innerRight} ${innerBottom} Z`;

  return (
    <g>
      <path
        d={outerPath}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      <path
        d={innerPath}
        fill="var(--glass-fill, #F7FBFF)"
        fillOpacity="var(--glass-opacity, 1)"
        stroke="black"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  );
}

function GenericDiagram({
  width,
  height,
  variant,
}: {
  width: number;
  height: number;
  variant: PieceDiagramVariant;
}) {
  const frameThickness = Math.min(
    Math.max(Math.min(width, height) * 0.06, 4),
    10,
  );

  const strokeWidth = variant === "report" ? 1.1 : 1.5;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="var(--frame-fill, #FFFFFF)"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <rect
        x={frameThickness}
        y={frameThickness}
        width={Math.max(width - frameThickness * 2, 1)}
        height={Math.max(height - frameThickness * 2, 1)}
        fill="var(--glass-fill, #F7FBFF)"
        fillOpacity="var(--glass-opacity, 1)"
        stroke="black"
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

export function PieceDiagram({
  diagramFamily,
  configuration,
  dimensionMode = "STANDARD",
  piece,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const reactId = React.useId();

  const glassGradientId = `piece-glass-${reactId.replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  )}`;

  const glassTone = resolveGlassFill(glassTintHex);
  const isClearTone = glassTone.toUpperCase() === "#F7FBFF";

  // Clear necesita una ligera base azul para distinguirse del fondo blanco.
  const visibleGlassTone = isClearTone
    ? mixHexColors(glassTone, "#9FC3D8", 0.22)
    : glassTone;

  const privacyGlassTone = hasPrivacy
    ? mixHexColors(visibleGlassTone, "#1F2937", 0.18)
    : visibleGlassTone;

  // Low-E enfría ligeramente el cristal, sin crear una franja.
  const renderedGlassTone = hasCoating
    ? mixHexColors(privacyGlassTone, "#BFEAFF", hasPrivacy ? 0.06 : 0.1)
    : privacyGlassTone;

  const highlightWeight = hasPrivacy
    ? hasCoating
      ? 0.16
      : 0.1
    : hasCoating
      ? 0.3
      : isClearTone
        ? 0.26
        : 0.16;

  const glassHighlightTone = mixHexColors(
    renderedGlassTone,
    hasCoating ? "#E6FAFF" : "#FFFFFF",
    highlightWeight,
  );

  const glassShadowTone = mixHexColors(
    renderedGlassTone,
    "#5F7685",
    hasPrivacy ? 0.1 : 0.07,
  );

  const glassPaint = `url(#${glassGradientId})`;
  const glassOpacity = 1;
  const resolvedDiagramFamily = diagramFamily ?? "GENERIC";
  const frameFill = resolveFrameFill(frameColorHex);

  const circularShape = supportsCircularShapes(resolvedDiagramFamily)
    ? circularShapeKeyFromConfiguration(configuration)
    : null;

  const dimensions = resolveDimensions({
    piece,
    diagramFamily: resolvedDiagramFamily,
    configuration,
  });

  const isLinearMaterial = resolvedDiagramFamily === "LINEAR_MATERIAL";

  const hasValidDimensions =
    dimensions.width > 0 && (isLinearMaterial || dimensions.height > 0);

  if (!hasValidDimensions) {
    return (
      <div
        className={[
          "flex h-full w-full items-center justify-center rounded-md bg-gray-100",
          className ?? "",
        ].join(" ")}
      >
        <p className="text-sm text-gray-500">Enter dimensions</p>
      </div>
    );
  }

  const maxDimension = 220;

  let scaledWidth: number;
  let scaledHeight: number;

  if (dimensions.width >= dimensions.height) {
    scaledWidth = maxDimension;
    scaledHeight = maxDimension * (dimensions.height / dimensions.width);
  } else {
    scaledHeight = maxDimension;
    scaledWidth = maxDimension * (dimensions.width / dimensions.height);
  }

  const minimumVisibleDimension = variant === "report" ? 10 : 14;

  scaledWidth = Math.max(scaledWidth, minimumVisibleDimension);
  scaledHeight = Math.max(scaledHeight, minimumVisibleDimension);

  const offsetX = (maxDimension - scaledWidth) / 2;
  const offsetY = (maxDimension - scaledHeight) / 2;

  const fontSize = variant === "report" ? 11 : 15;

  const containerClasses =
    variant === "report"
      ? "flex h-full w-full items-center justify-center"
      : "flex h-full w-full flex-col items-center justify-center rounded-md border p-2";

  return (
    <div
      className={[containerClasses, className ?? ""].join(" ")}
      data-dimension-mode={dimensionMode}
      data-diagram-family={resolvedDiagramFamily}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`-44 -32 ${maxDimension + 88} ${maxDimension + 64}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${resolvedDiagramFamily} piece diagram, exterior view`}
        style={
          {
            "--frame-fill": frameFill,
            "--glass-fill": glassPaint,
            "--glass-opacity": String(glassOpacity),
          } as React.CSSProperties
        }
      >
        <defs>
          <radialGradient
            id={glassGradientId}
            cx="30%"
            cy="24%"
            r="90%"
            fx="25%"
            fy="18%"
          >
            <stop offset="0%" stopColor={glassHighlightTone} />
            <stop offset="32%" stopColor={renderedGlassTone} />
            <stop offset="72%" stopColor={renderedGlassTone} />
            <stop offset="100%" stopColor={glassShadowTone} />
          </radialGradient>
        </defs>
        <DimensionText
          x={offsetX + scaledWidth / 2}
          y={offsetY - 10}
          textAnchor="middle"
          fallbackFontSize={fontSize}
        >
          {formatDimension(dimensions.displayWidth)}&quot;
        </DimensionText>

        {dimensions.displayHeight !== null && (
          <DimensionText
            x={-(offsetY + scaledHeight / 2)}
            y={offsetX - 15}
            transform="rotate(-90)"
            textAnchor="middle"
            fallbackFontSize={fontSize}
          >
            {formatDimension(dimensions.displayHeight)}&quot;
          </DimensionText>
        )}

        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {resolvedDiagramFamily === "HORIZONTAL_SLIDER" && (
            <HorizontalSliderDiagram
              width={scaledWidth}
              height={scaledHeight}
              configuration={configuration}
              variant={variant}
            />
          )}

          {resolvedDiagramFamily === "SINGLE_HUNG" && (
            <SingleHungDiagram
              width={scaledWidth}
              height={scaledHeight}
              actualHeight={dimensions.displayHeight ?? dimensions.height}
              sashHeight={piece?.sashHeight}
              windowHeight={piece?.windowHeight}
              variant={variant}
            />
          )}

          {resolvedDiagramFamily === "LINEAR_MATERIAL" && (
            <LinearMaterialDiagram
              width={scaledWidth}
              height={scaledHeight}
              variant={variant}
            />
          )}

          {circularShape !== null && (
            <CircularShapeDiagram
              shape={circularShape}
              width={scaledWidth}
              height={scaledHeight}
              variant={variant}
            />
          )}

          {circularShape === null &&
            !["HORIZONTAL_SLIDER", "SINGLE_HUNG", "LINEAR_MATERIAL"].includes(
              resolvedDiagramFamily,
            ) && (
              <GenericDiagram
                width={scaledWidth}
                height={scaledHeight}
                variant={variant}
              />
            )}
        </g>
      </svg>
    </div>
  );
}
