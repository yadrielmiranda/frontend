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

function isPositiveDimension(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value !== "string") return false;

  const normalized = value.trim().replace(/[\u2033\u201d"]/g, "");
  if (!normalized) return false;

  const decimal = Number(normalized);
  if (Number.isFinite(decimal) && decimal > 0) return true;

  const fraction = normalized.match(/^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/);
  if (!fraction) return false;

  const whole = fraction[1] ? Number(fraction[1]) : 0;
  const numerator = Number(fraction[2]);
  const denominator = Number(fraction[3]);
  return denominator > 0 && numerator < denominator && whole + numerator / denominator > 0;
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
  const width = piece?.width;
  const height = piece?.height;

  if (
    !resolvedSpec ||
    !isPositiveDimension(width) ||
    !isPositiveDimension(height)
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

  if (resolvedSpec.renderer === "HORIZONTAL_ROLLING_WINDOW") {
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
  } else if (resolvedSpec.configuration === "O") {
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
  } else {
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
