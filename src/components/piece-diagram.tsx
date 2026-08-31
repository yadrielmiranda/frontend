import React from "react";

import type { DiagramFamily, DiagramSpec, DimensionMode } from "@/lib/types";

import {
  PieceDiagram as LegacyPieceDiagram,
  type PieceDiagramData,
  type PieceDiagramVariant,
} from "./piece-diagram/legacy-piece-diagram";
import {
  CasementFixedWindowDiagram,
  CasementWindowDiagram,
} from "./piece-diagram/renderers/casement/casement-window-diagram";
import { PieceDiagram as Series600DoorDiagram } from "./piece-diagram/renderers/french-door/series-600-door-diagram";
import { resolveSharedFrenchDoor } from "./piece-diagram/renderers/french-door/series-600-door-resolver";
import {
  FixedWindowShapeDiagram,
  type FixedWindowMultiHeightShape,
  type FixedWindowShape,
  type FixedWindowSingleHeightShape,
} from "./piece-diagram/renderers/fixed/fixed-window-shape-diagram";
import { HorizontalRollingWindowDiagram } from "./piece-diagram/renderers/horizontal-rolling/horizontal-rolling-window-diagram";
import { SingleHungWindowDiagram } from "./piece-diagram/renderers/single-hung/single-hung-window-diagram";
import { SlidingGlassDoorDiagram } from "./piece-diagram/renderers/sliding-door/sliding-glass-door-diagram";
import { resolveSlidingGlassDoorSpec } from "./piece-diagram/renderers/sliding-door/sliding-glass-door-spec";
import { WindowWallDiagram } from "./piece-diagram/renderers/window-wall/window-wall-diagram";
import { resolveAuthenticWindowSpec } from "./piece-diagram/window-renderer-spec";

export type { PieceDiagramData, PieceDiagramVariant };

export interface PieceDiagramProps {
  diagramFamily?: DiagramFamily;
  systemName?: string | null;
  brandName?: string | null;
  configuration?: string;
  diagramSpec?: DiagramSpec | null;
  dimensionMode?: DimensionMode;
  piece?: PieceDiagramData;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  screenEnabled?: boolean;
  activeOptionName?: string | null;
  preparationOptionName?: string | null;
  showDimensions?: boolean;
  variant?: PieceDiagramVariant;
  className?: string;
}

function positiveDimensionNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/[\u2033\u201d"]/g, "");
  if (!normalized) return null;

  const decimal = Number(normalized);
  if (Number.isFinite(decimal) && decimal > 0) return decimal;

  const fraction = normalized.match(/^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/);
  if (!fraction) return null;

  const whole = fraction[1] ? Number(fraction[1]) : 0;
  const numerator = Number(fraction[2]);
  const denominator = Number(fraction[3]);
  const parsed = whole + numerator / denominator;
  return denominator > 0 && numerator < denominator && parsed > 0
    ? parsed
    : null;
}

function normalizePieceDimensions(
  piece?: PieceDiagramData,
): PieceDiagramData | undefined {
  if (!piece) return undefined;

  const normalize = (value: unknown) =>
    positiveDimensionNumber(value) ?? undefined;

  return {
    ...piece,
    width: normalize(piece.width),
    height: normalize(piece.height),
    heightLeft: normalize(piece.heightLeft),
    heightRight: normalize(piece.heightRight),
    legHeight: normalize(piece.legHeight),
    sashHeight: normalize(piece.sashHeight),
    windowHeight: normalize(piece.windowHeight),
    doorWidth: normalize(piece.doorWidth),
    doorHeight: normalize(piece.doorHeight),
    leftSideliteWidth: normalize(piece.leftSideliteWidth),
    rightSideliteWidth: normalize(piece.rightSideliteWidth),
  };
}

