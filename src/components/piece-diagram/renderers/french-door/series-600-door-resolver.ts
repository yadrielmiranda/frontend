import type { PieceDiagramData } from "../../legacy-piece-diagram";
import type {
  PieceDiagramActiveLeaf,
  PieceDiagramBoreCount,
  PieceDiagramExteriorHingeSide,
  PieceDiagramSeries600MixedConfiguration,
  PieceDiagramSeries600MixedPiece,
  PieceDiagramVisualTemplate,
} from "./series-600-door-diagram";

type StandaloneConfiguration = "X" | "XX" | "O";

type StandaloneResolution = {
  kind: "STANDALONE";
  configuration: StandaloneConfiguration;
  visualTemplate: PieceDiagramVisualTemplate;
  piece: {
    width: number;
    height: number;
  };
  exteriorHingeSide?: PieceDiagramExteriorHingeSide;
  activeLeaf?: PieceDiagramActiveLeaf;
  boreCount?: PieceDiagramBoreCount;
};

type MixedResolution = {
  kind: "MIXED";
  configuration: PieceDiagramSeries600MixedConfiguration;
  pieces: readonly PieceDiagramSeries600MixedPiece[];
};

export type Series600DoorResolution =
  | StandaloneResolution
  | MixedResolution;

const STANDALONE_CONFIGURATIONS = new Set<StandaloneConfiguration>([
  "X",
  "XX",
  "O",
]);

const MIXED_PATTERNS: Readonly<
  Record<
    PieceDiagramSeries600MixedConfiguration,
    readonly ("O" | "X" | "XX")[]
  >
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

const SHARED_FRENCH_DOOR_SERIES = new Set(["600", "650", "675", "950"]);

function normalizeWords(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeConfiguration(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_\-/]+/g, "");
}

export function usesSharedFrenchDoorVisuals(
  value?: string | null,
): boolean {
  return normalizeWords(value)
    .split(" ")
    .some((part) => SHARED_FRENCH_DOOR_SERIES.has(part));
}

