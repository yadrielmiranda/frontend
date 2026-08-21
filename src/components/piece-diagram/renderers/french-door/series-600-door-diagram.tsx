// src/components/piece-diagram.tsx
// Authentic Evolution runtime release C057 FINAL.
// Structural baseline C035 FINAL; approved visual source C056_REVIEW.
// Structural master: C017 / SHA-256
// 5c649b973262f3acc02ba8db10807186123315d2a0a556b278159713085b8758
// Scope: ECO Series 600 X + XX + O (SL) + approved mixed assemblies,
// exterior, shared SH/HR frame/glass color pipeline.
// Explicit visualTemplate selection prevents unrelated X configurations from
// being rendered as hinged doors.
import React from "react";

import type { DiagramFamily, DimensionMode } from "@/lib/types";
import {
  DEFAULT_MOVEMENT_INDICATOR_COLOR,
  Serie600MovementIndicators,
  normalizeMovementIndicatorColor,
  type Serie600MovementPanel,
} from "./series-600-movement-indicators";

type DiagramValue = string | number | null | undefined;

export type PieceDiagramVariant = "editor" | "report";

export type PieceDiagramVisualTemplate =
  | "ECO_SERIES_600_X_EXTERIOR"
  | "ECO_SERIES_600_XX_EXTERIOR"
  | "ECO_SERIES_600_O_SIDELITE_EXTERIOR"
  | "ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR";

export type PieceDiagramExteriorHingeSide = "left" | "right";

export type PieceDiagramActiveLeaf = "left" | "right";

export type PieceDiagramBoreCount = 2 | 3;

export type PieceDiagramSeries600XXStructureId =
  | "LEFT_ACTIVE__TWO_BORE"
  | "LEFT_ACTIVE__THREE_BORE"
  | "RIGHT_ACTIVE__TWO_BORE"
  | "RIGHT_ACTIVE__THREE_BORE";

export type PieceDiagramTintedPaneCount = 0 | 1 | 2;

export type PieceDiagramLowEProfile = "SB70";

export type PieceDiagramGlassProfile =
  | "CLEAR_CLEAR"
  | "CLEAR_LOWE_SB70"
  | "GREY_CLEAR"
  | "BRONZE_CLEAR"
  | "GREEN_CLEAR"
  | "AZURIA_CLEAR"
  | "GREY_GREY"
  | "BRONZE_BRONZE"
  | "GREEN_GREEN"
  | "GREY_LOWE_SB70"
  | "GREY_GREY_LOWE_SB70"
  | "BRONZE_LOWE_SB70"
  | "BRONZE_BRONZE_LOWE_SB70"
  | "GREEN_LOWE_SB70"
  | "GREEN_GREEN_LOWE_SB70";

export type PieceDiagramInterlayerProfile =
  | "PVB_CLEAR_090"
  | "PVB_WHITE_090_TRANSLUCENT";

export type PieceDiagramGlassOptionId =
  `${PieceDiagramGlassProfile}__${PieceDiagramInterlayerProfile}`;

export type PieceDiagramSeries600MixedConfiguration =
  | "OX"
  | "OOX"
  | "XO"
  | "XOO"
  | "OXO"
  | "OXOO"
  | "OOXO"
  | "OOXOO"
  | "OXX"
  | "OOXX"
  | "XXO"
  | "XXOO"
  | "OXXO"
  | "OXXOO"
  | "OOXXO"
  | "OOXXOO";

type PieceDiagramSeries600MixedPieceBase = {
  width: string | number;
  height: string | number;
};

export type PieceDiagramSeries600MixedPiece =
  | (PieceDiagramSeries600MixedPieceBase & {
      kind: "O";
    })
  | (PieceDiagramSeries600MixedPieceBase & {
      kind: "X";
      exteriorHingeSide: PieceDiagramExteriorHingeSide;
    })
  | (PieceDiagramSeries600MixedPieceBase & {
      kind: "XX";
      activeLeaf?: PieceDiagramActiveLeaf;
      boreCount?: PieceDiagramBoreCount;
      series600XXStructureId?: PieceDiagramSeries600XXStructureId;
    });

export interface PieceDiagramSeries600MixedAssemblyProps {
  configuration: PieceDiagramSeries600MixedConfiguration;
  pieces: readonly PieceDiagramSeries600MixedPiece[];
  dimensionMode?: DimensionMode;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  tintedPaneCount?: PieceDiagramTintedPaneCount;
  hasCoating?: boolean;
  lowEProfile?: PieceDiagramLowEProfile | null;
  glassProfile?: PieceDiagramGlassProfile;
  interlayerProfile?: PieceDiagramInterlayerProfile;
  glassOptionId?: PieceDiagramGlassOptionId;
  movementIndicatorColor?: string;
  showDimensions?: boolean;
  idNamespace?: string;
  variant?: PieceDiagramVariant;
  className?: string;
}

export interface PieceDiagramData {
  width?: DiagramValue;
  height?: DiagramValue;
  heightLeft?: DiagramValue;
  heightRight?: DiagramValue;
  legHeight?: DiagramValue;
  sashHeight?: DiagramValue;
  windowHeight?: DiagramValue;
  privacy?: boolean | null;

  doorWidth?: DiagramValue;
  doorHeight?: DiagramValue;
  leftSideliteWidth?: DiagramValue;
  rightSideliteWidth?: DiagramValue;
  leftPanels?: DiagramValue;
  rightPanels?: DiagramValue;
  panelCount?: DiagramValue;
  horizontalHeights?: number[] | null;
}

