import React from "react";
import { frenchDoorArtwork } from "./french-door-design-artwork";
import { PieceDiagram } from "./series-600-door-diagram";

export function FrenchDoorDesignThumbnail({ artworkKey, frameColorHex, glassTintHex, className }: {
  artworkKey: string; frameColorHex?: string | null; glassTintHex?: string | null; className?: string;
}) {
  const design = frenchDoorArtwork(artworkKey);
  if (!design) return null;
  const single = design.leafCount === 1;
  return <PieceDiagram
    configuration={single ? "X" : "XX"}
    visualTemplate={single ? "ECO_SERIES_600_X_EXTERIOR" : "ECO_SERIES_600_XX_EXTERIOR"}
    piece={{ width: single ? 36 : 72, height: 80 }}
    frenchDoorDesignKey={artworkKey}
    frameColorHex={frameColorHex} glassTintHex={glassTintHex} showDimensions={false} showMovement={false}
    variant="report" className={className}
  />;
}