const MULTI_HEIGHT_FIXED_SHAPES = new Set<FixedWindowShape>([
  "EYEBROW",
  "HALF_EYEBROW_LEFT",
  "HALF_EYEBROW_RIGHT",
  "TRAPEZOID_LEFT",
  "TRAPEZOID_RIGHT",
]);

type ResolvedFixedDimensions = {
  width: number;
  height: number;
  secondaryHeight: number | null;
};

function firstPositiveDimension(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = positiveDimensionNumber(value);
    if (parsed !== null) return parsed;
  }

  return null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function fixedHeightDerivedFromWidth(
  shape: FixedWindowShape,
  width: number,
): number | null {
  if (shape === "HALF_CIRCLE") return width / 2;
  if (
    shape === "CIRCLE" ||
    shape === "OCTAGON_SYMMETRIC" ||
    shape === "QUARTER_CIRCLE"
  ) {
    return width;
  }
  if (shape === "HEXAGON_SYMMETRIC") return width * (42 / 48);

  return null;
}

function resolveFixedDimensions(
  shape: FixedWindowShape,
  piece?: PieceDiagramData,
): ResolvedFixedDimensions | null {
  const width = firstPositiveDimension(piece?.width);
  if (width === null) return null;

  if (MULTI_HEIGHT_FIXED_SHAPES.has(shape)) {
    const primaryIsRight =
      shape === "HALF_EYEBROW_RIGHT" || shape === "TRAPEZOID_RIGHT";
    const primaryHeight = primaryIsRight
      ? firstPositiveDimension(piece?.heightRight, piece?.height)
      : firstPositiveDimension(piece?.heightLeft, piece?.height);
    const secondaryHeight = primaryIsRight
      ? firstPositiveDimension(piece?.heightLeft, piece?.legHeight)
      : firstPositiveDimension(piece?.heightRight, piece?.legHeight);

    return primaryHeight !== null && secondaryHeight !== null
      ? { width, height: primaryHeight, secondaryHeight }
      : null;
  }

  const derivedHeight = fixedHeightDerivedFromWidth(shape, width);
  if (derivedHeight !== null) {
    return { width, height: derivedHeight, secondaryHeight: null };
  }

  const height = firstPositiveDimension(
    piece?.height,
    piece?.heightLeft,
    piece?.heightRight,
  );

  return height === null ? null : { width, height, secondaryHeight: null };
}

function safeFrameColor(value?: string | null): string {
  const color = value?.trim();
  return color && /^#[0-9A-Fa-f]{6}$/.test(color)
    ? color.toUpperCase()
    : "#FFFFFF";
}

const PREVIEW_PIXELS_PER_INCH = 4.5;
const PREVIEW_HORIZONTAL_ALLOWANCE = 96;
const PREVIEW_VERTICAL_ALLOWANCE = 80;
const PREVIEW_MINIMUM_SIDE = 140;

function physicalPreviewSize(
  width: number,
  height: number,
): React.CSSProperties {
  return {
    width: `${Math.max(
      PREVIEW_MINIMUM_SIDE,
      width * PREVIEW_PIXELS_PER_INCH + PREVIEW_HORIZONTAL_ALLOWANCE,
    )}px`,
    height: `${Math.max(
      PREVIEW_MINIMUM_SIDE,
      height * PREVIEW_PIXELS_PER_INCH + PREVIEW_VERTICAL_ALLOWANCE,
    )}px`,
    maxWidth: "100%",
    maxHeight: "100%",
    minWidth: 0,
    minHeight: 0,
  };
}