export interface PieceDiagramProps {
  diagramFamily?: DiagramFamily;
  configuration?: string;
  dimensionMode?: DimensionMode;
  piece?: PieceDiagramData;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  tintedPaneCount?: PieceDiagramTintedPaneCount;
  hasCoating?: boolean;
  lowEProfile?: PieceDiagramLowEProfile | null;
  glassProfile?: PieceDiagramGlassProfile;
  interlayerProfile?: PieceDiagramInterlayerProfile;
  glassOptionId?: PieceDiagramGlassOptionId;
  movementIndicatorColor?: string;
  visualTemplate?: PieceDiagramVisualTemplate;
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  activeLeaf?: PieceDiagramActiveLeaf;
  boreCount?: PieceDiagramBoreCount;
  series600XXStructureId?: PieceDiagramSeries600XXStructureId;
  series600MixedPieces?: readonly PieceDiagramSeries600MixedPiece[];
  showDimensions?: boolean;
  idNamespace?: string;
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

/*
 * C025 uses the exact C017 structural master approved by the user. E610, the
 * lock stile, hardware and all frame pixels are baked into this plate. Glass
 * never selects or regenerates structure; it only selects an optical patch.
 */
const SERIES_600_C025_STRUCTURAL_ASSET_HREF =
  "/product-diagrams/eco-series-600-x-c025-structural-master.png";

const SERIES_600_C025_STRUCTURAL_SOURCE = {
  imageWidth: 690,
  imageHeight: 1569,
  frameX: 68,
  frameY: 40,
  frameWidth: 586,
  frameHeight: 1517,
  glassX: 172,
  glassY: 142,
  glassWidth: 373,
  glassHeight: 1265,
} as const;

/*
 * C031 promotes the user-approved C030 fixed sidelite (configuration O).
 * The original 885 x 1777 approval render remains byte-identical. Runtime
 * uses its literal production crop as the neutral aspect reference and
 * replaces only the glass interior with one of the 30 shared C025 patches.
 */
const SERIES_600_O_C031_STRUCTURAL_ASSET_HREF =
  "/product-diagrams/eco-series-600-o-c031/fixed-panel.png";

const SERIES_600_O_C031_STRUCTURAL_SOURCE = {
  imageWidth: 370,
  imageHeight: 1648,
  frameX: 0,
  frameY: 0,
  frameWidth: 370,
  frameHeight: 1648,
  glassX: 63,
  glassY: 97,
  glassWidth: 243,
  glassHeight: 1444,
  approvedFullCanvasSha256:
    "109465fc2d15ec4864e662340591bd49e9e3f223988f95bd99cfee2c2a7fec59",
  productionPlateSha256:
    "98e5c6dc4c91163e49e2ad3d0de1184e282bbb24ce8ef7540b2cd3c5f614e0bd",
} as const;

/*
 * C035 promotes the six C034 mixed assemblies. The nominal boundary between
 * pieces is the midpoint of a physical 1/2-inch joint: each adjacent draw box
 * extends 1/4 inch across that boundary. Individual W labels therefore sum
 * exactly to TOTAL W even though the frames overlap visually.
 *
 * Standalone X deliberately keeps the C029 1517-row source calibration. Mixed
 * X alone clips the 51 external shadow rows and maps the 1466-row physical
 * frame to the same full height as O/XX, eliminating the rejected C033 filler.
 */
const SERIES_600_MIXED_OVERLAP_INCHES = 0.5;
const SERIES_600_MIXED_HALF_OVERLAP_INCHES =
  SERIES_600_MIXED_OVERLAP_INCHES / 2;
const SERIES_600_MIXED_X_PHYSICAL_FRAME_HEIGHT = 1466;
const SERIES_600_MIXED_DIMENSION_COLOR = "#2F3B45";

type Series600MixedPieceKind = PieceDiagramSeries600MixedPiece["kind"];

const SERIES_600_MIXED_PATTERN: Record<
  PieceDiagramSeries600MixedConfiguration,
  readonly Series600MixedPieceKind[]
> = {
  OX: ["O", "X"],
  OOX: ["O", "O", "X"],
  XO: ["X", "O"],
  XOO: ["X", "O", "O"],
  OXO: ["O", "X", "O"],
  OXOO: ["O", "X", "O", "O"],
  OOXO: ["O", "O", "X", "O"],
  OOXOO: ["O", "O", "X", "O", "O"],
  OXX: ["O", "XX"],
  OOXX: ["O", "O", "XX"],
  XXO: ["XX", "O"],
  XXOO: ["XX", "O", "O"],
  OXXO: ["O", "XX", "O"],
  OXXOO: ["O", "XX", "O", "O"],
  OOXXO: ["O", "O", "XX", "O"],
  OOXXOO: ["O", "O", "XX", "O", "O"],
};

type Series600XXStructureDefinition = {
  href: string;
  approvedFullCanvasSha256: string;
  productionPlateSha256: string;
  activeLeaf: PieceDiagramActiveLeaf;
  boreCount: PieceDiagramBoreCount;
  leftGlass: { x: number; y: number; width: number; height: number };
  rightGlass: { x: number; y: number; width: number; height: number };
};

/*
 * C029 promotes the four C028 structures approved by the user. The production
 * plates are losslessly cropped from their canonical 1254 x 1254 masters.
 * Left and right use variant-specific crop origins so changing active leaf does
 * not produce the 4 px canvas jump present in the approval sheet. No frame
 * pixel is regenerated or repainted by glass selection.
 */
const SERIES_600_XX_C029_SOURCE = {
  imageWidth: 944,
  imageHeight: 1120,
  frameWidth: 944,
  frameHeight: 1120,
} as const;

const SERIES_600_XX_STRUCTURE_ASSET: Record<
  PieceDiagramSeries600XXStructureId,
  Series600XXStructureDefinition
> = {
  LEFT_ACTIVE__TWO_BORE: {
    href: "/product-diagrams/eco-series-600-xx-c029-structure/left-active-two-bore.png",
    approvedFullCanvasSha256: "4b6eb5881bceb3cfda8817af079839ac57cfdd71b8f3fa10fcbd570fc5810e36",
    productionPlateSha256: "4c4d77804ac3dcf1fd399e27f61fa695882ee373d20c1daa218087763d5febd1",
    activeLeaf: "left",
    boreCount: 2,
    leftGlass: { x: 96, y: 93, width: 315, height: 944 },
    rightGlass: { x: 537, y: 93, width: 315, height: 944 },
  },
  LEFT_ACTIVE__THREE_BORE: {
    href: "/product-diagrams/eco-series-600-xx-c029-structure/left-active-three-bore.png",
    approvedFullCanvasSha256: "1ade081ca6307b7056ea38c0341d63de2e69b1831e775ec7177eb02788f6c4a7",
    productionPlateSha256: "bf34cba4d7d179600ea74b9ac8da5b5253949d2bef0f109bd1479aa1907daa88",
    activeLeaf: "left",
    boreCount: 3,
    leftGlass: { x: 96, y: 93, width: 315, height: 944 },
    rightGlass: { x: 537, y: 93, width: 315, height: 944 },
  },
  RIGHT_ACTIVE__TWO_BORE: {
    href: "/product-diagrams/eco-series-600-xx-c029-structure/right-active-two-bore.png",
    approvedFullCanvasSha256: "1baba9cac263603e9078e98153907957874f86f13db2b65ab7684b9b16a4b23b",
    productionPlateSha256: "bede2be5614b1a5c25b29ad10c841859e080e19bb15d73b2b74eb769e1049556",
    activeLeaf: "right",
    boreCount: 2,
    leftGlass: { x: 92, y: 93, width: 315, height: 944 },
    rightGlass: { x: 533, y: 93, width: 315, height: 944 },
  },
  RIGHT_ACTIVE__THREE_BORE: {
    href: "/product-diagrams/eco-series-600-xx-c029-structure/right-active-three-bore.png",
    approvedFullCanvasSha256: "b7281cfab32544b7f83c104a7b154f102b6403d30ba4ca648e22dae5615a64b2",
    productionPlateSha256: "e1e9ba7ab8b67316ebc189861c04a9156cf6e741c7b5f3b1957c2afd62e89120",
    activeLeaf: "right",
    boreCount: 3,
    leftGlass: { x: 92, y: 93, width: 315, height: 944 },
    rightGlass: { x: 533, y: 93, width: 315, height: 944 },
  },
};

const SERIES_600_BORDERLESS_GLASS_OPENING = {
  x: 172,
  y: 142,
  width: 373,
  height: 1265,
} as const;

const SERIES_600_BORDERLESS_GLASS_OPTICAL_CORE = {
  x: 0,
  y: 0,
  width: 373,
  height: 1265,
} as const;

const SERIES_600_DOUBLE_TINT_GLASS_OPENING =
  SERIES_600_BORDERLESS_GLASS_OPENING;

const SERIES_600_DOUBLE_TINT_GLASS_OPTICAL_CORE =
  SERIES_600_BORDERLESS_GLASS_OPTICAL_CORE;

const SERIES_600_GLASS_OPTION_ASSET: Record<
  PieceDiagramGlassOptionId,
  string
> = {
  CLEAR_CLEAR__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/01-clear-clear.png",
  CLEAR_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/15-clear-lowe-sb70.png",
  GREY_CLEAR__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/02-grey-clear.png",
  BRONZE_CLEAR__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/03-bronze-clear.png",
  GREEN_CLEAR__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/04-green-clear.png",
  AZURIA_CLEAR__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/05-azuria-clear.png",
  GREY_GREY__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/06-grey-grey.png",
  BRONZE_BRONZE__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/07-bronze-bronze.png",
  GREEN_GREEN__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/08-green-green.png",
  GREY_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/09-grey-lowe-sb70.png",
  GREY_GREY_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/10-grey-grey-lowe-sb70.png",
  BRONZE_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/11-bronze-lowe-sb70.png",
  BRONZE_BRONZE_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/12-bronze-bronze-lowe-sb70.png",
  GREEN_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/13-green-lowe-sb70.png",
  GREEN_GREEN_LOWE_SB70__PVB_CLEAR_090: "/product-diagrams/eco-series-600-x-c025-glass/pvb-clear/14-green-green-lowe-sb70.png",
  CLEAR_CLEAR__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/01-clear-clear-pvb-white-090-translucent.png",
  CLEAR_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/15-clear-lowe-sb70-pvb-white-090-translucent.png",
  GREY_CLEAR__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/02-grey-clear-pvb-white-090-translucent.png",
  BRONZE_CLEAR__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/03-bronze-clear-pvb-white-090-translucent.png",
  GREEN_CLEAR__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/04-green-clear-pvb-white-090-translucent.png",
  AZURIA_CLEAR__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/05-azuria-clear-pvb-white-090-translucent.png",
  GREY_GREY__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/06-grey-grey-pvb-white-090-translucent.png",
  BRONZE_BRONZE__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/07-bronze-bronze-pvb-white-090-translucent.png",
  GREEN_GREEN__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/08-green-green-pvb-white-090-translucent.png",
  GREY_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/09-grey-lowe-sb70-pvb-white-090-translucent.png",
  GREY_GREY_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/10-grey-grey-lowe-sb70-pvb-white-090-translucent.png",
  BRONZE_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/11-bronze-lowe-sb70-pvb-white-090-translucent.png",
  BRONZE_BRONZE_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/12-bronze-bronze-lowe-sb70-pvb-white-090-translucent.png",
  GREEN_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/13-green-lowe-sb70-pvb-white-090-translucent.png",
  GREEN_GREEN_LOWE_SB70__PVB_WHITE_090_TRANSLUCENT: "/product-diagrams/eco-series-600-x-c025-glass/pvb-white/14-green-green-lowe-sb70-pvb-white-090-translucent.png",
};

const DEFAULT_SERIES_600_INTERLAYER: PieceDiagramInterlayerProfile =
  "PVB_CLEAR_090";

const SERIES_600_REFERENCE_WIDTH = 36;
const SERIES_600_REFERENCE_HEIGHT = 80;

const SERIES_600_TINT_CHROMA = 0.42342773;
const SERIES_600_TINT_LIFT = 5.25;
const SERIES_600_TINT_SOURCE_MEAN = [
  231.46434424,
  230.58965428,
  230.84251579,
] as const;
const SERIES_600_TINT_CHANNEL_CONTRAST = [
  1.48879471,
  1.44575554,
  1.46856082,
] as const;

/*
 * C014 is the approved Group 1 optical profile preserved by release C015 for
 * a white application
 * background. Tint/Clear moves 60% from the neutral D008 source toward the
 * database tint. All five Group 1 materials share the same reduced, softened
 * reflection. Clear/Clear uses its own neutral transmission target but the
 * same optical transform; it is not a separate renderer.
 */
const SERIES_600_CLEAR_TARGET_MEAN = [227.55, 227.38, 227.72] as const;
const SERIES_600_SINGLE_TINT_STRENGTH = 0.6;
const SERIES_600_REFLECTION_SCALE = 0.32;
const SERIES_600_REFLECTION_BLUR = 0.9;

/*
 * C019 Solarban 70 visual calibration.
 *
 * SB70 remains one coating regardless of whether the laminated construction
 * contains one or two tinted plies. The coating acts on the already-resolved
 * tint transmission and uses the same D008 reflection map and blur as C018.
 * These display values are perceptual render controls for a white app
 * background; they are not certified VLT or reflectance measurements.
 */
const SERIES_600_SB70_TRANSMISSION_LUMA = 0.94;
const SERIES_600_SB70_TRANSMISSION_RGB_OFFSET = [-3, 1, 0] as const;
const SERIES_600_SB70_REFLECTION_SCALE = 0.46;

function resolveGlassFill(hexCode?: string | null): string {
  const value = hexCode?.trim();

  return value && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.toUpperCase()
    : DEFAULT_GLASS_FILL;
}

function resolveSeries600GlassProfile(
  explicitProfile: PieceDiagramGlassProfile | undefined,
  glassColor: string,
  tintedPaneCount: PieceDiagramTintedPaneCount,
  lowEProfile: PieceDiagramLowEProfile | null,
): PieceDiagramGlassProfile {
  if (explicitProfile) return explicitProfile;

  const family =
    glassColor === "#A8B0B8"
      ? "GREY"
      : glassColor === "#8A6A4E"
        ? "BRONZE"
        : glassColor === "#8FA78C"
          ? "GREEN"
          : glassColor === "#7FB7D9"
            ? "AZURIA"
            : "CLEAR";

  if (family === "CLEAR") {
    return lowEProfile === "SB70" ? "CLEAR_LOWE_SB70" : "CLEAR_CLEAR";
  }
  if (family === "AZURIA") {
    if (lowEProfile === "SB70" || tintedPaneCount === 2) {
      throw new Error(
        "Unsupported ECO Series 600 X Azuria identity: only AZURIA_CLEAR is approved",
      );
    }
    return "AZURIA_CLEAR";
  }

  if (lowEProfile === "SB70") {
    return `${family}${tintedPaneCount === 2 ? `_${family}` : ""}_LOWE_SB70` as PieceDiagramGlassProfile;
  }

  return `${family}_${tintedPaneCount === 2 ? family : "CLEAR"}` as PieceDiagramGlassProfile;
}

function resolveSeries600GlassOptionId(
  explicitOptionId: PieceDiagramGlassOptionId | undefined,
  baseProfile: PieceDiagramGlassProfile,
  interlayerProfile: PieceDiagramInterlayerProfile,
  hasExplicitBaseProfile: boolean,
  hasExplicitInterlayerProfile: boolean,
): PieceDiagramGlassOptionId {
  if (explicitOptionId) {
    const [optionBaseProfile, optionInterlayerProfile] = explicitOptionId.split(
      "__",
    ) as [PieceDiagramGlassProfile, PieceDiagramInterlayerProfile];
    if (hasExplicitBaseProfile && optionBaseProfile !== baseProfile) {
      throw new Error(
        `Conflicting ECO Series 600 X glass identities: ${explicitOptionId} vs ${baseProfile}`,
      );
    }
    if (
      hasExplicitInterlayerProfile &&
      optionInterlayerProfile !== interlayerProfile
    ) {
      throw new Error(
        `Conflicting ECO Series 600 X interlayer identities: ${explicitOptionId} vs ${interlayerProfile}`,
      );
    }
  }

  const optionId = explicitOptionId ?? `${baseProfile}__${interlayerProfile}`;

  if (
    !Object.prototype.hasOwnProperty.call(
      SERIES_600_GLASS_OPTION_ASSET,
      optionId,
    )
  ) {
    throw new Error(`Unsupported ECO Series 600 X glass option: ${optionId}`);
  }

  return optionId as PieceDiagramGlassOptionId;
}

function resolveSeries600XXStructureId(
  explicitStructureId: PieceDiagramSeries600XXStructureId | undefined,
  activeLeaf: PieceDiagramActiveLeaf | undefined,
  boreCount: PieceDiagramBoreCount | undefined,
): PieceDiagramSeries600XXStructureId {
  if (
    activeLeaf !== undefined &&
    activeLeaf !== "left" &&
    activeLeaf !== "right"
  ) {
    throw new Error(
      `Unsupported ECO Series 600 XX activeLeaf: ${String(activeLeaf)}`,
    );
  }
  if (boreCount !== undefined && boreCount !== 2 && boreCount !== 3) {
    throw new Error(
      `Unsupported ECO Series 600 XX boreCount: ${String(boreCount)}`,
    );
  }
  if ((activeLeaf === undefined) !== (boreCount === undefined)) {
    throw new Error(
      "ECO Series 600 XX activeLeaf and boreCount must be supplied together",
    );
  }
  if (!explicitStructureId && activeLeaf === undefined) {
    throw new Error(
      "ECO Series 600 XX requires activeLeaf and boreCount, or an explicit series600XXStructureId",
    );
  }

  const normalizedStructureId =
    activeLeaf !== undefined && boreCount !== undefined
      ? (`${activeLeaf.toUpperCase()}_ACTIVE__${boreCount === 2 ? "TWO" : "THREE"}_BORE` as PieceDiagramSeries600XXStructureId)
      : undefined;

  if (
    explicitStructureId &&
    normalizedStructureId &&
    explicitStructureId !== normalizedStructureId
  ) {
    throw new Error(
      `Conflicting ECO Series 600 XX structural identities: ${explicitStructureId} vs ${normalizedStructureId}`,
    );
  }

  const structureId = explicitStructureId ?? normalizedStructureId;
  if (
    !structureId ||
    !Object.prototype.hasOwnProperty.call(
      SERIES_600_XX_STRUCTURE_ASSET,
      structureId,
    )
  ) {
    throw new Error(`Unsupported ECO Series 600 XX structure: ${structureId}`);
  }

  return structureId;
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

function isDarkHex(hexCode: string): boolean {
  const red = Number.parseInt(hexCode.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hexCode.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hexCode.slice(5, 7), 16) / 255;

  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const luminance =
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue);

  return luminance < 0.38;
}

/*
 * One shared optical transform serves Clear/Clear and every Group 1 tint. The
 * database remains authoritative for glassTintHex; this function only converts
 * that color into an sRGB SVG matrix while retaining the luminance variation
 * and highlights of the approved D008 material plate.
 */
function resolveSeries600TintStrength(
  tintedPaneCount: PieceDiagramTintedPaneCount,
): number {
  return 1 - (1 - SERIES_600_SINGLE_TINT_STRENGTH) ** tintedPaneCount;
}

function resolveSeries600TintColorMatrix(
  hexCode: string,
  tintedPaneCount: PieceDiagramTintedPaneCount,
  lowEProfile: PieceDiagramLowEProfile | null = null,
): string {
  const red = Number.parseInt(hexCode.slice(1, 3), 16);
  const green = Number.parseInt(hexCode.slice(3, 5), 16);
  const blue = Number.parseInt(hexCode.slice(5, 7), 16);
  const tintLuminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const displayTint = [red, green, blue].map(
    (channel) =>
      tintLuminance +
      SERIES_600_TINT_CHROMA * (channel - tintLuminance) +
      SERIES_600_TINT_LIFT,
  );
  const tintStrength = resolveSeries600TintStrength(tintedPaneCount);
  const baseTargetMean =
    hexCode.toUpperCase() === DEFAULT_GLASS_FILL
      ? SERIES_600_CLEAR_TARGET_MEAN
      : displayTint.map(
          (channel, index) =>
            SERIES_600_TINT_SOURCE_MEAN[index] +
            tintStrength *
              (channel - SERIES_600_TINT_SOURCE_MEAN[index]),
        );
  const targetMean =
    lowEProfile === "SB70"
      ? baseTargetMean.map(
          (channel, index) =>
            channel * SERIES_600_SB70_TRANSMISSION_LUMA +
            SERIES_600_SB70_TRANSMISSION_RGB_OFFSET[index],
        )
      : baseTargetMean;
  const row = (channel: 0 | 1 | 2) => {
    const contrast =
      SERIES_600_TINT_CHANNEL_CONTRAST[channel] *
      (lowEProfile === "SB70"
        ? SERIES_600_SB70_REFLECTION_SCALE
        : SERIES_600_REFLECTION_SCALE);

    return [
      channel === 0 ? contrast : 0,
      channel === 1 ? contrast : 0,
      channel === 2 ? contrast : 0,
      0,
      (targetMean[channel] -
        contrast * SERIES_600_TINT_SOURCE_MEAN[channel]) /
        255,
    ]
      .map((value) => value.toFixed(8))
      .join(" ");
  };
  return `${row(0)} ${row(1)} ${row(2)} 0 0 0 1 0`;
}

function toSvgIdToken(value: string): string {
  return Array.from(value)
    .map((character) => {
      if (/^[a-zA-Z0-9_-]$/.test(character)) {
        return character;
      }

      return `_u${character.codePointAt(0)?.toString(16) ?? "0"}_`;
    })
    .join("");
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

function Series600XApprovedPhotoDiagram({
  width,
  height,
  hingeSide,
  frameColor,
  glassOptionId,
  movementIndicatorColor,
  movementIndicatorIdNamespace,
}: {
  width: number;
  height: number;
  hingeSide: PieceDiagramExteriorHingeSide;
  frameColor: string;
  glassOptionId: PieceDiagramGlassOptionId;
  movementIndicatorColor?: string;
  movementIndicatorIdNamespace?: string;
}) {
  const source = SERIES_600_C025_STRUCTURAL_SOURCE;
  const scaleX = width / source.frameWidth;
  const scaleY = height / source.frameHeight;

  const imageX = -source.frameX * scaleX;
  const imageY = -source.frameY * scaleY;
  const imageWidth = source.imageWidth * scaleX;
  const imageHeight = source.imageHeight * scaleY;

  const opening = SERIES_600_BORDERLESS_GLASS_OPENING;
  const glassX = (opening.x - source.frameX) * scaleX;
  const glassY = (opening.y - source.frameY) * scaleY;
  const glassWidth = opening.width * scaleX;
  const glassHeight = opening.height * scaleY;

  const normalizedFrameColor = frameColor.toUpperCase();
  const isWhiteFrame = normalizedFrameColor === "#FFFFFF";
  const frameTintOpacity = isWhiteFrame ? 0 : 0.72;
  const glassAssetHref = SERIES_600_GLASS_OPTION_ASSET[glassOptionId];
  const [baseGlassProfile, interlayerProfile] = glassOptionId.split("__") as [
    PieceDiagramGlassProfile,
    PieceDiagramInterlayerProfile,
  ];

  const frameMaterialPath = [
    `M 0 0 H ${width} V ${height} H 0 Z`,
    `M ${glassX} ${glassY} H ${glassX + glassWidth}`,
    `V ${glassY + glassHeight} H ${glassX} Z`,
  ].join(" ");

  const mirroredTransform =
    hingeSide === "left" ? `translate(${width} 0) scale(-1 1)` : undefined;
  const indicatorGlassX =
    hingeSide === "left" ? width - glassX - glassWidth : glassX;
  const productClipId = `${toSvgIdToken(
    movementIndicatorIdNamespace ?? "series600-x",
  )}-product-frame-clip`;

  return (
    <>
      <defs>
        <clipPath id={productClipId} clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g
        transform={mirroredTransform}
        clipPath={`url(#${productClipId})`}
        data-visual-template="ECO_SERIES_600_X_EXTERIOR"
        data-approved-reference="C017_STRUCTURAL_MASTER"
        data-structural-master-sha256="5c649b973262f3acc02ba8db10807186123315d2a0a556b278159713085b8758"
        data-render-engine="immutable-structure-plus-glass-option-c025"
        data-view-side="exterior"
        data-glass-option-id={glassOptionId}
        data-base-glass-profile={baseGlassProfile}
        data-interlayer-profile={interlayerProfile}
        data-e610-source="baked-into-approved-structural-master"
      >
        <image
          href={SERIES_600_C025_STRUCTURAL_ASSET_HREF}
          x={imageX}
          y={imageY}
          width={imageWidth}
          height={imageHeight}
          preserveAspectRatio="none"
          data-part="approved-c017-structural-master"
        />

        <image
          href={glassAssetHref}
          x={glassX}
          y={glassY}
          width={glassWidth}
          height={glassHeight}
          preserveAspectRatio="none"
          data-part="runtime-glass-optical-patch"
          data-glass-frame-union="c017-locked"
        />

        {frameTintOpacity > 0 && (
          <path
            d={frameMaterialPath}
            fill={frameColor}
            fillOpacity={frameTintOpacity}
            fillRule="evenodd"
            clipRule="evenodd"
            data-part="runtime-frame-color"
          />
        )}
      </g>

      {movementIndicatorColor !== undefined ? (
        <Serie600MovementIndicators
          panels={[
            {
              kind: "X",
              hingeSide,
              role: "OPERABLE",
              glass: {
                x: indicatorGlassX,
                y: glassY,
                width: glassWidth,
                height: glassHeight,
              },
            },
          ]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorIdNamespace}
        />
      ) : null}
    </>
  );
}

function Series600OApprovedPhotoDiagram({
  width,
  height,
  frameColor,
  glassOptionId,
  movementIndicatorColor,
  movementIndicatorIdNamespace,
}: {
  width: number;
  height: number;
  frameColor: string;
  glassOptionId: PieceDiagramGlassOptionId;
  movementIndicatorColor?: string;
  movementIndicatorIdNamespace?: string;
}) {
  const source = SERIES_600_O_C031_STRUCTURAL_SOURCE;
  const scaleX = width / source.frameWidth;
  const scaleY = height / source.frameHeight;
  const imageX = -source.frameX * scaleX;
  const imageY = -source.frameY * scaleY;
  const imageWidth = source.imageWidth * scaleX;
  const imageHeight = source.imageHeight * scaleY;
  const glassX = (source.glassX - source.frameX) * scaleX;
  const glassY = (source.glassY - source.frameY) * scaleY;
  const glassWidth = source.glassWidth * scaleX;
  const glassHeight = source.glassHeight * scaleY;
  const normalizedFrameColor = frameColor.toUpperCase();
  const frameTintOpacity = normalizedFrameColor === "#FFFFFF" ? 0 : 0.72;
  const glassAssetHref = SERIES_600_GLASS_OPTION_ASSET[glassOptionId];
  const [baseGlassProfile, interlayerProfile] = glassOptionId.split("__") as [
    PieceDiagramGlassProfile,
    PieceDiagramInterlayerProfile,
  ];
  const frameMaterialPath = [
    `M 0 0 H ${width} V ${height} H 0 Z`,
    `M ${glassX} ${glassY} H ${glassX + glassWidth}`,
    `V ${glassY + glassHeight} H ${glassX} Z`,
  ].join(" ");

  return (
    <g
      data-visual-template="ECO_SERIES_600_O_SIDELITE_EXTERIOR"
      data-product-role="SIDELITE"
      data-structure-id="FIXED_SINGLE_LITE"
      data-approved-reference="C030_STRUCTURAL_MASTER"
      data-approved-full-canvas-sha256={source.approvedFullCanvasSha256}
      data-production-plate-sha256={source.productionPlateSha256}
      data-render-engine="immutable-c030-structure-plus-single-pane-patch-c031"
      data-view-side="exterior"
      data-glass-option-id={glassOptionId}
      data-base-glass-profile={baseGlassProfile}
      data-interlayer-profile={interlayerProfile}
      data-glass-pane-count="1"
    >
      <image
        href={SERIES_600_O_C031_STRUCTURAL_ASSET_HREF}
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={imageHeight}
        preserveAspectRatio="none"
        data-part="approved-c030-structural-master"
      />

      <image
        href={glassAssetHref}
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        preserveAspectRatio="none"
        data-part="runtime-glass-optical-patch"
        data-glass-frame-union="c030-locked"
      />

      {frameTintOpacity > 0 && (
        <path
          d={frameMaterialPath}
          fill={frameColor}
          fillOpacity={frameTintOpacity}
          fillRule="evenodd"
          clipRule="evenodd"
          data-part="runtime-frame-color"
        />
      )}
      {movementIndicatorColor !== undefined ? (
        <Serie600MovementIndicators
          panels={[
            {
              kind: "O",
              role: "FIXED",
              glass: {
                x: glassX,
                y: glassY,
                width: glassWidth,
                height: glassHeight,
              },
            },
          ]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorIdNamespace}
        />
      ) : null}
    </g>
  );
}

function Series600XXApprovedPhotoDiagram({
  width,
  height,
  structureId,
  frameColor,
  glassOptionId,
  movementIndicatorColor,
  movementIndicatorIdNamespace,
}: {
  width: number;
  height: number;
  structureId: PieceDiagramSeries600XXStructureId;
  frameColor: string;
  glassOptionId: PieceDiagramGlassOptionId;
  movementIndicatorColor?: string;
  movementIndicatorIdNamespace?: string;
}) {
  const source = SERIES_600_XX_C029_SOURCE;
  const structure = SERIES_600_XX_STRUCTURE_ASSET[structureId];
  const scaleX = width / source.frameWidth;
  const scaleY = height / source.frameHeight;
  const leftGlass = {
    x: structure.leftGlass.x * scaleX,
    y: structure.leftGlass.y * scaleY,
    width: structure.leftGlass.width * scaleX,
    height: structure.leftGlass.height * scaleY,
  };
  const rightGlass = {
    x: structure.rightGlass.x * scaleX,
    y: structure.rightGlass.y * scaleY,
    width: structure.rightGlass.width * scaleX,
    height: structure.rightGlass.height * scaleY,
  };
  const normalizedFrameColor = frameColor.toUpperCase();
  const frameTintOpacity = normalizedFrameColor === "#FFFFFF" ? 0 : 0.72;
  const glassAssetHref = SERIES_600_GLASS_OPTION_ASSET[glassOptionId].replace(
    "eco-series-600-x-c025-glass",
    "eco-series-600-xx-c029-glass-overlays",
  );
  const [baseGlassProfile, interlayerProfile] = glassOptionId.split("__") as [
    PieceDiagramGlassProfile,
    PieceDiagramInterlayerProfile,
  ];
  const frameMaterialPath = [
    `M 0 0 H ${width} V ${height} H 0 Z`,
    `M ${leftGlass.x} ${leftGlass.y} H ${leftGlass.x + leftGlass.width}`,
    `V ${leftGlass.y + leftGlass.height} H ${leftGlass.x} Z`,
    `M ${rightGlass.x} ${rightGlass.y} H ${rightGlass.x + rightGlass.width}`,
    `V ${rightGlass.y + rightGlass.height} H ${rightGlass.x} Z`,
  ].join(" ");
  const mirrorOpticalOverlay =
    structure.activeLeaf === "right"
      ? `translate(${width} 0) scale(-1 1)`
      : undefined;

  return (
    <g
      data-visual-template="ECO_SERIES_600_XX_EXTERIOR"
      data-approved-reference="C028_STRUCTURAL_MASTERS"
      data-approved-full-canvas-sha256={structure.approvedFullCanvasSha256}
      data-production-plate-sha256={structure.productionPlateSha256}
      data-render-engine="immutable-c028-structure-plus-two-pane-overlay-c029"
      data-view-side="exterior"
      data-structure-id={structureId}
      data-active-leaf={structure.activeLeaf}
      data-bore-count={structure.boreCount}
      data-glass-option-id={glassOptionId}
      data-base-glass-profile={baseGlassProfile}
      data-interlayer-profile={interlayerProfile}
      data-active-leaf-overlaps-passive="true"
    >
      <image
        href={structure.href}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
        data-part="approved-c028-structural-master"
      />

      <image
        href={glassAssetHref}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
        transform={mirrorOpticalOverlay}
        data-part="runtime-glass-optical-patch"
        data-glass-pane-count="2"
        data-glass-frame-union="c028-locked"
      />

      {frameTintOpacity > 0 && (
        <path
          d={frameMaterialPath}
          fill={frameColor}
          fillOpacity={frameTintOpacity}
          fillRule="evenodd"
          clipRule="evenodd"
          data-part="runtime-frame-color"
        />
      )}
      {movementIndicatorColor !== undefined ? (
        <Serie600MovementIndicators
          panels={[
            {
              kind: "X",
              hingeSide: "left",
              role: structure.activeLeaf === "left" ? "ACTIVE" : "SECONDARY",
              showArrow: structure.activeLeaf === "left",
              glass: leftGlass,
            },
            {
              kind: "X",
              hingeSide: "right",
              role: structure.activeLeaf === "right" ? "ACTIVE" : "SECONDARY",
              showArrow: structure.activeLeaf === "right",
              glass: rightGlass,
            },
          ]}
          movementIndicatorColor={movementIndicatorColor}
          idNamespace={movementIndicatorIdNamespace}
        />
      ) : null}
    </g>
  );
}

interface Series600XExteriorMaterials {
  framePaint: string;
  frameVerticalPaint: string;
  frameHorizontalPaint: string;
  frameHighlight: string;
  frameShadow: string;
  frameOutline: string;
  glassPaint: string;
  glassSheenPaint: string;
  glassLensingLeftPaint: string;
  glassLensingRightPaint: string;
  glassLensingTopPaint: string;
  glassLensingBottomPaint: string;
  glassCounterHighlightPaint: string;
  glassEdge: string;
  glassEdgeHighlight: string;
  glassGasket: string;
  hardwarePaint: string;
  hingeCapPaint: string;
  hardwareOutline: string;
  prepHoleRimPaint: string;
  prepHolePaint: string;
  productShadowPaint: string;
  productDepthFilter: string;
  profileDepthFilter: string;
  hingeDepthFilter: string;
  specularSoftFilter: string;
}

function Series600XExteriorDiagram({
  width,
  height,
  hingeSide,
  materials,
  variant,
}: {
  width: number;
  height: number;
  hingeSide: PieceDiagramExteriorHingeSide;
  materials: Series600XExteriorMaterials;
  variant: PieceDiagramVariant;
}) {
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum);

  const strokeWidth = variant === "report" ? 0.42 : 0.48;

  /*
   * Calibrado con la elevacion aprobada 36 x 80 (hoja 33 1/2 x 78).
   * Las proporciones se conservan para otras medidas; 36 x 80 no se impone.
   */
  const headJamb = clamp(width * (1 / 36), 2.2, 5.5);
  const sideJamb = clamp(headJamb * 1.25, 2.75, 7.5);
  const thresholdHeight = headJamb;

  const leafX = sideJamb;
  const leafY = headJamb;
  const leafWidth = Math.max(width - sideJamb * 2, 1);
  const leafHeight = Math.max(height - headJamb - thresholdHeight, 1);

  // D008: los stiles y rails pertenecen a la hoja, no al frame fijo.
  // Estos ratios reproducen la abertura full-lite aprobada sin imponer 36 x 80.
  const stileWidth = clamp(leafWidth * 0.156, 6.4, 18);
  const topRail = clamp(leafHeight * 0.062, 7.2, 16);
  const bottomRail = topRail;

  const glassX = leafX + stileWidth;
  const glassY = leafY + topRail;
  const glassWidth = Math.max(leafWidth - stileWidth * 2, 1);
  const glassHeight = Math.max(leafHeight - topRail - bottomRail, 1);

  const gasketWidth = clamp(Math.min(width, height) * 0.006, 0.65, 1.35);
  const beadGap = clamp(Math.min(width, height) * 0.008, 0.7, 1.5);
  const beadDepth = beadGap * 2.25;
  const lensingDepth = clamp(Math.min(width, height) * 0.025, 1.5, 3.2);

  const hingeWidth = clamp(width * 0.03, 2.35, 4.4);
  const hingeHeight = clamp(leafHeight * 0.092, 10, 22);
  const hingeX =
    hingeSide === "right"
      ? leafX + leafWidth - hingeWidth * 0.45
      : leafX - hingeWidth * 0.55;

  const lockStileCenterX =
    hingeSide === "right"
      ? leafX + stileWidth / 2
      : leafX + leafWidth - stileWidth / 2;

  const prepHoleRadius = clamp(width * 0.0293, 2.45, 4.4);
  const deadboltY = leafY + leafHeight * 0.4531;
  const activeHandleY = leafY + leafHeight * 0.5006;

  const hingeCenterRatios = [0.1434, 0.5046, 0.864];

  return (
    <g
      data-visual-template="ECO_SERIES_600_X_EXTERIOR"
      data-approved-reference="D008"
      data-jamb-to-head-sill-ratio="1.25"
      data-glass-optics="ARCHITECTURAL_LAMINATED_D008"
      data-material-source="runtime-props"
      data-view-side="exterior"
    >
      {variant !== "report" && (
        <>
          <rect
            x={0.55}
            y={0.8}
            width={width}
            height={height}
            rx={Math.min(width * 0.008, 1.2)}
            fill="none"
            stroke={materials.frameShadow}
            strokeWidth={1.8}
            opacity={0.075}
            data-part="product-depth-shadow-wide"
          />
          <rect
            x={0.28}
            y={0.42}
            width={width}
            height={height}
            rx={Math.min(width * 0.008, 1.2)}
            fill="none"
            stroke={materials.frameShadow}
            strokeWidth={0.95}
            opacity={0.1}
            data-part="product-depth-shadow-near"
          />
          <line
            x1={width + 0.35}
            y1={headJamb * 0.55}
            x2={width + 0.35}
            y2={height - thresholdHeight * 0.25}
            stroke="#48555C"
            strokeWidth={0.9}
            opacity={0.11}
            data-part="product-side-shadow"
          />
          <line
            x1={sideJamb * 0.45}
            y1={height + 0.45}
            x2={width - sideJamb * 0.15}
            y2={height + 0.45}
            stroke="#48555C"
            strokeWidth={0.9}
            opacity={0.12}
            data-part="product-bottom-shadow"
          />
        </>
      )}

      {/* Sombra de contacto vectorial: sin blur y sin escena reconocible. */}
      {variant !== "report" && (
        <ellipse
          cx={width / 2}
          cy={height + Math.max(thresholdHeight * 0.65, 1.6)}
          rx={width * 0.46}
          ry={Math.max(thresholdHeight * 0.7, 2)}
          fill={materials.productShadowPaint}
          opacity={0.18}
          data-part="contact-shadow"
        />
      )}

      {/* Marco exterior de aluminio powder-coated. */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={Math.min(width * 0.008, 1.2)}
        fill={materials.framePaint}
        stroke={materials.frameOutline}
        strokeWidth={strokeWidth * 0.8}
        filter={variant === "report" ? undefined : materials.productDepthFilter}
        data-part="outer-frame"
      />

      {/* Perfiles fijos separados: jambas 1.25x; head y sill simetricos. */}
      <rect
        x={0}
        y={0}
        width={sideJamb}
        height={height}
        fill={materials.frameVerticalPaint}
        data-part="outer-jamb-left"
      />
      <rect
        x={width - sideJamb}
        y={0}
        width={sideJamb}
        height={height}
        fill={materials.frameVerticalPaint}
        data-part="outer-jamb-right"
      />
      <rect
        x={sideJamb}
        y={0}
        width={Math.max(width - sideJamb * 2, 1)}
        height={headJamb}
        fill={materials.frameHorizontalPaint}
        data-part="outer-head"
      />
      <rect
        x={sideJamb}
        y={height - thresholdHeight}
        width={Math.max(width - sideJamb * 2, 1)}
        height={thresholdHeight}
        fill={materials.frameHorizontalPaint}
        data-part="outer-sill"
      />

      <line
        x1={sideJamb}
        y1={headJamb * 0.78}
        x2={width - sideJamb}
        y2={headJamb * 0.78}
        stroke={materials.frameShadow}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.45}
        data-part="head-reveal"
      />
      <line
        x1={sideJamb}
        y1={height - thresholdHeight * 0.78}
        x2={width - sideJamb}
        y2={height - thresholdHeight * 0.78}
        stroke={materials.frameShadow}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.45}
        data-part="sill-reveal"
      />

      <rect
        x={strokeWidth * 1.1}
        y={strokeWidth * 1.1}
        width={Math.max(width - strokeWidth * 2.2, 1)}
        height={Math.max(height - strokeWidth * 2.2, 1)}
        fill="none"
        stroke={materials.frameHighlight}
        strokeWidth={strokeWidth * 0.7}
        opacity={0.78}
        data-part="outer-frame-highlight"
      />

      <line
        x1={sideJamb * 0.3}
        y1={headJamb * 0.4}
        x2={sideJamb * 0.3}
        y2={height - thresholdHeight * 0.6}
        stroke={materials.frameHighlight}
        strokeWidth={strokeWidth * 0.7}
        opacity={0.76}
        data-part="outer-jamb-highlight"
      />

      <line
        x1={width - sideJamb * 0.3}
        y1={headJamb * 0.4}
        x2={width - sideJamb * 0.3}
        y2={height - thresholdHeight * 0.6}
        stroke={materials.frameShadow}
        strokeWidth={strokeWidth * 0.7}
        opacity={0.6}
        data-part="outer-jamb-shadow"
      />

      {/* Sombra de la junta entre jamb y hoja. */}
      <rect
        x={leafX - beadGap * 0.5}
        y={leafY - beadGap * 0.5}
        width={leafWidth + beadGap}
        height={leafHeight + beadGap}
        fill={materials.glassGasket}
        stroke={materials.frameOutline}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.58}
        filter={variant === "report" ? undefined : materials.profileDepthFilter}
        data-part="door-reveal"
      />

