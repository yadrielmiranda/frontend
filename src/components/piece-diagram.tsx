// src/components/piece-diagram.tsx
import React from "react";

import type { DiagramFamily, DimensionMode } from "@/lib/types";

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

const GLASS_FILL = "#F0F9FF";

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
}: {
  piece?: PieceDiagramData;
  diagramFamily: DiagramFamily;
}): ResolvedDimensions {
  const standardWidth = toPositiveNumber(piece?.width);
  const standardHeight = toPositiveNumber(piece?.height);

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

  const resolvedHeight = standardHeight ?? doorHeight;

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

  const sashInset = Math.max(frameThickness * 0.38, 2);
  const strokeWidth = variant === "report" ? 1.1 : 1.4;
  const arrowStrokeWidth = variant === "report" ? 1.2 : 1.8;

  const innerLeft = frameThickness;
  const innerTop = frameThickness;
  const innerWidth = Math.max(width - frameThickness * 2, 1);
  const innerHeight = Math.max(height - frameThickness * 2, 1);
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

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        stroke="black"
        strokeWidth={strokeWidth * 1.5}
      />

      <rect
        x={innerLeft}
        y={innerTop}
        width={innerWidth}
        height={innerHeight}
        fill={GLASS_FILL}
        stroke="black"
        strokeWidth={strokeWidth}
      />

      {panelGeometries.map(({ panel, x, width: panelWidth }, index) => {
        const movable = panel.code === "X";

        const sashX = x + sashInset;
        const sashY = innerTop + sashInset;
        const sashWidth = Math.max(panelWidth - sashInset * 2, 1);
        const sashHeight = Math.max(innerHeight - sashInset * 2, 1);

        return (
          <g key={`${panel.code}-${index}`}>
            {index > 0 && (
              <line
                x1={x}
                y1={innerTop}
                x2={x}
                y2={innerBottom}
                stroke="black"
                strokeWidth={strokeWidth}
              />
            )}

            {movable && (
              <rect
                x={sashX}
                y={sashY}
                width={sashWidth}
                height={sashHeight}
                fill="none"
                stroke="black"
                strokeWidth={strokeWidth}
              />
            )}

            {movable && panel.direction && (
              <MovementArrow
                x={x}
                y={innerTop + innerHeight / 2}
                width={panelWidth}
                direction={panel.direction}
                strokeWidth={arrowStrokeWidth}
              />
            )}

            <text
              x={x + panelWidth / 2}
              y={innerBottom - Math.max(sashInset, 4)}
              textAnchor="middle"
              fontSize={variant === "report" ? 7 : 9}
              fontWeight={600}
              fill="black"
            >
              {panel.code}
            </text>
          </g>
        );
      })}

      {layout.groupBreaks.map((breakIndex) => {
        const breakGeometry = panelGeometries[breakIndex];

        if (!breakGeometry) {
          return null;
        }

        const breakX = breakGeometry.x;
        const separation = Math.max(frameThickness * 0.22, 1.5);

        return (
          <g key={`group-break-${breakIndex}`}>
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

  const movableSectionTop = meetingRailY;
  const movableSectionBottom = windowSectionBottom;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        stroke="black"
        strokeWidth={strokeWidth * 1.5}
      />

      <rect
        x={innerLeft}
        y={innerTop}
        width={innerWidth}
        height={innerHeight}
        fill={GLASS_FILL}
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <line
        x1={innerLeft}
        y1={meetingRailY}
        x2={innerLeft + innerWidth}
        y2={meetingRailY}
        stroke="black"
        strokeWidth={strokeWidth * 1.5}
      />

      {hasWindowHeight && (
        <line
          x1={innerLeft}
          y1={windowSectionBottom}
          x2={innerLeft + innerWidth}
          y2={windowSectionBottom}
          stroke="black"
          strokeWidth={strokeWidth * 1.5}
        />
      )}

      <rect
        x={innerLeft + frameThickness * 0.35}
        y={movableSectionTop + frameThickness * 0.35}
        width={Math.max(innerWidth - frameThickness * 0.7, 1)}
        height={Math.max(
          movableSectionBottom - movableSectionTop - frameThickness * 0.7,
          1,
        )}
        fill="none"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <UpArrow
        x={innerLeft + innerWidth / 2}
        startY={
          movableSectionBottom -
          Math.max((movableSectionBottom - movableSectionTop) * 0.2, 5)
        }
        endY={
          movableSectionTop +
          Math.max((movableSectionBottom - movableSectionTop) * 0.25, 5)
        }
        strokeWidth={variant === "report" ? 1.2 : 1.8}
      />

      <text
        x={innerLeft + innerWidth / 2}
        y={meetingRailY - 4}
        textAnchor="middle"
        fontSize={variant === "report" ? 7 : 9}
        fontWeight={600}
        fill="black"
      >
        O
      </text>

      <text
        x={innerLeft + innerWidth / 2}
        y={movableSectionBottom - 4}
        textAnchor="middle"
        fontSize={variant === "report" ? 7 : 9}
        fontWeight={600}
        fill="black"
      >
        X
      </text>

      {hasWindowHeight && (
        <text
          x={innerLeft + innerWidth / 2}
          y={innerBottom - 4}
          textAnchor="middle"
          fontSize={variant === "report" ? 7 : 9}
          fontWeight={600}
          fill="black"
        >
          FIX
        </text>
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
        fill="white"
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
        fill="white"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <rect
        x={frameThickness}
        y={frameThickness}
        width={Math.max(width - frameThickness * 2, 1)}
        height={Math.max(height - frameThickness * 2, 1)}
        fill={GLASS_FILL}
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
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const resolvedDiagramFamily = diagramFamily ?? "GENERIC";

  const dimensions = resolveDimensions({
    piece,
    diagramFamily: resolvedDiagramFamily,
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

  const fontSize = variant === "report" ? 9 : 12;

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
      >
        <text
          x={offsetX + scaledWidth / 2}
          y={offsetY - 10}
          textAnchor="middle"
          fontSize={fontSize}
          fill="black"
        >
          {formatDimension(dimensions.displayWidth)}&quot;
        </text>

        {dimensions.displayHeight !== null && (
          <text
            x={-(offsetY + scaledHeight / 2)}
            y={offsetX - 15}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize={fontSize}
            fill="black"
          >
            {formatDimension(dimensions.displayHeight)}&quot;
          </text>
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

          {!["HORIZONTAL_SLIDER", "SINGLE_HUNG", "LINEAR_MATERIAL"].includes(
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
