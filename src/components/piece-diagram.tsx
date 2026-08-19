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
import {
  FixedWindowShapeDiagram,
  type FixedWindowMultiHeightShape,
  type FixedWindowShape,
  type FixedWindowSingleHeightShape,
} from "./piece-diagram/renderers/fixed/fixed-window-shape-diagram";
import { HorizontalRollingWindowDiagram } from "./piece-diagram/renderers/horizontal-rolling/horizontal-rolling-window-diagram";
import { SingleHungWindowDiagram } from "./piece-diagram/renderers/single-hung/single-hung-window-diagram";
import { resolveAuthenticWindowSpec } from "./piece-diagram/window-renderer-spec";

export type { PieceDiagramData, PieceDiagramVariant };

export interface PieceDiagramProps {
  diagramFamily?: DiagramFamily;
  configuration?: string;
  diagramSpec?: DiagramSpec | null;
  dimensionMode?: DimensionMode;
  piece?: PieceDiagramData;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
  screenEnabled?: boolean;
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

function isPositiveDimension(value: unknown): value is string | number {
  return positiveDimensionNumber(value) !== null;
}

const MULTI_HEIGHT_FIXED_SHAPES = new Set<FixedWindowShape>([
  "EYEBROW",
  "HALF_EYEBROW_LEFT",
  "HALF_EYEBROW_RIGHT",
  "TRAPEZOID_LEFT",
  "TRAPEZOID_RIGHT",
]);

type ResolvedFixedDimensions = {
  width: string | number;
  height: string | number;
  secondaryHeight: string | number | null;
};

function firstPositiveDimension(
  ...values: unknown[]
): string | number | null {
  return values.find(isPositiveDimension) ?? null;
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

  let height = firstPositiveDimension(
    piece?.height,
    piece?.heightLeft,
    piece?.heightRight,
  );

  if (height === null) {
    const numericWidth = positiveDimensionNumber(width);
    if (numericWidth !== null) {
      if (shape === "HALF_CIRCLE") height = numericWidth / 2;
      if (
        shape === "CIRCLE" ||
        shape === "OCTAGON_SYMMETRIC" ||
        shape === "QUARTER_CIRCLE"
      ) {
        height = numericWidth;
      }
      if (shape === "HEXAGON_SYMMETRIC") {
        height = numericWidth * (42 / 48);
      }
    }
  }

  return height === null ? null : { width, height, secondaryHeight: null };
}

function safeFrameColor(value?: string | null): string {
  const color = value?.trim();
  return color && /^#[0-9A-Fa-f]{6}$/.test(color)
    ? color.toUpperCase()
    : "#FFFFFF";
}

export function PieceDiagram({
  diagramFamily,
  configuration,
  diagramSpec,
  dimensionMode = "STANDARD",
  piece,
  frameColorHex,
  glassTintHex,
  hasCoating = false,
  hasPrivacy = false,
  screenEnabled = false,
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const resolvedSpec = resolveAuthenticWindowSpec({
    diagramFamily,
    configuration,
    diagramSpec,
  });
  const fixedDimensions =
    resolvedSpec?.renderer === "FIXED_WINDOW_SHAPE"
      ? resolveFixedDimensions(resolvedSpec.shape, piece)
      : null;
  const width = fixedDimensions?.width ?? piece?.width;
  const height = fixedDimensions?.height ?? piece?.height;

  if (
    !resolvedSpec ||
    !isPositiveDimension(width) ||
    !isPositiveDimension(height) ||
    (resolvedSpec.renderer === "FIXED_WINDOW_SHAPE" && !fixedDimensions)
  ) {
    return (
      <LegacyPieceDiagram
        diagramFamily={diagramFamily}
        configuration={configuration}
        dimensionMode={dimensionMode}
        piece={piece}
        frameColorHex={frameColorHex}
        glassTintHex={glassTintHex}
        hasCoating={hasCoating}
        hasPrivacy={hasPrivacy}
        variant={variant}
        className={className}
      />
    );
  }

  const containerClasses =
    variant === "report"
      ? "flex h-full w-full items-center justify-center"
      : "flex h-full w-full items-center justify-center overflow-hidden rounded-md border p-2";
  const rendererClasses = "h-full w-full";
  const frameColor = safeFrameColor(frameColorHex);
  const sharedProps = {
    width,
    height,
    screenEnabled: Boolean(screenEnabled),
    frameColorHex: frameColor,
    glassTintHex,
    hasCoating,
    hasPrivacy,
    showDimensions: true,
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
      showDimensions: true,
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
        sashHeight={piece?.sashHeight}
        windowHeight={piece?.windowHeight}
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
        showDimensions
        className={rendererClasses}
      />
    );
  } else if (
    resolvedSpec.renderer === "CASEMENT_WINDOW" &&
    (resolvedSpec.configuration === "XL" ||
      resolvedSpec.configuration === "XR")
  ) {
    renderedDiagram = (
      <CasementWindowDiagram
        {...sharedProps}
        configuration={resolvedSpec.configuration}
      />
    );
  }

  return (
    <div
      className={[containerClasses, className ?? ""].join(" ")}
      data-dimension-mode={dimensionMode}
      data-diagram-family={diagramFamily}
      data-diagram-renderer={resolvedSpec.renderer}
      data-diagram-spec-source={resolvedSpec.source}
    >
      {renderedDiagram}
    </div>
  );
}