      {/* Hoja full-lite. */}
      <rect
        x={leafX}
        y={leafY}
        width={leafWidth}
        height={leafHeight}
        fill={materials.framePaint}
        stroke={materials.frameOutline}
        strokeWidth={strokeWidth * 0.72}
        data-part="door-leaf"
      />

      <rect
        x={leafX}
        y={leafY}
        width={leafWidth}
        height={topRail}
        fill={materials.frameHorizontalPaint}
        data-part="leaf-top-rail"
      />
      <rect
        x={leafX}
        y={leafY + leafHeight - bottomRail}
        width={leafWidth}
        height={bottomRail}
        fill={materials.frameHorizontalPaint}
        data-part="leaf-bottom-rail"
      />
      <rect
        x={leafX}
        y={leafY + topRail}
        width={stileWidth}
        height={Math.max(leafHeight - topRail - bottomRail, 1)}
        fill={materials.frameVerticalPaint}
        data-part="leaf-lock-stile"
      />
      <rect
        x={leafX + leafWidth - stileWidth}
        y={leafY + topRail}
        width={stileWidth}
        height={Math.max(leafHeight - topRail - bottomRail, 1)}
        fill={materials.frameVerticalPaint}
        data-part="leaf-hinge-stile"
      />

      {[leafX + stileWidth, leafX + leafWidth - stileWidth].map(
        (seamX, index) => (
          <line
            key={`stile-seam-${index}`}
            x1={seamX}
            y1={leafY}
            x2={seamX}
            y2={leafY + topRail}
            stroke={materials.frameShadow}
            strokeWidth={strokeWidth * 0.38}
            opacity={0.34}
            data-part="rail-stile-seam"
          />
        ),
      )}