function DiagramShell({
  width,
  height,
  variant,
  className,
  dataAttributes,
  children,
}: {
  width: number;
  height: number;
  variant: PieceDiagramVariant;
  className?: string;
  dataAttributes?: Record<string, string | number | undefined>;
  children: React.ReactNode;
}) {
  const containerClasses =
    variant === "report"
      ? "flex h-full w-full items-center justify-center overflow-hidden"
      : "flex h-full w-full items-center justify-center overflow-hidden rounded-md border p-2";

  return (
    <div
      className={[containerClasses, className ?? ""].join(" ")}
      {...dataAttributes}
    >
      <div
        className={
          variant === "report"
            ? "flex h-full w-full items-center justify-center"
            : "flex shrink items-center justify-center"
        }
        style={
          variant === "report"
            ? { width: "100%", height: "100%" }
            : physicalPreviewSize(width, height)
        }
        data-preview-scale={
          variant === "report" ? "REPORT_FIT" : "SHARED_PHYSICAL_SCALE"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function PieceDiagram({
  diagramFamily,
  systemName,
  brandName,
  configuration,
  diagramSpec,
  dimensionMode = "STANDARD",
  piece,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  screenEnabled = false,
  activeOptionName,
  preparationOptionName,
  showDimensions = true,
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const normalizedPiece = normalizePieceDimensions(piece);
  const rendererClasses = "h-full w-full";
  const resolvedSharedFrenchDoor =
    diagramFamily === "FRENCH_DOOR"
      ? resolveSharedFrenchDoor({
          systemName,
          configuration,
          piece: normalizedPiece,
          activeOptionName,
          preparationOptionName,
        })
      : null;

  if (resolvedSharedFrenchDoor) {
    const sharedDoorProps = {
      diagramFamily: "FRENCH_DOOR" as const,
      dimensionMode,
      frameColorHex,
      glassTintHex,
      hasCoating,
      hasPrivacy,
      showDimensions,
      variant: "report" as const,
      className: rendererClasses,
    } as const;

    const doorDiagram =
      resolvedSharedFrenchDoor.kind === "MIXED" ? (
        <Series600DoorDiagram
          {...sharedDoorProps}
          visualTemplate="ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR"
          configuration={resolvedSharedFrenchDoor.configuration}
          series600MixedPieces={resolvedSharedFrenchDoor.pieces}
        />
      ) : (
        <Series600DoorDiagram
          {...sharedDoorProps}
          visualTemplate={resolvedSharedFrenchDoor.visualTemplate}
          configuration={resolvedSharedFrenchDoor.configuration}
          piece={resolvedSharedFrenchDoor.piece}
          exteriorHingeSide={resolvedSharedFrenchDoor.exteriorHingeSide}
          activeLeaf={resolvedSharedFrenchDoor.activeLeaf}
          boreCount={resolvedSharedFrenchDoor.boreCount}
        />
      );
    const doorWidth =
      resolvedSharedFrenchDoor.kind === "MIXED"
        ? resolvedSharedFrenchDoor.pieces.reduce(
            (total, doorPiece) =>
              total + (positiveDimensionNumber(doorPiece.width) ?? 0),
            0,
          )
        : resolvedSharedFrenchDoor.piece.width;
    const doorHeight =
      resolvedSharedFrenchDoor.kind === "MIXED"
        ? Math.max(
            ...resolvedSharedFrenchDoor.pieces.map(
              (doorPiece) => positiveDimensionNumber(doorPiece.height) ?? 0,
            ),
          )
        : resolvedSharedFrenchDoor.piece.height;

    return (
      <DiagramShell
        width={doorWidth}
        height={doorHeight}
        variant={variant}
        className={className}
        dataAttributes={{
          "data-dimension-mode": dimensionMode,
          "data-diagram-family": "FRENCH_DOOR",
          "data-diagram-renderer": "SERIES_600_SHARED",
        }}
      >
        {doorDiagram}
      </DiagramShell>
    );
  }

  const windowWallWidth = positiveDimensionNumber(normalizedPiece?.width);
  const windowWallHeight = positiveDimensionNumber(normalizedPiece?.height);

  if (
    diagramFamily === "WINDOW_WALL" &&
    windowWallWidth !== null &&
    windowWallHeight !== null
  ) {
    const windowWallPanelCount =
      positiveInteger(normalizedPiece?.panelCount) ?? 1;

    return (
      <DiagramShell
        width={windowWallWidth}
        height={windowWallHeight}
        variant={variant}
        className={className}
        dataAttributes={{
          "data-dimension-mode": dimensionMode,
          "data-diagram-family": diagramFamily,
          "data-diagram-renderer": "WINDOW_WALL_DYNAMIC",
          "data-diagram-spec-source": "C139_STRUCTURAL_REFERENCE",
        }}
      >
        <WindowWallDiagram
          width={windowWallWidth}
          height={windowWallHeight}
          panelCount={windowWallPanelCount}
          horizontalHeights={normalizedPiece?.horizontalHeights}
          activeOptionName={activeOptionName}
          frameColorHex={safeFrameColor(frameColorHex)}
          glassTintHex={glassTintHex}
          hasCoating={hasCoating}
          hasPrivacy={hasPrivacy}
          showDimensions={showDimensions}
          className={rendererClasses}
        />
      </DiagramShell>
    );
  }

  const resolvedSlidingGlassDoor =
    diagramFamily === "SLIDING_DOOR"
      ? resolveSlidingGlassDoorSpec({
          configuration,
          diagramSpec,
          brandName,
        })
      : null;
  const slidingWidth = positiveDimensionNumber(normalizedPiece?.width);
  const slidingHeight = positiveDimensionNumber(normalizedPiece?.height);

  if (
    resolvedSlidingGlassDoor &&
    slidingWidth !== null &&
    slidingHeight !== null
  ) {
    return (
      <DiagramShell
        width={slidingWidth}
        height={slidingHeight}
        variant={variant}
        className={className}
        dataAttributes={{
          "data-dimension-mode": dimensionMode,
          "data-diagram-family": diagramFamily,
          "data-diagram-renderer": "SLIDING_GLASS_DOOR",
          "data-diagram-spec-source": "C139_CATALOG",
        }}
      >
        <SlidingGlassDoorDiagram
          spec={resolvedSlidingGlassDoor}
          width={slidingWidth}
          height={slidingHeight}
          screenEnabled={Boolean(screenEnabled)}
          frameColorHex={safeFrameColor(frameColorHex)}
          glassTintHex={glassTintHex}
          hasCoating={hasCoating}
          hasPrivacy={hasPrivacy}
          showDimensions={showDimensions}
          className={rendererClasses}
        />
      </DiagramShell>
    );
  }

  const resolvedSpec = resolveAuthenticWindowSpec({
    diagramFamily,
    configuration,
    diagramSpec,
  });
  const fixedDimensions =
    resolvedSpec?.renderer === "FIXED_WINDOW_SHAPE"
      ? resolveFixedDimensions(resolvedSpec.shape, normalizedPiece)
      : null;
  const width =
    fixedDimensions?.width ?? positiveDimensionNumber(normalizedPiece?.width);
  const height =
    fixedDimensions?.height ?? positiveDimensionNumber(normalizedPiece?.height);

  if (
    !resolvedSpec ||
    width === null ||
    height === null ||
    (resolvedSpec.renderer === "FIXED_WINDOW_SHAPE" && !fixedDimensions)
  ) {
    const legacyDiagram = (
      <LegacyPieceDiagram
        diagramFamily={diagramFamily}
        configuration={configuration}
        dimensionMode={dimensionMode}
        piece={normalizedPiece}
        frameColorHex={frameColorHex}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
        showDimensions={showDimensions}
        variant="report"
        className={rendererClasses}
      />
    );
    const legacyWidth = positiveDimensionNumber(normalizedPiece?.width);
    const legacyHeight = positiveDimensionNumber(normalizedPiece?.height);

    return legacyWidth !== null && legacyHeight !== null ? (
      <DiagramShell
        width={legacyWidth}
        height={legacyHeight}
        variant={variant}
        className={className}
        dataAttributes={{
          "data-dimension-mode": dimensionMode,
          "data-diagram-family": diagramFamily,
          "data-diagram-renderer": "LEGACY",
        }}
      >
        {legacyDiagram}
      </DiagramShell>
    ) : (
      legacyDiagram
    );
  }

  const frameColor = safeFrameColor(frameColorHex);
  const sharedProps = {
    width,
    height,
    screenEnabled: Boolean(screenEnabled),
    frameColorHex: frameColor,
    glassTintHex,
    hasCoating,
    hasPrivacy,
    showDimensions,
    className: rendererClasses,
  } as const;

  let renderedDiagram: React.ReactNode = null;

  if (resolvedSpec.renderer === "FIXED_WINDOW_SHAPE") {
    const dimensions = fixedDimensions!;
    const commonFixedProps = {
      width: dimensions.width,
      height: dimensions.height,
      frameColorHex: frameColor,
      glassTintHex,
      hasCoating,
      hasPrivacy,
      showDimensions,
      className: rendererClasses,
    } as const;

    if (
      MULTI_HEIGHT_FIXED_SHAPES.has(resolvedSpec.shape) &&
      dimensions.secondaryHeight !== null
    ) {
      renderedDiagram = (
        <FixedWindowShapeDiagram
          {...commonFixedProps}
          shape={resolvedSpec.shape as FixedWindowMultiHeightShape}
          secondaryHeight={dimensions.secondaryHeight}
        />
      );
    } else {
      renderedDiagram = (
        <FixedWindowShapeDiagram
          {...commonFixedProps}
          shape={resolvedSpec.shape as FixedWindowSingleHeightShape}
        />
      );
    }
  } else if (resolvedSpec.renderer === "HORIZONTAL_ROLLING_WINDOW") {
    switch (resolvedSpec.configuration) {
      case "OX":
        renderedDiagram = (
          <HorizontalRollingWindowDiagram
            {...sharedProps}
            configuration="OX"
            split={resolvedSpec.split}
          />
        );
        break;
      case "XO":
        renderedDiagram = (
          <HorizontalRollingWindowDiagram
            {...sharedProps}
            configuration="XO"
            split={resolvedSpec.split}
          />
        );
        break;
      case "XOX":
        renderedDiagram = (
          <HorizontalRollingWindowDiagram
            {...sharedProps}
            configuration="XOX"
            split={resolvedSpec.split}
          />
        );
        break;
    }
  } else if (resolvedSpec.renderer === "SINGLE_HUNG_WINDOW") {
    renderedDiagram = (
      <SingleHungWindowDiagram
        {...sharedProps}
        configuration={resolvedSpec.configuration}
        sashHeight={normalizedPiece?.sashHeight}
        windowHeight={normalizedPiece?.windowHeight}
      />
    );
  } else if (
    resolvedSpec.renderer === "CASEMENT_WINDOW" &&
    resolvedSpec.configuration === "O"
  ) {
    renderedDiagram = (
      <CasementFixedWindowDiagram
        configuration="O"
        width={width}
        height={height}
        frameColorHex={frameColor}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
        showDimensions={showDimensions}
        className={rendererClasses}
      />
    );
  } else if (
    resolvedSpec.renderer === "CASEMENT_WINDOW" &&
    (resolvedSpec.configuration === "XL" || resolvedSpec.configuration === "XR")
  ) {
    renderedDiagram = (
      <CasementWindowDiagram
        {...sharedProps}
        configuration={resolvedSpec.configuration}
      />
    );
  }

  return (
    <DiagramShell
      width={width}
      height={height}
      variant={variant}
      className={className}
      dataAttributes={{
        "data-dimension-mode": dimensionMode,
        "data-diagram-family": diagramFamily,
        "data-diagram-renderer": resolvedSpec.renderer,
        "data-diagram-spec-source": resolvedSpec.source,
      }}
    >
      {renderedDiagram}
    </DiagramShell>
  );
}