function positiveDimension(value: unknown): number | null {
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

  if (denominator <= 0 || numerator >= denominator) return null;

  const parsed = whole + numerator / denominator;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function activeSide(
  activeOptionName?: string | null,
): PieceDiagramActiveLeaf | null {
  const normalized = normalizeWords(activeOptionName);

  if (normalized.includes("LEFT") && normalized.includes("ACTIVE")) {
    return "left";
  }
  if (normalized.includes("RIGHT") && normalized.includes("ACTIVE")) {
    return "right";
  }

  return null;
}

function xxBoreCount(
  preparationOptionName?: string | null,
): PieceDiagramBoreCount | null {
  const normalized = normalizeWords(preparationOptionName);
  // XX defaults to the standard two-bore preparation while the form finishes
  // resolving its associated option. This avoids dropping to the legacy
  // generic diagram during an Active-option change.
  if (!normalized) return 2;

  if (
    normalized.includes("INACT HANDLE PREP") ||
    normalized.includes("INACT 2P LOCK")
  ) {
    return 3;
  }

  if (
    normalized.includes("INACT 2 FLUSH BOLTS") ||
    normalized.startsWith("4 FLUSH BOLTS ACTIVE HANDLE DEADBOLT PREP")
  ) {
    return 2;
  }

  return null;
}

function resolveDoorIdentity({
  doorKind,
  activeOptionName,
  preparationOptionName,
}: {
  doorKind: "X" | "XX";
  activeOptionName?: string | null;
  preparationOptionName?: string | null;
}):
  | {
      exteriorHingeSide: PieceDiagramExteriorHingeSide;
    }
  | {
      activeLeaf: PieceDiagramActiveLeaf;
      boreCount: PieceDiagramBoreCount;
    }
  | null {
  const active = activeSide(activeOptionName);
  if (!active) return null;

  if (doorKind === "X") {
    return { exteriorHingeSide: active };
  }

  const boreCount = xxBoreCount(preparationOptionName);
  return boreCount ? { activeLeaf: active, boreCount } : null;
}

function standaloneResolution({
  configuration,
  piece,
  activeOptionName,
  preparationOptionName,
}: {
  configuration: StandaloneConfiguration;
  piece?: PieceDiagramData;
  activeOptionName?: string | null;
  preparationOptionName?: string | null;
}): StandaloneResolution | null {
  const width =
    positiveDimension(piece?.width) ?? positiveDimension(piece?.doorWidth);
  const height =
    positiveDimension(piece?.height) ?? positiveDimension(piece?.doorHeight);

  if (width === null || height === null) return null;

  if (configuration === "O") {
    return {
      kind: "STANDALONE",
      configuration,
      visualTemplate: "ECO_SERIES_600_O_SIDELITE_EXTERIOR",
      piece: { width, height },
    };
  }

  const identity = resolveDoorIdentity({
    doorKind: configuration,
    activeOptionName,
    preparationOptionName,
  });
  if (!identity) return null;

  if (configuration === "X" && "exteriorHingeSide" in identity) {
    return {
      kind: "STANDALONE",
      configuration,
      visualTemplate: "ECO_SERIES_600_X_EXTERIOR",
      piece: { width, height },
      exteriorHingeSide: identity.exteriorHingeSide,
    };
  }

  if (configuration === "XX" && "activeLeaf" in identity) {
    return {
      kind: "STANDALONE",
      configuration,
      visualTemplate: "ECO_SERIES_600_XX_EXTERIOR",
      piece: { width, height },
      activeLeaf: identity.activeLeaf,
      boreCount: identity.boreCount,
    };
  }

  return null;
}

function resolveSideliteWidths({
  totalWidth,
  doorWidth,
  leftSideliteCount,
  rightSideliteCount,
  leftWidthValue,
  rightWidthValue,
}: {
  totalWidth: number;
  doorWidth: number;
  leftSideliteCount: number;
  rightSideliteCount: number;
  leftWidthValue: unknown;
  rightWidthValue: unknown;
}): { left: number | null; right: number | null } | null {
  const sideliteCount = leftSideliteCount + rightSideliteCount;
  const remainingWidth = totalWidth - doorWidth;

  if (sideliteCount < 1 || remainingWidth <= 0) return null;

  let left =
    leftSideliteCount > 0 ? positiveDimension(leftWidthValue) : null;
  let right =
    rightSideliteCount > 0 ? positiveDimension(rightWidthValue) : null;

  if (leftSideliteCount > 0 && rightSideliteCount > 0) {
    if (left !== null && right === null) {
      right =
        (remainingWidth - left * leftSideliteCount) / rightSideliteCount;
    }
    if (right !== null && left === null) {
      left =
        (remainingWidth - right * rightSideliteCount) / leftSideliteCount;
    }
    if (left === null && right === null) {
      left = remainingWidth / sideliteCount;
      right = remainingWidth / sideliteCount;
    }
  } else if (leftSideliteCount > 0) {
    left ??= remainingWidth / leftSideliteCount;
  } else {
    right ??= remainingWidth / rightSideliteCount;
  }

  if (
    (leftSideliteCount > 0 && (left === null || left <= 0)) ||
    (rightSideliteCount > 0 && (right === null || right <= 0))
  ) {
    return null;
  }

  const resolvedTotal =
    doorWidth +
    (left ?? 0) * leftSideliteCount +
    (right ?? 0) * rightSideliteCount;
  if (Math.abs(resolvedTotal - totalWidth) > 0.02) return null;

  return { left, right };
}

function mixedResolution({
  configuration,
  piece,
  activeOptionName,
  preparationOptionName,
}: {
  configuration: PieceDiagramSeries600MixedConfiguration;
  piece?: PieceDiagramData;
  activeOptionName?: string | null;
  preparationOptionName?: string | null;
}): MixedResolution | null {
  const totalWidth = positiveDimension(piece?.width);
  const doorWidth = positiveDimension(piece?.doorWidth);
  const height =
    positiveDimension(piece?.height) ?? positiveDimension(piece?.doorHeight);

  if (totalWidth === null || doorWidth === null || height === null) return null;

  const pattern = MIXED_PATTERNS[configuration];
  const doorIndex = pattern.findIndex((pieceKind) => pieceKind !== "O");
  const leftSideliteCount = doorIndex;
  const rightSideliteCount = pattern.length - doorIndex - 1;
  const doorKind = pattern.includes("XX") ? "XX" : "X";
  const identity = resolveDoorIdentity({
    doorKind,
    activeOptionName,
    preparationOptionName,
  });
  if (!identity) return null;

  const sideliteWidths = resolveSideliteWidths({
    totalWidth,
    doorWidth,
    leftSideliteCount,
    rightSideliteCount,
    leftWidthValue: piece?.leftSideliteWidth,
    rightWidthValue: piece?.rightSideliteWidth,
  });
  if (!sideliteWidths) return null;

  const pieces: PieceDiagramSeries600MixedPiece[] = pattern.map(
    (pieceKind, index) => {
      if (pieceKind === "X" && "exteriorHingeSide" in identity) {
        return {
          kind: "X",
          width: doorWidth,
          height,
          exteriorHingeSide: identity.exteriorHingeSide,
        };
      }

      if (pieceKind === "XX" && "activeLeaf" in identity) {
        return {
          kind: "XX",
          width: doorWidth,
          height,
          activeLeaf: identity.activeLeaf,
          boreCount: identity.boreCount,
        };
      }

      return {
        kind: "O",
        width:
          index < doorIndex ? sideliteWidths.left! : sideliteWidths.right!,
        height,
      };
    },
  );

  return { kind: "MIXED", configuration, pieces };
}

export function resolveSharedFrenchDoor({
  systemName,
  configuration,
  piece,
  activeOptionName,
  preparationOptionName,
}: {
  systemName?: string | null;
  configuration?: string | null;
  piece?: PieceDiagramData;
  activeOptionName?: string | null;
  preparationOptionName?: string | null;
}): Series600DoorResolution | null {
  if (!usesSharedFrenchDoorVisuals(systemName)) return null;

  const normalizedConfiguration = normalizeConfiguration(configuration);

  if (
    STANDALONE_CONFIGURATIONS.has(
      normalizedConfiguration as StandaloneConfiguration,
    )
  ) {
    return standaloneResolution({
      configuration: normalizedConfiguration as StandaloneConfiguration,
      piece,
      activeOptionName,
      preparationOptionName,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(
      MIXED_PATTERNS,
      normalizedConfiguration,
    )
  ) {
    return mixedResolution({
      configuration:
        normalizedConfiguration as PieceDiagramSeries600MixedConfiguration,
      piece,
      activeOptionName,
      preparationOptionName,
    });
  }

  return null;
}