      <line
        x1={leafX + strokeWidth}
        y1={leafY + strokeWidth}
        x2={leafX + leafWidth - strokeWidth}
        y2={leafY + strokeWidth}
        stroke={materials.frameHighlight}
        strokeWidth={strokeWidth * 0.65}
        opacity={0.85}
        data-part="leaf-highlight"
      />

      <line
        x1={leafX + stileWidth * 0.24}
        y1={leafY + topRail * 0.35}
        x2={leafX + stileWidth * 0.24}
        y2={leafY + leafHeight - bottomRail * 0.35}
        stroke={materials.frameHighlight}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.62}
        data-part="lock-stile-highlight"
      />

      <line
        x1={leafX + leafWidth - stileWidth * 0.24}
        y1={leafY + topRail * 0.35}
        x2={leafX + leafWidth - stileWidth * 0.24}
        y2={leafY + leafHeight - bottomRail * 0.35}
        stroke={materials.frameShadow}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.54}
        data-part="hinge-stile-shadow"
      />

      {/* Junquillo extrusionado: cuatro caras, sin cambiar la abertura. */}
      <polygon
        points={`${glassX - beadDepth},${glassY - beadDepth} ${glassX + glassWidth + beadDepth},${glassY - beadDepth} ${glassX + glassWidth},${glassY} ${glassX},${glassY}`}
        fill={materials.frameHorizontalPaint}
        data-part="glazing-bead-top-face"
      />
      <polygon
        points={`${glassX - beadDepth},${glassY + glassHeight + beadDepth} ${glassX + glassWidth + beadDepth},${glassY + glassHeight + beadDepth} ${glassX + glassWidth},${glassY + glassHeight} ${glassX},${glassY + glassHeight}`}
        fill={materials.frameHorizontalPaint}
        data-part="glazing-bead-bottom-face"
      />
      <polygon
        points={`${glassX - beadDepth},${glassY - beadDepth} ${glassX},${glassY} ${glassX},${glassY + glassHeight} ${glassX - beadDepth},${glassY + glassHeight + beadDepth}`}
        fill={materials.frameVerticalPaint}
        data-part="glazing-bead-left-face"
      />
      <polygon
        points={`${glassX + glassWidth + beadDepth},${glassY - beadDepth} ${glassX + glassWidth},${glassY} ${glassX + glassWidth},${glassY + glassHeight} ${glassX + glassWidth + beadDepth},${glassY + glassHeight + beadDepth}`}
        fill={materials.frameVerticalPaint}
        data-part="glazing-bead-right-face"
      />

      {/* Gasket y canto azul-verde del vidrio laminado. */}
      <rect
        x={glassX - gasketWidth}
        y={glassY - gasketWidth}
        width={glassWidth + gasketWidth * 2}
        height={glassHeight + gasketWidth * 2}
        fill={materials.glassGasket}
        stroke={materials.frameOutline}
        strokeWidth={strokeWidth * 0.55}
        filter={variant === "report" ? undefined : materials.profileDepthFilter}
        data-part="glass-gasket"
      />

      <rect
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        fill={materials.glassPaint}
        stroke={materials.glassEdge}
        strokeWidth={strokeWidth * 0.8}
        data-part="glass-base"
      />

      {/* Brillo abstracto de estudio; no contiene arboles, cielo ni entorno. */}
      <rect
        x={glassX + strokeWidth * 0.75}
        y={glassY + strokeWidth * 0.75}
        width={Math.max(glassWidth - strokeWidth * 1.5, 1)}
        height={Math.max(glassHeight - strokeWidth * 1.5, 1)}
        fill={materials.glassSheenPaint}
        opacity={variant === "report" ? 0.52 : 0.66}
        pointerEvents="none"
        data-part="glass-sheen"
      />

      {/* Lensing perimetral: la presencia se concentra en el canto. */}
      <rect
        x={glassX}
        y={glassY}
        width={lensingDepth}
        height={glassHeight}
        fill={materials.glassLensingLeftPaint}
        pointerEvents="none"
        data-part="glass-lensing-left"
      />
      <rect
        x={glassX + glassWidth - lensingDepth}
        y={glassY}
        width={lensingDepth}
        height={glassHeight}
        fill={materials.glassLensingRightPaint}
        pointerEvents="none"
        data-part="glass-lensing-right"
      />
      <rect
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={lensingDepth}
        fill={materials.glassLensingTopPaint}
        pointerEvents="none"
        data-part="glass-lensing-top"
      />
      <rect
        x={glassX}
        y={glassY + glassHeight - lensingDepth}
        width={glassWidth}
        height={lensingDepth}
        fill={materials.glassLensingBottomPaint}
        pointerEvents="none"
        data-part="glass-lensing-bottom"
      />

      {/* Segunda superficie, apenas desplazada, para leer vidrio laminado. */}
      <rect
        x={glassX + beadGap * 0.72}
        y={glassY + beadGap * 0.72}
        width={Math.max(glassWidth - beadGap * 1.44, 1)}
        height={Math.max(glassHeight - beadGap * 1.44, 1)}
        fill="none"
        stroke={materials.glassEdgeHighlight}
        strokeWidth={strokeWidth * 0.38}
        opacity={variant === "report" ? 0.3 : 0.46}
        pointerEvents="none"
        data-part="glass-second-surface"
      />

      {/* Highlight especular irregular y finito: nunca cruza todo el pano. */}
      <path
        d={[
          `M ${glassX + glassWidth * 0.3} ${glassY + glassHeight * 0.012}`,
          `C ${glassX + glassWidth * 0.37} ${glassY + glassHeight * 0.08},`,
          `${glassX + glassWidth * 0.35} ${glassY + glassHeight * 0.2},`,
          `${glassX + glassWidth * 0.29} ${glassY + glassHeight * 0.31}`,
          `C ${glassX + glassWidth * 0.25} ${glassY + glassHeight * 0.38},`,
          `${glassX + glassWidth * 0.22} ${glassY + glassHeight * 0.46},`,
          `${glassX + glassWidth * 0.18} ${glassY + glassHeight * 0.54}`,
          `L ${glassX + glassWidth * 0.1} ${glassY + glassHeight * 0.54}`,
          `C ${glassX + glassWidth * 0.16} ${glassY + glassHeight * 0.4},`,
          `${glassX + glassWidth * 0.21} ${glassY + glassHeight * 0.27},`,
          `${glassX + glassWidth * 0.23} ${glassY + glassHeight * 0.13}`,
          `C ${glassX + glassWidth * 0.25} ${glassY + glassHeight * 0.07},`,
          `${glassX + glassWidth * 0.26} ${glassY + glassHeight * 0.03},`,
          `${glassX + glassWidth * 0.3} ${glassY + glassHeight * 0.012} Z`,
        ].join(" ")}
        fill="#FFFFFF"
        opacity={variant === "report" ? 0.07 : 0.12}
        filter={variant === "report" ? undefined : materials.specularSoftFilter}
        pointerEvents="none"
        data-part="glass-specular-band"
      />

      <path
        d={[
          `M ${glassX + glassWidth * 0.38} ${glassY + glassHeight * 0.018}`,
          `C ${glassX + glassWidth * 0.44} ${glassY + glassHeight * 0.12},`,
          `${glassX + glassWidth * 0.4} ${glassY + glassHeight * 0.25},`,
          `${glassX + glassWidth * 0.32} ${glassY + glassHeight * 0.39}`,
          `C ${glassX + glassWidth * 0.28} ${glassY + glassHeight * 0.46},`,
          `${glassX + glassWidth * 0.25} ${glassY + glassHeight * 0.53},`,
          `${glassX + glassWidth * 0.21} ${glassY + glassHeight * 0.61}`,
          `L ${glassX + glassWidth * 0.15} ${glassY + glassHeight * 0.61}`,
          `C ${glassX + glassWidth * 0.21} ${glassY + glassHeight * 0.46},`,
          `${glassX + glassWidth * 0.27} ${glassY + glassHeight * 0.29},`,
          `${glassX + glassWidth * 0.3} ${glassY + glassHeight * 0.12}`,
          `C ${glassX + glassWidth * 0.32} ${glassY + glassHeight * 0.06},`,
          `${glassX + glassWidth * 0.34} ${glassY + glassHeight * 0.03},`,
          `${glassX + glassWidth * 0.38} ${glassY + glassHeight * 0.018} Z`,
        ].join(" ")}
        fill="#FFFFFF"
        opacity={variant === "report" ? 0.025 : 0.045}
        filter={variant === "report" ? undefined : materials.specularSoftFilter}
        pointerEvents="none"
        data-part="glass-specular-halo"
      />

      <rect
        x={glassX}
        y={glassY}
        width={glassWidth}
        height={glassHeight}
        fill={materials.glassCounterHighlightPaint}
        opacity={variant === "report" ? 0.42 : 0.58}
        pointerEvents="none"
        data-part="glass-counter-highlight"
      />

      <rect
        x={glassX + beadGap}
        y={glassY + beadGap}
        width={Math.max(glassWidth - beadGap * 2, 1)}
        height={Math.max(glassHeight - beadGap * 2, 1)}
        fill="none"
        stroke={materials.glassEdgeHighlight}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.72}
        data-part="glass-inner-highlight"
      />

      {/* Glazing bead: doble linea limpia para dar profundidad al perfil. */}
      <rect
        x={glassX - beadGap * 1.65}
        y={glassY - beadGap * 1.65}
        width={glassWidth + beadGap * 3.3}
        height={glassHeight + beadGap * 3.3}
        fill="none"
        stroke={materials.frameHighlight}
        strokeWidth={strokeWidth * 0.65}
        opacity={0.8}
        data-part="glazing-bead-highlight"
      />

      <rect
        x={glassX - beadGap * 2.25}
        y={glassY - beadGap * 2.25}
        width={glassWidth + beadGap * 4.5}
        height={glassHeight + beadGap * 4.5}
        fill="none"
        stroke={materials.frameOutline}
        strokeWidth={strokeWidth * 0.55}
        opacity={0.5}
        data-part="glazing-bead-shadow"
      />

      {/* Exactamente tres bisagras visibles desde el exterior. */}
      {hingeCenterRatios.map((centerRatio, index) => {
        const hingeY = leafY + leafHeight * centerRatio - hingeHeight / 2;

        return (
          <g
            key={`exterior-hinge-${index}`}
            data-part="exterior-hinge"
            data-side={hingeSide}
            filter={variant === "report" ? undefined : materials.hingeDepthFilter}
          >
            <rect
              x={hingeX + hingeWidth * 0.12}
              y={hingeY + hingeHeight * 0.035}
              width={hingeWidth}
              height={hingeHeight}
              rx={hingeWidth * 0.42}
              fill={materials.hardwareOutline}
              opacity={0.16}
              data-part="hinge-contact-shadow"
            />

            <rect
              x={hingeX}
              y={hingeY}
              width={hingeWidth}
              height={hingeHeight}
              rx={hingeWidth * 0.34}
              fill={materials.hardwarePaint}
              stroke={materials.hardwareOutline}
              strokeWidth={strokeWidth * 0.42}
              data-part="hinge-barrel"
            />

            <ellipse
              cx={hingeX + hingeWidth * 0.5}
              cy={hingeY + hingeHeight * 0.035}
              rx={hingeWidth * 0.35}
              ry={hingeWidth * 0.15}
              fill={materials.hingeCapPaint}
              stroke={materials.hardwareOutline}
              strokeWidth={strokeWidth * 0.28}
              data-part="hinge-top-cap"
            />

            <ellipse
              cx={hingeX + hingeWidth * 0.5}
              cy={hingeY + hingeHeight * 0.965}
              rx={hingeWidth * 0.35}
              ry={hingeWidth * 0.15}
              fill={materials.hingeCapPaint}
              stroke={materials.hardwareOutline}
              strokeWidth={strokeWidth * 0.28}
              data-part="hinge-bottom-cap"
            />

            {[0.33, 0.67].map((seamRatio) => (
              <line
                key={`hinge-seam-${seamRatio}`}
                x1={hingeX + hingeWidth * 0.12}
                y1={hingeY + hingeHeight * seamRatio}
                x2={hingeX + hingeWidth * 0.88}
                y2={hingeY + hingeHeight * seamRatio}
                stroke={materials.hardwareOutline}
                strokeWidth={strokeWidth * 0.34}
                opacity={0.62}
                data-part="hinge-knuckle-seam"
              />
            ))}

            <line
              x1={hingeX + hingeWidth * 0.32}
              y1={hingeY + hingeWidth * 0.42}
              x2={hingeX + hingeWidth * 0.32}
              y2={hingeY + hingeHeight - hingeWidth * 0.42}
              stroke={materials.frameHighlight}
              strokeWidth={strokeWidth * 0.32}
              opacity={0.72}
              data-part="hinge-specular-highlight"
            />
          </g>
        );
      })}

      {/*
       * Solo preparaciones de fabrica. No se dibuja handle, escutcheon,
       * deadbolt instalado ni los dos flush-bolts ocultos en canto/interior.
       */}
      <g
        data-part="deadbolt-prep"
        data-side={hingeSide === "right" ? "left" : "right"}
      >
        <circle
          cx={lockStileCenterX}
          cy={deadboltY}
          r={prepHoleRadius * 1.14}
          fill={materials.prepHoleRimPaint}
          stroke={materials.frameOutline}
          strokeWidth={strokeWidth * 0.24}
        />
        <circle
          cx={lockStileCenterX}
          cy={deadboltY}
          r={prepHoleRadius}
          fill={materials.prepHolePaint}
          stroke={materials.frameOutline}
          strokeWidth={strokeWidth * 0.32}
        />
        <ellipse
          cx={lockStileCenterX - prepHoleRadius * 0.2}
          cy={deadboltY - prepHoleRadius * 0.24}
          rx={prepHoleRadius * 0.22}
          ry={prepHoleRadius * 0.13}
          fill="#FFFFFF"
          opacity={0.18}
          pointerEvents="none"
        />
      </g>

      <g
        data-part="active-handle-prep"
        data-side={hingeSide === "right" ? "left" : "right"}
      >
        <circle
          cx={lockStileCenterX}
          cy={activeHandleY}
          r={prepHoleRadius * 1.14}
          fill={materials.prepHoleRimPaint}
          stroke={materials.frameOutline}
          strokeWidth={strokeWidth * 0.24}
        />
        <circle
          cx={lockStileCenterX}
          cy={activeHandleY}
          r={prepHoleRadius}
          fill={materials.prepHolePaint}
          stroke={materials.frameOutline}
          strokeWidth={strokeWidth * 0.32}
        />
        <ellipse
          cx={lockStileCenterX - prepHoleRadius * 0.2}
          cy={activeHandleY - prepHoleRadius * 0.24}
          rx={prepHoleRadius * 0.22}
          ry={prepHoleRadius * 0.13}
          fill="#FFFFFF"
          opacity={0.18}
          pointerEvents="none"
        />
      </g>

      {/* El sill ya se dibujo simetrico al head. No hay segundo escalon. */}
    </g>
  );
}

function Series600FrameDimensionLayer({
  offsetX,
  offsetY,
  width,
  height,
  displayWidth,
  displayHeight,
  variant,
}: {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  variant: PieceDiagramVariant;
}) {
  const dimensionColor = "#4A5662";
  const reportScale = variant === "report" ? 0.94 : 1;
  const lineWidth = height * (3 / 1517) * reportScale;
  const labelFontSize = height * (30 / 1517) * reportScale;
  const productRight = offsetX + width;
  const productBottom = offsetY + height;

  /* Placement normalized to the approved 919x1712 C017 master. */
  const widthExtensionStartY = productBottom + height * (31 / 1517);
  const widthExtensionEndY = productBottom + height * (84 / 1517);
  const widthLineY = productBottom + height * (55 / 1517);
  const widthLabelY = productBottom + height * (105 / 1517);

  const heightExtensionStartX = productRight + width * (75 / 586);
  const heightExtensionEndX = productRight + width * (120 / 586);
  const heightLineX = productRight + width * (98 / 586);
  const heightLabelX = productRight + width * (103 / 586);
  const heightLabelY = offsetY + height / 2;

  const horizontalArrowDepth = width * (15 / 586);
  const horizontalArrowHalfHeight = height * (8 / 1517);
  const verticalArrowHalfWidth = width * (8 / 586);
  const verticalArrowDepth = height * (16 / 1517);

  const labelProps = {
    fill: dimensionColor,
    fontFamily:
      '"Nimbus Sans", Arial, ui-sans-serif, system-ui, sans-serif',
    fontSize: labelFontSize,
    fontWeight: 700,
    letterSpacing: height * (1.2 / 1517),
  };

  return (
    <g
      data-part="series600-frame-dimensions"
      data-dimension-width={formatDimension(displayWidth)}
      data-dimension-height={formatDimension(displayHeight)}
      pointerEvents="none"
      aria-hidden="true"
    >
      {/* Width (W.): linea, extensiones y flechas debajo del producto. */}
      <g data-part="frame-width-dimension">
        <line
          x1={offsetX}
          y1={widthExtensionStartY}
          x2={offsetX}
          y2={widthExtensionEndY}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-width-extension-left"
        />
        <line
          x1={productRight}
          y1={widthExtensionStartY}
          x2={productRight}
          y2={widthExtensionEndY}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-width-extension-right"
        />
        <line
          x1={offsetX}
          y1={widthLineY}
          x2={productRight}
          y2={widthLineY}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-width-line"
        />
        <path
          d={`M ${offsetX} ${widthLineY} L ${offsetX + horizontalArrowDepth} ${widthLineY - horizontalArrowHalfHeight} L ${offsetX + horizontalArrowDepth} ${widthLineY + horizontalArrowHalfHeight} Z`}
          fill={dimensionColor}
          data-part="frame-width-arrow-left"
        />
        <path
          d={`M ${productRight} ${widthLineY} L ${productRight - horizontalArrowDepth} ${widthLineY - horizontalArrowHalfHeight} L ${productRight - horizontalArrowDepth} ${widthLineY + horizontalArrowHalfHeight} Z`}
          fill={dimensionColor}
          data-part="frame-width-arrow-right"
        />
        <text
          x={offsetX + width / 2}
          y={widthLabelY}
          textAnchor="middle"
          {...labelProps}
          data-part="frame-width-label"
        >
          W. {formatDimension(displayWidth)}&quot;
        </text>
      </g>

      {/* Height (H.): linea, extensiones y flechas a la derecha. */}
      <g data-part="frame-height-dimension">
        <line
          x1={heightExtensionStartX}
          y1={offsetY}
          x2={heightExtensionEndX}
          y2={offsetY}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-height-extension-top"
        />
        <line
          x1={heightExtensionStartX}
          y1={productBottom}
          x2={heightExtensionEndX}
          y2={productBottom}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-height-extension-bottom"
        />
        <line
          x1={heightLineX}
          y1={offsetY}
          x2={heightLineX}
          y2={productBottom}
          stroke={dimensionColor}
          strokeWidth={lineWidth}
          data-part="frame-height-line"
        />
        <path
          d={`M ${heightLineX} ${offsetY} L ${heightLineX - verticalArrowHalfWidth} ${offsetY + verticalArrowDepth} L ${heightLineX + verticalArrowHalfWidth} ${offsetY + verticalArrowDepth} Z`}
          fill={dimensionColor}
          data-part="frame-height-arrow-top"
        />
        <path
          d={`M ${heightLineX} ${productBottom} L ${heightLineX - verticalArrowHalfWidth} ${productBottom - verticalArrowDepth} L ${heightLineX + verticalArrowHalfWidth} ${productBottom - verticalArrowDepth} Z`}
          fill={dimensionColor}
          data-part="frame-height-arrow-bottom"
        />
        <text
          x={heightLabelX}
          y={heightLabelY}
          textAnchor="start"
          dominantBaseline="middle"
          {...labelProps}
          data-part="frame-height-label"
        >
          H. {formatDimension(displayHeight)}&quot;
        </text>
      </g>
    </g>
  );
}

type ResolvedSeries600MixedPiece = {
  index: number;
  kind: Series600MixedPieceKind;
  width: number;
  height: number;
  logicalLeft: number;
  logicalRight: number;
  drawLeft: number;
  drawWidth: number;
  mirrorSidelite: boolean;
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  structureId?: PieceDiagramSeries600XXStructureId;
};

type ResolvedSeries600MixedLayout = {
  configuration: PieceDiagramSeries600MixedConfiguration;
  pieces: readonly ResolvedSeries600MixedPiece[];
  logicalBoundaries: readonly number[];
  jointCenters: readonly number[];
  totalWidth: number;
  commonHeight: number;
};

function hasOwnProperty(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function resolveSeries600MixedLayout(
  configuration: PieceDiagramSeries600MixedConfiguration,
  inputPieces: readonly PieceDiagramSeries600MixedPiece[],
): ResolvedSeries600MixedLayout {
  if (!hasOwnProperty(SERIES_600_MIXED_PATTERN, configuration)) {
    throw new Error(
      `Unsupported ECO Series 600 mixed configuration: ${String(configuration)}`,
    );
  }

  if (!Array.isArray(inputPieces)) {
    throw new Error("ECO Series 600 mixed assembly requires a pieces array");
  }

  const expectedKinds = SERIES_600_MIXED_PATTERN[configuration];
  if (inputPieces.length !== expectedKinds.length) {
    throw new Error(
      `ECO Series 600 ${configuration} requires ${expectedKinds.join(" + ")}`,
    );
  }

  const mainPieceIndex = expectedKinds.findIndex((kind) => kind !== "O");
  const parsedPieces = inputPieces.map((piece, index) => {
    if (!piece || typeof piece !== "object") {
      throw new Error(
        `ECO Series 600 ${configuration} piece ${index + 1} is missing`,
      );
    }

    const expectedKind = expectedKinds[index];
    if (piece.kind !== expectedKind) {
      throw new Error(
        `ECO Series 600 ${configuration} piece ${index + 1} must be ${expectedKind}`,
      );
    }

    const width = toPositiveNumber(piece.width);
    const height = toPositiveNumber(piece.height);
    if (width === null || height === null) {
      throw new Error(
        `ECO Series 600 ${configuration} piece ${index + 1} requires positive width and height`,
      );
    }

    if (piece.kind === "O") {
      for (const forbidden of [
        "exteriorHingeSide",
        "activeLeaf",
        "boreCount",
        "series600XXStructureId",
      ] as const) {
        if (hasOwnProperty(piece, forbidden)) {
          throw new Error(
            `ECO Series 600 O piece does not accept ${forbidden}`,
          );
        }
      }

      return {
        index,
        kind: piece.kind,
        width,
        height,
        mirrorSidelite: index > mainPieceIndex,
      };
    }

    if (piece.kind === "X") {
      if (
        piece.exteriorHingeSide !== "left" &&
        piece.exteriorHingeSide !== "right"
      ) {
        throw new Error(
          `ECO Series 600 ${configuration} X requires exteriorHingeSide`,
        );
      }
      for (const forbidden of [
        "activeLeaf",
        "boreCount",
        "series600XXStructureId",
      ] as const) {
        if (hasOwnProperty(piece, forbidden)) {
          throw new Error(
            `ECO Series 600 X piece does not accept ${forbidden}`,
          );
        }
      }

      return {
        index,
        kind: piece.kind,
        width,
        height,
        mirrorSidelite: false,
        exteriorHingeSide: piece.exteriorHingeSide,
      };
    }

    if (hasOwnProperty(piece, "exteriorHingeSide")) {
      throw new Error(
        "ECO Series 600 XX piece does not accept exteriorHingeSide",
      );
    }

    const hasActiveLeaf = piece.activeLeaf !== undefined;
    const hasBoreCount = piece.boreCount !== undefined;
    if (hasActiveLeaf !== hasBoreCount) {
      throw new Error(
        "ECO Series 600 XX requires activeLeaf and boreCount as one complete identity",
      );
    }
    if (
      hasActiveLeaf &&
      piece.activeLeaf !== "left" &&
      piece.activeLeaf !== "right"
    ) {
      throw new Error(
        `Unsupported ECO Series 600 XX activeLeaf: ${String(piece.activeLeaf)}`,
      );
    }
    if (hasBoreCount && piece.boreCount !== 2 && piece.boreCount !== 3) {
      throw new Error(
        `Unsupported ECO Series 600 XX boreCount: ${String(piece.boreCount)}`,
      );
    }

    return {
      index,
      kind: piece.kind,
      width,
      height,
      mirrorSidelite: false,
      structureId: resolveSeries600XXStructureId(
        piece.series600XXStructureId,
        piece.activeLeaf,
        piece.boreCount,
      ),
    };
  });

  const commonHeight = parsedPieces[0]?.height;
  if (
    commonHeight === undefined ||
    parsedPieces.some((piece) => piece.height !== commonHeight)
  ) {
    throw new Error(
      `ECO Series 600 ${configuration} requires exactly equal piece heights`,
    );
  }

  const logicalBoundaries = [0];
  for (const piece of parsedPieces) {
    logicalBoundaries.push(logicalBoundaries.at(-1)! + piece.width);
  }

  const pieces = parsedPieces.map((piece, index) => {
    const logicalLeft = logicalBoundaries[index];
    const logicalRight = logicalBoundaries[index + 1];
    const leftExtension =
      index > 0 ? SERIES_600_MIXED_HALF_OVERLAP_INCHES : 0;
    const rightExtension =
      index < parsedPieces.length - 1
        ? SERIES_600_MIXED_HALF_OVERLAP_INCHES
        : 0;

    return {
      ...piece,
      logicalLeft,
      logicalRight,
      drawLeft: logicalLeft - leftExtension,
      drawWidth:
        logicalRight - logicalLeft + leftExtension + rightExtension,
    };
  });

  return {
    configuration,
    pieces,
    logicalBoundaries,
    jointCenters: logicalBoundaries.slice(1, -1),
    totalWidth: logicalBoundaries.at(-1)!,
    commonHeight,
  };
}

function resolveSeries600MixedMovementPanels(
  layout: ResolvedSeries600MixedLayout,
): readonly Serie600MovementPanel[] {
  const panels: Serie600MovementPanel[] = [];

  for (const piece of layout.pieces) {
    if (piece.kind === "O") {
      const sourceX = piece.mirrorSidelite ? 64 : 63;
      panels.push({
        kind: "O",
        role: "FIXED",
        glass: {
          x: piece.drawLeft + (sourceX / 370) * piece.drawWidth,
          y: (97 / 1648) * layout.commonHeight,
          width: (243 / 370) * piece.drawWidth,
          height: (1444 / 1648) * layout.commonHeight,
        },
      });
      continue;
    }

    if (piece.kind === "X") {
      const hingeSide = piece.exteriorHingeSide!;
      const sourceX = hingeSide === "left" ? 109 : 104;
      panels.push({
        kind: "X",
        hingeSide,
        role: "OPERABLE",
        glass: {
          x: piece.drawLeft + (sourceX / 586) * piece.drawWidth,
          y: (102 / 1466) * layout.commonHeight,
          width: (373 / 586) * piece.drawWidth,
          height: (1265 / 1466) * layout.commonHeight,
        },
      });
      continue;
    }

    const structure = SERIES_600_XX_STRUCTURE_ASSET[piece.structureId!];
    for (const [hingeSide, sourceGlass] of [
      ["left", structure.leftGlass],
      ["right", structure.rightGlass],
    ] as const) {
      const isActive = structure.activeLeaf === hingeSide;
      panels.push({
        kind: "X",
        hingeSide,
        role: isActive ? "ACTIVE" : "SECONDARY",
        showArrow: isActive,
        glass: {
          x: piece.drawLeft + (sourceGlass.x / 944) * piece.drawWidth,
          y: (sourceGlass.y / 1120) * layout.commonHeight,
          width: (sourceGlass.width / 944) * piece.drawWidth,
          height: (sourceGlass.height / 1120) * layout.commonHeight,
        },
      });
    }
  }

  return panels;
}

function resolveSeries600MixedGlassOptionId({
  glassTintHex,
  tintedPaneCount,
  hasCoating,
  lowEProfile,
  glassProfile,
  interlayerProfile,
  glassOptionId,
}: Pick<
  PieceDiagramSeries600MixedAssemblyProps,
  | "glassTintHex"
  | "tintedPaneCount"
  | "hasCoating"
  | "lowEProfile"
  | "glassProfile"
  | "interlayerProfile"
  | "glassOptionId"
>): PieceDiagramGlassOptionId {
  if (lowEProfile === "SB70" && hasCoating === false) {
    throw new Error(
      "Conflicting ECO Series 600 Low-E identities: lowEProfile=SB70 with hasCoating=false",
    );
  }

  const resolvedLowEProfile: PieceDiagramLowEProfile | null =
    lowEProfile ?? (hasCoating === true ? "SB70" : null);
  const glassTone = resolveGlassFill(glassTintHex);
  const isClearTone = glassTone.toUpperCase() === DEFAULT_GLASS_FILL;
  const resolvedTintedPaneCount: PieceDiagramTintedPaneCount = isClearTone
    ? 0
    : tintedPaneCount === 2
      ? 2
      : 1;
  const resolvedGlassProfile = resolveSeries600GlassProfile(
    glassProfile,
    glassTone,
    resolvedTintedPaneCount,
    resolvedLowEProfile,
  );
  const resolvedInterlayerProfile =
    interlayerProfile ?? DEFAULT_SERIES_600_INTERLAYER;

  return resolveSeries600GlassOptionId(
    glassOptionId,
    resolvedGlassProfile,
    resolvedInterlayerProfile,
    glassProfile !== undefined ||
      glassTintHex != null ||
      tintedPaneCount !== undefined ||
      hasCoating !== undefined ||
      lowEProfile !== undefined,
    interlayerProfile !== undefined,
  );
}

function Series600MixedDimensionLayer({
  layout,
  variant,
}: {
  layout: ResolvedSeries600MixedLayout;
  variant: PieceDiagramVariant;
}) {
  const { pieces, logicalBoundaries, totalWidth, commonHeight } = layout;
  const reportScale = variant === "report" ? 0.94 : 1;
  const lineWidth = commonHeight * (3 / 1120) * reportScale;
  const segmentFontSize = commonHeight * (26 / 1120) * reportScale;
  const totalFontSize = commonHeight * (29 / 1120) * reportScale;
  const heightFontSize = commonHeight * (27 / 1120) * reportScale;
  const topLineY = -commonHeight * (40 / 1120);
  const topLabelY = -commonHeight * (58 / 1120);
  const topTickStartY = topLineY - commonHeight * (10 / 1120);
  const topTickEndY = -commonHeight * (9 / 1120);
  const totalLineY = commonHeight + commonHeight * (64 / 1120);
  const totalLabelY = totalLineY + commonHeight * (52 / 1120);
  const totalExtensionStartY = commonHeight + commonHeight * (20 / 1120);
  const totalExtensionEndY = totalLineY + commonHeight * (18 / 1120);
  const heightLineX = totalWidth + commonHeight * (55 / 1120);
  const heightExtensionEndX = heightLineX + commonHeight * (16 / 1120);
  const heightLabelX = heightLineX + commonHeight * (34 / 1120);
  const horizontalArrowDepth = commonHeight * (12 / 1120);
  const horizontalArrowHalfHeight = commonHeight * (7 / 1120);
  const verticalArrowDepth = commonHeight * (12 / 1120);
  const verticalArrowHalfWidth = commonHeight * (7 / 1120);
  const fontFamily =
    '"Nimbus Sans", Arial, ui-sans-serif, system-ui, sans-serif';

  return (
    <g
      data-part="series600-mixed-dimensions"
      data-dimension-color={SERIES_600_MIXED_DIMENSION_COLOR}
      data-dimension-total-width={formatDimension(totalWidth)}
      data-dimension-total-height={formatDimension(commonHeight)}
      pointerEvents="none"
      aria-hidden="true"
    >
      <g data-part="piece-width-dimensions">
        {pieces.map((piece) => (
          <g
            key={`piece-width-${piece.index}`}
            data-part="piece-width-dimension"
            data-piece-index={piece.index}
            data-piece-kind={piece.kind}
            data-piece-width={formatDimension(piece.width)}
          >
            <line
              x1={piece.logicalLeft}
              y1={topLineY}
              x2={piece.logicalRight}
              y2={topLineY}
              stroke={SERIES_600_MIXED_DIMENSION_COLOR}
              strokeWidth={lineWidth}
            />
            <text
              x={(piece.logicalLeft + piece.logicalRight) / 2}
              y={topLabelY}
              textAnchor="middle"
              fill={SERIES_600_MIXED_DIMENSION_COLOR}
              fontFamily={fontFamily}
              fontSize={segmentFontSize}
              fontWeight={800}
            >
              W. {formatDimension(piece.width)}&quot;
            </text>
          </g>
        ))}

        {logicalBoundaries.map((boundary, index) => (
          <line
            key={`piece-boundary-${index}`}
            x1={boundary}
            y1={topTickStartY}
            x2={boundary}
            y2={topTickEndY}
            stroke={SERIES_600_MIXED_DIMENSION_COLOR}
            strokeWidth={lineWidth}
            data-part="piece-width-boundary"
            data-boundary-index={index}
          />
        ))}
      </g>

      <g data-part="total-width-dimension">
        <line
          x1={0}
          y1={totalExtensionStartY}
          x2={0}
          y2={totalExtensionEndY}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <line
          x1={totalWidth}
          y1={totalExtensionStartY}
          x2={totalWidth}
          y2={totalExtensionEndY}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <line
          x1={0}
          y1={totalLineY}
          x2={totalWidth}
          y2={totalLineY}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <path
          d={`M 0 ${totalLineY} L ${horizontalArrowDepth} ${totalLineY - horizontalArrowHalfHeight} L ${horizontalArrowDepth} ${totalLineY + horizontalArrowHalfHeight} Z`}
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
        />
        <path
          d={`M ${totalWidth} ${totalLineY} L ${totalWidth - horizontalArrowDepth} ${totalLineY - horizontalArrowHalfHeight} L ${totalWidth - horizontalArrowDepth} ${totalLineY + horizontalArrowHalfHeight} Z`}
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
        />
        <text
          x={totalWidth / 2}
          y={totalLabelY}
          textAnchor="middle"
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
          fontFamily={fontFamily}
          fontSize={totalFontSize}
          fontWeight={800}
        >
          W. {formatDimension(totalWidth)}&quot;
        </text>
      </g>

      <g data-part="total-height-dimension">
        <line
          x1={totalWidth + commonHeight * (20 / 1120)}
          y1={0}
          x2={heightExtensionEndX}
          y2={0}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <line
          x1={totalWidth + commonHeight * (20 / 1120)}
          y1={commonHeight}
          x2={heightExtensionEndX}
          y2={commonHeight}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <line
          x1={heightLineX}
          y1={0}
          x2={heightLineX}
          y2={commonHeight}
          stroke={SERIES_600_MIXED_DIMENSION_COLOR}
          strokeWidth={lineWidth}
        />
        <path
          d={`M ${heightLineX} 0 L ${heightLineX - verticalArrowHalfWidth} ${verticalArrowDepth} L ${heightLineX + verticalArrowHalfWidth} ${verticalArrowDepth} Z`}
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
        />
        <path
          d={`M ${heightLineX} ${commonHeight} L ${heightLineX - verticalArrowHalfWidth} ${commonHeight - verticalArrowDepth} L ${heightLineX + verticalArrowHalfWidth} ${commonHeight - verticalArrowDepth} Z`}
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
        />
        <text
          x={heightLabelX}
          y={commonHeight / 2}
          textAnchor="start"
          dominantBaseline="middle"
          fill={SERIES_600_MIXED_DIMENSION_COLOR}
          fontFamily={fontFamily}
          fontSize={heightFontSize}
          fontWeight={800}
        >
          H. {formatDimension(commonHeight)}&quot;
        </text>
      </g>
    </g>
  );
}

function Series600MixedPieceDiagram({
  piece,
  commonHeight,
  frameColor,
  glassOptionId,
  xClipPathId,
}: {
  piece: ResolvedSeries600MixedPiece;
  commonHeight: number;
  frameColor: string;
  glassOptionId: PieceDiagramGlassOptionId;
  xClipPathId?: string;
}) {
  const wrapperData = {
    "data-part": "mixed-assembly-piece",
    "data-piece-index": piece.index,
    "data-piece-kind": piece.kind,
    "data-piece-width": formatDimension(piece.width),
    "data-piece-height": formatDimension(piece.height),
    "data-logical-left": piece.logicalLeft,
    "data-logical-right": piece.logicalRight,
    "data-draw-left": piece.drawLeft,
    "data-draw-width": piece.drawWidth,
  };

  if (piece.kind === "X") {
    const verticalScale =
      SERIES_600_C025_STRUCTURAL_SOURCE.frameHeight /
      SERIES_600_MIXED_X_PHYSICAL_FRAME_HEIGHT;

    return (
      <g transform={`translate(${piece.drawLeft} 0)`} {...wrapperData}>
        <g
          clipPath={`url(#${xClipPathId})`}
          data-part="mixed-x-physical-frame-clip"
          data-source-frame-height={
            SERIES_600_MIXED_X_PHYSICAL_FRAME_HEIGHT
          }
          data-removed-shadow-rows={
            SERIES_600_C025_STRUCTURAL_SOURCE.frameHeight -
            SERIES_600_MIXED_X_PHYSICAL_FRAME_HEIGHT
          }
        >
          <g transform={`scale(1 ${verticalScale})`}>
            <Series600XApprovedPhotoDiagram
              width={piece.drawWidth}
              height={commonHeight}
              hingeSide={piece.exteriorHingeSide!}
              frameColor={frameColor}
              glassOptionId={glassOptionId}
            />
          </g>
        </g>
      </g>
    );
  }

  if (piece.kind === "XX") {
    return (
      <g transform={`translate(${piece.drawLeft} 0)`} {...wrapperData}>
        <Series600XXApprovedPhotoDiagram
          width={piece.drawWidth}
          height={commonHeight}
          structureId={piece.structureId!}
          frameColor={frameColor}
          glassOptionId={glassOptionId}
        />
      </g>
    );
  }

  const mirrorTransform = piece.mirrorSidelite
    ? `translate(${piece.drawWidth} 0) scale(-1 1)`
    : undefined;
  return (
    <g
      transform={`translate(${piece.drawLeft} 0)`}
      {...wrapperData}
      data-sidelite-side={piece.mirrorSidelite ? "right" : "left"}
    >
      <g transform={mirrorTransform}>
        <Series600OApprovedPhotoDiagram
          width={piece.drawWidth}
          height={commonHeight}
          frameColor={frameColor}
          glassOptionId={glassOptionId}
        />
      </g>
    </g>
  );
}

export function Series600MixedAssemblyDiagram({
  configuration,
  pieces,
  dimensionMode = "STANDARD",
  frameColorHex,
  glassTintHex,
  tintedPaneCount,
  hasCoating,
  lowEProfile,
  glassProfile,
  interlayerProfile,
  glassOptionId,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  showDimensions,
  idNamespace,
  variant = "editor",
  className,
}: PieceDiagramSeries600MixedAssemblyProps) {
  const normalizedMovementIndicatorColor = normalizeMovementIndicatorColor(
    movementIndicatorColor,
  );
  const reactId = React.useId();
  const idToken = `${toSvgIdToken(idNamespace?.trim() || "series600-mixed")}-${toSvgIdToken(reactId)}`;
  const layout = resolveSeries600MixedLayout(configuration, pieces);
  const resolvedGlassOptionId = resolveSeries600MixedGlassOptionId({
    glassTintHex,
    tintedPaneCount,
    hasCoating,
    lowEProfile,
    glassProfile,
    interlayerProfile,
    glassOptionId,
  });
  const frameColor = resolveFrameFill(frameColorHex);
  const movementPanels = resolveSeries600MixedMovementPanels(layout);
  const shouldShowDimensions = showDimensions ?? true;
  const topMargin = shouldShowDimensions ? layout.commonHeight * 0.09 : 0;
  const bottomMargin = shouldShowDimensions ? layout.commonHeight * 0.16 : 0;
  const leftMargin = shouldShowDimensions ? layout.commonHeight * 0.02 : 0;
  const rightMargin = shouldShowDimensions ? layout.commonHeight * 0.3 : 0;
  const viewBoxX = -leftMargin;
  const viewBoxY = -topMargin;
  const viewBoxWidth = layout.totalWidth + leftMargin + rightMargin;
  const viewBoxHeight = layout.commonHeight + topMargin + bottomMargin;
  const xClipPathId = (index: number) => `${idToken}-x-${index}-clip`;
  const renderOrder = [
    ...layout.pieces.filter((piece) => piece.kind !== "O"),
    ...layout.pieces.filter((piece) => piece.kind === "O"),
  ];
  const containerClasses =
    variant === "report"
      ? "flex h-full w-full items-center justify-center"
      : "flex h-full w-full flex-col items-center justify-center rounded-md border p-2";

  return (
    <div
      className={[containerClasses, className ?? ""].join(" ")}
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        backgroundColor: "transparent",
        border: variant === "report" ? undefined : "1px solid #E5E7EB",
        borderRadius: variant === "report" ? undefined : 6,
        padding: variant === "report" ? undefined : 8,
      }}
      data-dimension-mode={dimensionMode}
      data-release="C057_FINAL"
      data-approved-visual-source="C056_REVIEW_APPROVED_BY_USER"
      data-visual-template="ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR"
      data-configuration={configuration}
      data-total-width={formatDimension(layout.totalWidth)}
      data-common-height={formatDimension(layout.commonHeight)}
      data-piece-widths={layout.pieces
        .map((piece) => formatDimension(piece.width))
        .join(",")}
      data-joint-centers={layout.jointCenters
        .map((center) => formatDimension(center))
        .join(",")}
      data-joint-overlap-inches={SERIES_600_MIXED_OVERLAP_INCHES}
      data-measurement-boundary="JOINT_CENTER"
      data-piece-render-order="DOOR_FIRST__SIDELITE_LAST"
      data-resolved-glass-optics="APPROVED_C025_C029_C031_SHARED_OPTION"
      data-glass-option-id={resolvedGlassOptionId}
      data-view-side="exterior"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        role="img"
        aria-label={`Eco Series 600 ${configuration} mixed assembly, exterior view, total width ${formatDimension(layout.totalWidth)} inches by common height ${formatDimension(layout.commonHeight)} inches`}
        style={
          {
            backgroundColor: "transparent",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          } as React.CSSProperties
        }
      >
        <defs>
          {layout.pieces
            .filter((piece) => piece.kind === "X")
            .map((piece) => (
              <clipPath
                id={xClipPathId(piece.index)}
                key={xClipPathId(piece.index)}
                clipPathUnits="userSpaceOnUse"
              >
                <rect
                  x={0}
                  y={0}
                  width={piece.drawWidth}
                  height={layout.commonHeight}
                />
              </clipPath>
            ))}
        </defs>

        {renderOrder.map((piece) => (
          <Series600MixedPieceDiagram
            key={`mixed-piece-${piece.index}`}
            piece={piece}
            commonHeight={layout.commonHeight}
            frameColor={frameColor}
            glassOptionId={resolvedGlassOptionId}
            xClipPathId={
              piece.kind === "X" ? xClipPathId(piece.index) : undefined
            }
          />
        ))}

        <Serie600MovementIndicators
          panels={movementPanels}
          movementIndicatorColor={normalizedMovementIndicatorColor}
          idNamespace={`${idToken}-movement`}
        />

        {shouldShowDimensions && (
          <Series600MixedDimensionLayer layout={layout} variant={variant} />
        )}
      </svg>
    </div>
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
  tintedPaneCount,
  hasCoating,
  lowEProfile,
  glassProfile,
  interlayerProfile,
  glassOptionId,
  movementIndicatorColor = DEFAULT_MOVEMENT_INDICATOR_COLOR,
  visualTemplate,
  exteriorHingeSide,
  activeLeaf,
  boreCount,
  series600XXStructureId,
  series600MixedPieces,
  showDimensions,
  idNamespace,
  variant = "editor",
  className,
}: PieceDiagramProps) {
  const normalizedMovementIndicatorColor =
    visualTemplate?.startsWith("ECO_SERIES_600_") === true
      ? normalizeMovementIndicatorColor(movementIndicatorColor)
      : movementIndicatorColor;
  const reactId = React.useId();
  const idToken = `${toSvgIdToken(idNamespace?.trim() || "piece")}-${toSvgIdToken(reactId)}`;

  const isSeries600MixedExterior =
    visualTemplate === "ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR";
  if (isSeries600MixedExterior) {
    if (
      piece !== undefined ||
      exteriorHingeSide !== undefined ||
      activeLeaf !== undefined ||
      boreCount !== undefined ||
      series600XXStructureId !== undefined
    ) {
      throw new Error(
        "ECO Series 600 mixed assemblies require all dimensions and door identities inside series600MixedPieces",
      );
    }

    return (
      <Series600MixedAssemblyDiagram
        configuration={(configuration ?? "").trim().toUpperCase() as PieceDiagramSeries600MixedConfiguration}
        pieces={series600MixedPieces ?? []}
        dimensionMode={dimensionMode}
        frameColorHex={frameColorHex}
        glassTintHex={glassTintHex}
        tintedPaneCount={tintedPaneCount}
        hasCoating={hasCoating}
        lowEProfile={lowEProfile}
        glassProfile={glassProfile}
        interlayerProfile={interlayerProfile}
        glassOptionId={glassOptionId}
        movementIndicatorColor={normalizedMovementIndicatorColor}
        showDimensions={showDimensions}
        idNamespace={`${idToken}-mixed`}
        variant={variant}
        className={className}
      />
    );
  }

  if (series600MixedPieces !== undefined) {
    throw new Error(
      "series600MixedPieces requires visualTemplate=ECO_SERIES_600_MIXED_ASSEMBLY_EXTERIOR",
    );
  }

  const glassGradientId = `${idToken}-technical-glass`;
  const series600FrameGradientId = `${idToken}-series600-frame`;
  const series600FrameVerticalGradientId = `${idToken}-series600-frame-vertical`;
  const series600FrameHorizontalGradientId = `${idToken}-series600-frame-horizontal`;
  const series600GlassGradientId = `${idToken}-series600-glass`;
  const series600GlassSheenGradientId = `${idToken}-series600-glass-sheen`;
  const series600GlassLensingLeftGradientId = `${idToken}-series600-glass-lensing-left`;
  const series600GlassLensingRightGradientId = `${idToken}-series600-glass-lensing-right`;
  const series600GlassLensingTopGradientId = `${idToken}-series600-glass-lensing-top`;
  const series600GlassLensingBottomGradientId = `${idToken}-series600-glass-lensing-bottom`;
  const series600GlassCounterHighlightId = `${idToken}-series600-glass-counter-highlight`;
  const series600HardwareGradientId = `${idToken}-series600-hardware`;
  const series600HingeCapGradientId = `${idToken}-series600-hinge-cap`;
  const series600PrepHoleRimGradientId = `${idToken}-series600-prep-hole-rim`;
  const series600PrepHoleGradientId = `${idToken}-series600-prep-hole`;
  const series600ContactShadowGradientId = `${idToken}-series600-contact-shadow`;
  const series600ProductDepthFilterId = `${idToken}-series600-product-depth`;
  const series600ProfileDepthFilterId = `${idToken}-series600-profile-depth`;
  const series600HingeDepthFilterId = `${idToken}-series600-hinge-depth`;
  const series600SpecularSoftFilterId = `${idToken}-series600-specular-soft`;
  const series600DimensionArrowId = `${idToken}-series600-dimension-arrow`;
  const series600RuntimeGlassFilterId = `${idToken}-series600-runtime-glass-filter`;

  const isSeries600XExterior = visualTemplate === "ECO_SERIES_600_X_EXTERIOR";
  const isSeries600XXExterior =
    visualTemplate === "ECO_SERIES_600_XX_EXTERIOR";
  const isSeries600OExterior =
    visualTemplate === "ECO_SERIES_600_O_SIDELITE_EXTERIOR";
  const isSeries600Exterior =
    isSeries600XExterior || isSeries600XXExterior || isSeries600OExterior;
  if (
    isSeries600XExterior &&
    (configuration ?? "").trim().toUpperCase() !== "X"
  ) {
    throw new Error("ECO_SERIES_600_X_EXTERIOR requires configuration=X");
  }
  if (
    isSeries600XExterior &&
    exteriorHingeSide !== "left" &&
    exteriorHingeSide !== "right"
  ) {
    throw new Error(
      "ECO Series 600 X requires explicit exteriorHingeSide=left or right",
    );
  }
  if (
    isSeries600XExterior &&
    (activeLeaf !== undefined ||
      boreCount !== undefined ||
      series600XXStructureId !== undefined)
  ) {
    throw new Error(
      "ECO Series 600 X does not accept active-leaf, bore, or XX structure props",
    );
  }
  if (
    isSeries600XXExterior &&
    (configuration ?? "").trim().toUpperCase() !== "XX"
  ) {
    throw new Error(
      "ECO_SERIES_600_XX_EXTERIOR requires configuration=XX",
    );
  }
  if (isSeries600XXExterior && exteriorHingeSide !== undefined) {
    throw new Error(
      "ECO Series 600 XX uses activeLeaf and does not accept exteriorHingeSide",
    );
  }
  if (
    isSeries600OExterior &&
    (configuration ?? "").trim().toUpperCase() !== "O"
  ) {
    throw new Error(
      "ECO_SERIES_600_O_SIDELITE_EXTERIOR requires configuration=O",
    );
  }
  if (
    isSeries600OExterior &&
    (exteriorHingeSide !== undefined ||
      activeLeaf !== undefined ||
      boreCount !== undefined ||
      series600XXStructureId !== undefined)
  ) {
    throw new Error(
      "ECO Series 600 O sidelite does not accept door handing, active-leaf, or bore props",
    );
  }
  if (
    isSeries600OExterior &&
    (toPositiveNumber(piece?.width) === null ||
      toPositiveNumber(piece?.height) === null)
  ) {
    throw new Error(
      "ECO Series 600 O sidelite requires explicit piece.width and piece.height",
    );
  }
  const resolvedSeries600XXStructureId = isSeries600XXExterior
    ? resolveSeries600XXStructureId(
        series600XXStructureId,
        activeLeaf,
        boreCount,
      )
    : undefined;
  const resolvedInterlayerProfile =
    interlayerProfile ?? DEFAULT_SERIES_600_INTERLAYER;
  if (lowEProfile === "SB70" && hasCoating === false) {
    throw new Error(
      "Conflicting ECO Series 600 Low-E identities: lowEProfile=SB70 with hasCoating=false",
    );
  }
  const resolvedLowEProfile: PieceDiagramLowEProfile | null =
    lowEProfile ?? (hasCoating === true ? "SB70" : null);
  const coatingEnabled = resolvedLowEProfile !== null;

  // Shared material inputs: this is the same resolution path used by SH/HR.
  // The template adds only the D008 optical layers; it never selects a color.
  const glassTone = resolveGlassFill(glassTintHex);
  // Series 600 uses the explicit interlayer identity above. The legacy
  // `piece.privacy` boolean must never select, tint or stack a glass asset.
  const hasPrivacy = piece?.privacy === true && !isSeries600Exterior;
  const isClearTone = glassTone.toUpperCase() === "#F7FBFF";
  const resolvedTintedPaneCount: PieceDiagramTintedPaneCount = isClearTone
    ? 0
    : tintedPaneCount === 2
      ? 2
      : 1;
  const resolvedSeries600GlassProfile = resolveSeries600GlassProfile(
    glassProfile,
    glassTone,
    resolvedTintedPaneCount,
    resolvedLowEProfile,
  );
  const resolvedSeries600GlassOptionId = resolveSeries600GlassOptionId(
    glassOptionId,
    resolvedSeries600GlassProfile,
    resolvedInterlayerProfile,
    glassProfile !== undefined ||
      glassTintHex != null ||
      tintedPaneCount !== undefined ||
      hasCoating !== undefined ||
      lowEProfile !== undefined,
    interlayerProfile !== undefined,
  );
  const resolvedOptionInterlayer = resolvedSeries600GlassOptionId.split(
    "__",
  )[1] as PieceDiagramInterlayerProfile;
  if (
    isSeries600Exterior &&
    piece?.privacy === true &&
    resolvedOptionInterlayer !== "PVB_WHITE_090_TRANSLUCENT"
  ) {
    throw new Error(
      "ECO Series 600 privacy=true conflicts with a non-white interlayer; select PVB_WHITE_090_TRANSLUCENT explicitly",
    );
  }
  const useD008ReferenceCalibration =
    isSeries600Exterior && isClearTone && !coatingEnabled && !hasPrivacy;

  // Clear necesita una ligera base azul para distinguirse del fondo blanco.
  const visibleGlassTone = isClearTone
    ? useD008ReferenceCalibration
      ? "#EEEFF0"
      : mixHexColors(glassTone, "#9FC3D8", 0.22)
    : glassTone;

  const privacyGlassTone = hasPrivacy
    ? mixHexColors(visibleGlassTone, "#1F2937", 0.18)
    : visibleGlassTone;

  // Low-E enfría ligeramente el cristal, sin crear una franja.
  const renderedGlassTone = coatingEnabled
    ? mixHexColors(privacyGlassTone, "#BFEAFF", hasPrivacy ? 0.06 : 0.1)
    : privacyGlassTone;

  const highlightWeight = hasPrivacy
    ? coatingEnabled
      ? 0.16
      : 0.1
    : coatingEnabled
      ? 0.3
      : isClearTone
        ? 0.26
        : 0.16;

  const glassHighlightTone = mixHexColors(
    renderedGlassTone,
    coatingEnabled ? "#E6FAFF" : "#FFFFFF",
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
  const shouldShowDimensions = showDimensions ?? true;

  const frameIsDark = isDarkHex(frameFill);
  const series600FrameFaceTone = mixHexColors(
    frameFill,
    frameIsDark ? "#C9BEB5" : "#D8D7D8",
    frameIsDark ? 0.08 : 0.2,
  );

  const series600FrameHighlightTone = mixHexColors(
    frameFill,
    "#FFFFFF",
    frameIsDark ? 0.3 : 0.78,
  );

  const series600FrameMidTone = mixHexColors(
    series600FrameFaceTone,
    frameIsDark ? "#211812" : "#9DA5A1",
    frameIsDark ? 0.2 : 0.08,
  );

  const series600FrameShadowTone = mixHexColors(
    frameFill,
    "#11151A",
    frameIsDark ? 0.48 : 0.18,
  );

  const series600FrameOutlineTone = mixHexColors(
    frameFill,
    "#070A0D",
    frameIsDark ? 0.62 : 0.34,
  );

  const series600GlassEdgeTone = useD008ReferenceCalibration
    ? "#5F7F80"
    : mixHexColors(
        renderedGlassTone,
        isClearTone ? "#146F75" : "#173E46",
        isClearTone ? 0.5 : 0.38,
      );

  const series600GlassEdgeHighlightTone = useD008ReferenceCalibration
    ? "#D8E8E8"
    : mixHexColors(
        series600GlassEdgeTone,
        "#E9FFFF",
        isClearTone ? 0.58 : 0.36,
      );

  const series600GlassHighlightTone = useD008ReferenceCalibration
    ? "#FAFAFB"
    : mixHexColors(
        renderedGlassTone,
        coatingEnabled ? "#E8FBFF" : "#FFFFFF",
        isClearTone ? 0.68 : 0.34,
      );

  const series600GlassMidTone = useD008ReferenceCalibration
    ? "#ECEDEF"
    : mixHexColors(
        renderedGlassTone,
        isClearTone ? "#BED0D4" : "#A8BAC0",
        isClearTone ? 0.22 : 0.09,
      );

  const series600GlassShadowTone = useD008ReferenceCalibration
    ? "#E2E5E7"
    : mixHexColors(
        renderedGlassTone,
        isClearTone ? "#728B91" : "#40545A",
        isClearTone ? 0.28 : 0.17,
      );

  const series600Materials: Series600XExteriorMaterials = {
    framePaint: `url(#${series600FrameGradientId})`,
    frameVerticalPaint: `url(#${series600FrameVerticalGradientId})`,
    frameHorizontalPaint: `url(#${series600FrameHorizontalGradientId})`,
    frameHighlight: series600FrameHighlightTone,
    frameShadow: series600FrameShadowTone,
    frameOutline: series600FrameOutlineTone,
    glassPaint: `url(#${series600GlassGradientId})`,
    glassSheenPaint: `url(#${series600GlassSheenGradientId})`,
    glassLensingLeftPaint: `url(#${series600GlassLensingLeftGradientId})`,
    glassLensingRightPaint: `url(#${series600GlassLensingRightGradientId})`,
    glassLensingTopPaint: `url(#${series600GlassLensingTopGradientId})`,
    glassLensingBottomPaint: `url(#${series600GlassLensingBottomGradientId})`,
    glassCounterHighlightPaint: `url(#${series600GlassCounterHighlightId})`,
    glassEdge: series600GlassEdgeTone,
    glassEdgeHighlight: series600GlassEdgeHighlightTone,
    glassGasket: frameIsDark ? "#0B0D0E" : "#172928",
    hardwarePaint: `url(#${series600HardwareGradientId})`,
    hingeCapPaint: `url(#${series600HingeCapGradientId})`,
    hardwareOutline: series600FrameOutlineTone,
    prepHoleRimPaint: `url(#${series600PrepHoleRimGradientId})`,
    prepHolePaint: `url(#${series600PrepHoleGradientId})`,
    productShadowPaint: `url(#${series600ContactShadowGradientId})`,
    productDepthFilter: `url(#${series600ProductDepthFilterId})`,
    profileDepthFilter: `url(#${series600ProfileDepthFilterId})`,
    hingeDepthFilter: `url(#${series600HingeDepthFilterId})`,
    specularSoftFilter: `url(#${series600SpecularSoftFilterId})`,
  };

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
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          backgroundColor: "#F3F4F6",
        }}
      >
        <p
          className="text-sm text-gray-500"
          style={{ color: "#6B7280", fontSize: 14 }}
        >
          Enter dimensions
        </p>
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

  const standardOffsetX = (maxDimension - scaledWidth) / 2;
  const standardOffsetY = (maxDimension - scaledHeight) / 2;

  /*
   * X keeps its approved 36 x 80 calibration and XX its approved 72 x 80
   * visual reference. O/SL has no certified nominal size: its approved plate
   * aspect is the neutral reference, so piece.width / piece.height controls
   * the rendered aspect exactly and supplies the W/H dimension labels.
   */
  const runtimeSeries600Aspect =
    dimensions.displayWidth /
    (dimensions.displayHeight ?? dimensions.height);
  const activeSeries600Source = isSeries600XXExterior
    ? SERIES_600_XX_C029_SOURCE
    : isSeries600OExterior
      ? SERIES_600_O_C031_STRUCTURAL_SOURCE
    : SERIES_600_C025_STRUCTURAL_SOURCE;
  const approvedPlateAspect =
    activeSeries600Source.frameWidth / activeSeries600Source.frameHeight;
  const referenceSeries600Aspect = isSeries600OExterior
    ? approvedPlateAspect
    : isSeries600XXExterior
      ? 72 / SERIES_600_REFERENCE_HEIGHT
      : SERIES_600_REFERENCE_WIDTH / SERIES_600_REFERENCE_HEIGHT;
  const series600VisualHeight = scaledHeight;
  const series600VisualWidth =
    series600VisualHeight *
    approvedPlateAspect *
    (runtimeSeries600Aspect / referenceSeries600Aspect);
  const series600OffsetX = (maxDimension - series600VisualWidth) / 2;
  const series600OffsetY = (maxDimension - series600VisualHeight) / 2;

  const renderWidth = isSeries600Exterior
    ? series600VisualWidth
    : scaledWidth;
  const renderHeight = isSeries600Exterior
    ? series600VisualHeight
    : scaledHeight;
  const offsetX = isSeries600Exterior ? series600OffsetX : standardOffsetX;
  const offsetY = isSeries600Exterior ? series600OffsetY : standardOffsetY;

  const fontSize = variant === "report" ? 9 : 12;
  const useTightProductView = isSeries600Exterior && !shouldShowDimensions;
  const useSeries600DimensionView =
    isSeries600Exterior && shouldShowDimensions;
  const series600ODimensionLeftMargin = Math.max(
    renderWidth * 0.18,
    renderHeight * 0.05,
  );
  const series600ODimensionRightMargin = Math.max(
    renderWidth * 0.42,
    renderHeight * 0.12,
  );

  const viewBoxX = useTightProductView
    ? isSeries600XXExterior || isSeries600OExterior
      ? offsetX
      : offsetX - renderWidth * (68 / 586)
    : useSeries600DimensionView
      ? isSeries600OExterior
        ? offsetX - series600ODimensionLeftMargin
        : isSeries600XXExterior
        ? offsetX - renderWidth * 0.16
        : offsetX - renderWidth * (100 / 586)
      : -44;
  const viewBoxY = useTightProductView
    ? isSeries600XXExterior || isSeries600OExterior
      ? offsetY
      : offsetY - renderHeight * (40 / 1517)
    : useSeries600DimensionView
      ? isSeries600OExterior
        ? offsetY - renderHeight * (75 / 1517)
        : isSeries600XXExterior
        ? offsetY - renderHeight * 0.09
        : offsetY - renderHeight * (75 / 1517)
      : -32;
  const viewBoxWidth = useTightProductView
    ? isSeries600XXExterior || isSeries600OExterior
      ? renderWidth
      : renderWidth * (690 / 586)
    : useSeries600DimensionView
      ? isSeries600OExterior
        ? renderWidth +
          series600ODimensionLeftMargin +
          series600ODimensionRightMargin
        : isSeries600XXExterior
        ? renderWidth * 1.32
        : renderWidth * (919 / 586)
      : maxDimension + 88;
  const viewBoxHeight = useTightProductView
    ? isSeries600XXExterior || isSeries600OExterior
      ? renderHeight
      : renderHeight * (1569 / 1517)
    : useSeries600DimensionView
      ? isSeries600OExterior
        ? renderHeight * (1712 / 1517)
        : isSeries600XXExterior
        ? renderHeight * 1.18
        : renderHeight * (1712 / 1517)
      : maxDimension + 64;

  const containerClasses =
    variant === "report"
      ? "flex h-full w-full items-center justify-center"
      : "flex h-full w-full flex-col items-center justify-center rounded-md border p-2";

  return (
    <div
      className={[containerClasses, className ?? ""].join(" ")}
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        backgroundColor: "transparent",
        border: variant === "report" ? undefined : "1px solid #E5E7EB",
        borderRadius: variant === "report" ? undefined : 6,
        padding: variant === "report" ? undefined : 8,
      }}
      data-dimension-mode={dimensionMode}
      data-release="C057_FINAL"
      data-approved-visual-source="C056_REVIEW_APPROVED_BY_USER"
      data-diagram-family={resolvedDiagramFamily}
      data-visual-template={visualTemplate}
      data-resolved-glass-optics={
        isSeries600XExterior
          ? "APPROVED_C025_OPTION_PATCH"
          : isSeries600XXExterior
            ? "APPROVED_C029_TWO_PANE_OPTION_OVERLAY"
            : isSeries600OExterior
              ? "APPROVED_C031_SINGLE_PANE_OPTION_PATCH"
          : undefined
      }
      data-material-source={
        isSeries600Exterior ? "shared-piece-diagram-props" : undefined
      }
      data-view-side="exterior"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        role="img"
        aria-label={
          isSeries600XExterior
            ? `Eco Series 600 X full-lite door, exterior view, frame width ${formatDimension(dimensions.displayWidth)} inches by frame height ${formatDimension(dimensions.displayHeight ?? dimensions.height)} inches`
            : isSeries600XXExterior
              ? `Eco Series 600 XX paired full-lite door, exterior view, frame width ${formatDimension(dimensions.displayWidth)} inches by frame height ${formatDimension(dimensions.displayHeight ?? dimensions.height)} inches`
              : isSeries600OExterior
                ? `Eco Series 600 O fixed sidelite, exterior view, frame width ${formatDimension(dimensions.displayWidth)} inches by frame height ${formatDimension(dimensions.displayHeight ?? dimensions.height)} inches`
            : `${resolvedDiagramFamily} piece diagram, exterior view`
        }
        style={
          {
            "--frame-fill": frameFill,
            "--glass-fill": glassPaint,
            "--glass-opacity": String(glassOpacity),
            backgroundColor: "transparent",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
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

          <linearGradient
            id={series600FrameGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={series600FrameHighlightTone} />
            <stop offset="12%" stopColor={series600FrameFaceTone} />
            <stop offset="68%" stopColor={series600FrameFaceTone} />
            <stop offset="92%" stopColor={series600FrameMidTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </linearGradient>

          <linearGradient
            id={series600FrameVerticalGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={series600FrameOutlineTone} />
            <stop offset="2%" stopColor={series600FrameShadowTone} />
            <stop offset="7%" stopColor={series600FrameHighlightTone} />
            <stop offset="14%" stopColor={series600FrameFaceTone} />
            <stop offset="86%" stopColor={series600FrameFaceTone} />
            <stop offset="96%" stopColor={series600FrameMidTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </linearGradient>

          <linearGradient
            id={series600FrameHorizontalGradientId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={series600FrameHighlightTone} />
            <stop offset="7%" stopColor={series600FrameFaceTone} />
            <stop offset="88%" stopColor={series600FrameFaceTone} />
            <stop offset="97%" stopColor={series600FrameMidTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </linearGradient>

          <linearGradient
            id={series600GlassGradientId}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={scaledWidth}
            y2={scaledHeight}
          >
            <stop offset="0%" stopColor={series600GlassHighlightTone} />
            <stop offset="13%" stopColor={renderedGlassTone} />
            <stop offset="52%" stopColor={series600GlassMidTone} />
            <stop
              offset="76%"
              stopColor={mixHexColors(
                series600GlassMidTone,
                series600GlassShadowTone,
                0.46,
              )}
            />
            <stop offset="100%" stopColor={series600GlassShadowTone} />
          </linearGradient>

          <radialGradient
            id={series600GlassSheenGradientId}
            cx="23%"
            cy="16%"
            r="76%"
            fx="18%"
            fy="12%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.44} />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity={0.18} />
            <stop offset="48%" stopColor="#FFFFFF" stopOpacity={0.035} />
            <stop offset="78%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </radialGradient>

          <linearGradient
            id={series600GlassLensingLeftGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={series600GlassEdgeTone} stopOpacity={0.3} />
            <stop offset="32%" stopColor={series600GlassEdgeHighlightTone} stopOpacity={0.1} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>

          <linearGradient
            id={series600GlassLensingRightGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="68%" stopColor={series600GlassEdgeHighlightTone} stopOpacity={0.06} />
            <stop offset="100%" stopColor={series600GlassEdgeTone} stopOpacity={0.22} />
          </linearGradient>

          <linearGradient
            id={series600GlassLensingTopGradientId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={series600GlassEdgeTone} stopOpacity={0.2} />
            <stop offset="34%" stopColor={series600GlassEdgeHighlightTone} stopOpacity={0.06} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>

          <linearGradient
            id={series600GlassLensingBottomGradientId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="66%" stopColor={series600GlassEdgeHighlightTone} stopOpacity={0.07} />
            <stop offset="100%" stopColor={series600GlassEdgeTone} stopOpacity={0.24} />
          </linearGradient>

          <radialGradient
            id={series600GlassCounterHighlightId}
            cx="87%"
            cy="88%"
            r="55%"
            fx="91%"
            fy="92%"
          >
            <stop
              offset="0%"
              stopColor={coatingEnabled ? "#E4FAFF" : "#FFFFFF"}
              stopOpacity={coatingEnabled ? 0.13 : 0.085}
            />
            <stop offset="44%" stopColor="#FFFFFF" stopOpacity={0.025} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </radialGradient>

          <linearGradient
            id={series600HardwareGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={series600FrameShadowTone} />
            <stop offset="38%" stopColor={series600FrameHighlightTone} />
            <stop offset="66%" stopColor={series600FrameFaceTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </linearGradient>

          <radialGradient
            id={series600HingeCapGradientId}
            cx="34%"
            cy="26%"
            r="78%"
          >
            <stop offset="0%" stopColor={series600FrameHighlightTone} />
            <stop offset="46%" stopColor={series600FrameFaceTone} />
            <stop offset="82%" stopColor={series600FrameMidTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </radialGradient>

          <radialGradient
            id={series600PrepHoleRimGradientId}
            cx="34%"
            cy="28%"
            r="78%"
          >
            <stop offset="0%" stopColor={series600FrameHighlightTone} />
            <stop offset="42%" stopColor={series600FrameFaceTone} />
            <stop offset="76%" stopColor={series600FrameMidTone} />
            <stop offset="100%" stopColor={series600FrameShadowTone} />
          </radialGradient>

          <radialGradient
            id={series600PrepHoleGradientId}
            cx="34%"
            cy="28%"
            r="76%"
          >
            <stop offset="0%" stopColor="#7D8588" />
            <stop offset="24%" stopColor="#343A3D" />
            <stop offset="72%" stopColor="#111416" />
            <stop offset="100%" stopColor="#050607" />
          </radialGradient>

          <radialGradient
            id={series600ContactShadowGradientId}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="#354149" stopOpacity={0.72} />
            <stop offset="58%" stopColor="#56636A" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#718087" stopOpacity={0} />
          </radialGradient>

          <filter
            id={series600ProductDepthFilterId}
            x="-18%"
            y="-12%"
            width="136%"
            height="132%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0.65"
              dy="1.05"
              stdDeviation="1.25"
              floodColor="#243037"
              floodOpacity="0.18"
            />
          </filter>

          <filter
            id={series600ProfileDepthFilterId}
            x="-10%"
            y="-8%"
            width="120%"
            height="118%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0.15"
              dy="0.3"
              stdDeviation="0.3"
              floodColor="#1F2A30"
              floodOpacity="0.24"
            />
          </filter>

          <filter
            id={series600HingeDepthFilterId}
            x="-30%"
            y="-12%"
            width="165%"
            height="126%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0.25"
              dy="0.35"
              stdDeviation="0.32"
              floodColor="#1F2930"
              floodOpacity="0.28"
            />
          </filter>

          <filter
            id={series600SpecularSoftFilterId}
            x="-12%"
            y="-8%"
            width="124%"
            height="118%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="0.55" />
          </filter>

          <marker
            id={series600DimensionArrowId}
            markerUnits="userSpaceOnUse"
            markerWidth="3.6"
            markerHeight="3.6"
            refX="3.28"
            refY="1.8"
            viewBox="0 0 3.6 3.6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L3.6 1.8 L0 3.6 Z" fill="#46515C" />
          </marker>
        </defs>

        {shouldShowDimensions &&
          (isSeries600Exterior && dimensions.displayHeight !== null ? (
            <Series600FrameDimensionLayer
              offsetX={offsetX}
              offsetY={offsetY}
              width={renderWidth}
              height={renderHeight}
              displayWidth={dimensions.displayWidth}
              displayHeight={dimensions.displayHeight}
              variant={variant}
            />
          ) : (
            <>
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
            </>
          ))}

        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {isSeries600XExterior ? (
            <Series600XApprovedPhotoDiagram
              width={renderWidth}
              height={renderHeight}
              hingeSide={exteriorHingeSide ?? "right"}
              frameColor={frameFill}
              glassOptionId={resolvedSeries600GlassOptionId}
              movementIndicatorColor={normalizedMovementIndicatorColor}
              movementIndicatorIdNamespace={`${idToken}-movement-x`}
            />
          ) : isSeries600XXExterior ? (
            <Series600XXApprovedPhotoDiagram
              width={renderWidth}
              height={renderHeight}
              structureId={resolvedSeries600XXStructureId!}
              frameColor={frameFill}
              glassOptionId={resolvedSeries600GlassOptionId}
              movementIndicatorColor={normalizedMovementIndicatorColor}
              movementIndicatorIdNamespace={`${idToken}-movement-xx`}
            />
          ) : isSeries600OExterior ? (
            <Series600OApprovedPhotoDiagram
              width={renderWidth}
              height={renderHeight}
              frameColor={frameFill}
              glassOptionId={resolvedSeries600GlassOptionId}
              movementIndicatorColor={normalizedMovementIndicatorColor}
              movementIndicatorIdNamespace={`${idToken}-movement-o`}
            />
          ) : (
            <>
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
                ![
                  "HORIZONTAL_SLIDER",
                  "SINGLE_HUNG",
                  "LINEAR_MATERIAL",
                ].includes(resolvedDiagramFamily) && (
                  <GenericDiagram
                    width={scaledWidth}
                    height={scaledHeight}
                    variant={variant}
                  />
                )}
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
