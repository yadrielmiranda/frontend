import type { DiagramFamily, DiagramSpec } from "@/lib/types";

import type { FixedWindowShape } from "./renderers/fixed/fixed-window-shape-diagram";

type AuthenticSpecSource = {
  source: "diagramSpec" | "configuration";
};

export type AuthenticHorizontalRollingSpec = AuthenticSpecSource & {
  renderer: "HORIZONTAL_ROLLING_WINDOW";
} &
  (
    | {
        configuration: "OX";
        split: "1/2-1/2" | "2/3-1/3";
      }
    | {
        configuration: "XO";
        split: "1/2-1/2" | "1/3-2/3";
      }
    | {
        configuration: "XOX";
        split: "1/3-1/3-1/3" | "1/4-1/2-1/4";
      }
  );

export type AuthenticSingleHungSpec = AuthenticSpecSource & {
  renderer: "SINGLE_HUNG_WINDOW";
  configuration:
    | "EQUAL_LITES"
    | "UNEQUAL_LITES"
    | "SH_OVER_FIX_EQUAL_LITES";
};

export type AuthenticCasementSpec = AuthenticSpecSource & {
  renderer: "CASEMENT_WINDOW";
  configuration: "XL" | "XR" | "O";
};

export type AuthenticFixedWindowSpec = AuthenticSpecSource & {
  renderer: "FIXED_WINDOW_SHAPE";
  shape: FixedWindowShape;
};

export type AuthenticWindowSpec =
  | AuthenticHorizontalRollingSpec
  | AuthenticSingleHungSpec
  | AuthenticCasementSpec
  | AuthenticFixedWindowSpec;

type SpecRecord = Record<string, unknown>;

function asRecord(value: unknown): SpecRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SpecRecord)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function normalizeLabel(value?: string): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ");
}

const SPLITS = [
  "1/3-1/3-1/3",
  "1/4-1/2-1/4",
  "1/2-1/2",
  "2/3-1/3",
  "1/3-2/3",
] as const;

function normalizeSplit(value: unknown): (typeof SPLITS)[number] | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const fractions = raw.match(/\d+\s*\/\s*\d+/g);
  if (!fractions?.length) return null;

  const normalized = fractions
    .map((fraction) => fraction.replace(/\s+/g, ""))
    .join("-");

  return SPLITS.find((split) => split === normalized) ?? null;
}

function splitFromLabel(label: string): (typeof SPLITS)[number] | null {
  return normalizeSplit(label);
}

function rendererIsSupported(spec: SpecRecord): boolean {
  const renderer = asTrimmedString(spec.renderer)?.toUpperCase();

  return (
    renderer === undefined ||
    renderer === null ||
    renderer === "AUTHENTIC_EVOLUTION" ||
    renderer === "HORIZONTAL_ROLLING_WINDOW" ||
    renderer === "SINGLE_HUNG_WINDOW" ||
    renderer === "CASEMENT_WINDOW" ||
    renderer === "FIXED_WINDOW_SHAPE" ||
    renderer === "FIXED_WINDOW_SHAPES"
  );
}

function resolveHorizontalRolling(
  configurationLabel: string,
  explicitSpec: SpecRecord | null,
): AuthenticHorizontalRollingSpec | null {
  if (explicitSpec && !rendererIsSupported(explicitSpec)) return null;

  const explicitConfiguration = asTrimmedString(
    explicitSpec?.configuration,
  )?.toUpperCase();
  const label = normalizeLabel(configurationLabel);
  const labelMatch = label.match(/(?:^|[^A-Z])(XOX|OX|XO)(?:[^A-Z]|$)/);
  const hasLiteDistributionName =
    /\bEQUAL\b/.test(label) || /\bUNEQUAL\b/.test(label);
  const inferredConfiguration =
    labelMatch?.[1] ?? (hasLiteDistributionName ? "XO" : null);

  const configuration = explicitConfiguration ?? inferredConfiguration;
  if (configuration !== "OX" && configuration !== "XO" && configuration !== "XOX") {
    return null;
  }

  const hasExplicitSplit =
    explicitSpec?.split !== undefined && explicitSpec.split !== null;
  const explicitSplit = normalizeSplit(explicitSpec?.split);
  const labelSplit = splitFromLabel(label);
  const labelContainsFractions = /\d+\s*\/\s*\d+/.test(label);

  if ((hasExplicitSplit && !explicitSplit) || (labelContainsFractions && !labelSplit)) {
    return null;
  }

  const isUnequal = /\bUNEQUAL\b/.test(label);
  const source =
    explicitConfiguration || explicitSplit ? "diagramSpec" : "configuration";

  let split = explicitSplit ?? labelSplit;
  if (!split) {
    if (configuration === "XOX") {
      return null;
    } else if (isUnequal) {
      split = configuration === "OX" ? "2/3-1/3" : "1/3-2/3";
    } else {
      split = "1/2-1/2";
    }
  }

  if (
    configuration === "OX" &&
    (split === "1/2-1/2" || split === "2/3-1/3")
  ) {
    return { renderer: "HORIZONTAL_ROLLING_WINDOW", configuration, split, source };
  }

  if (
    configuration === "XO" &&
    (split === "1/2-1/2" || split === "1/3-2/3")
  ) {
    return { renderer: "HORIZONTAL_ROLLING_WINDOW", configuration, split, source };
  }

  if (
    configuration === "XOX" &&
    (split === "1/3-1/3-1/3" || split === "1/4-1/2-1/4")
  ) {
    return { renderer: "HORIZONTAL_ROLLING_WINDOW", configuration, split, source };
  }

  return null;
}

function resolveSingleHung(
  configurationLabel: string,
  explicitSpec: SpecRecord | null,
): AuthenticSingleHungSpec | null {
  if (explicitSpec && !rendererIsSupported(explicitSpec)) return null;

  const label = normalizeLabel(configurationLabel);
  const explicitConfiguration = asTrimmedString(explicitSpec?.configuration);
  const explicitLayout = asTrimmedString(explicitSpec?.layout);
  const explicitSplit = normalizeSplit(explicitSpec?.split);
  const hasExplicitLayout = Boolean(
    explicitConfiguration || explicitLayout || explicitSplit,
  );

  const overFixPattern =
    /\bSH\s*(?:\/\s*FIX|[-\s]*OVER[-\s]*FIX|[-\s]+FIX)\b/;

  function layoutFromLabel(value: string): AuthenticSingleHungSpec["configuration"] | null {
    const normalized = normalizeLabel(value);

    if (
      overFixPattern.test(normalized) ||
      normalized === "SH OVER FIX" ||
      normalized === "SH OVER FIX EQUAL LITES"
    ) {
      return "SH_OVER_FIX_EQUAL_LITES";
    }

    if (/\bUNEQUAL\b/.test(normalized)) return "UNEQUAL_LITES";
    if (/\bEQUAL\b/.test(normalized)) return "EQUAL_LITES";

    if (normalized === "OX") {
      return explicitSplit === "2/3-1/3"
        ? "UNEQUAL_LITES"
        : "EQUAL_LITES";
    }

    if (/\bSINGLE[ -]*HUNG\b/.test(normalized)) return "EQUAL_LITES";

    return null;
  }

  const explicitValue = explicitLayout ?? explicitConfiguration;
  const explicitNormalized = normalizeLabel(explicitValue ?? undefined);
  const configuration =
    explicitNormalized === "OX" && !explicitSplit
      ? layoutFromLabel(label) ?? "EQUAL_LITES"
      : explicitValue
        ? layoutFromLabel(explicitValue)
        : layoutFromLabel(label);

  if (!configuration) return null;

  return {
    renderer: "SINGLE_HUNG_WINDOW",
    configuration,
    source: hasExplicitLayout ? "diagramSpec" : "configuration",
  };
}

function isCasementFixedValue(value: string): boolean {
  const normalized = normalizeLabel(value);

  if (normalized === "O") return true;

  return /^CASEMENT\s+FIX(?:ED)?(?:\s+WINDOW)?(?:\s*\(\s*O\s*\)|\s+O)?$/.test(
    normalized,
  );
}

function casementConfigurationFromValue(
  value: string,
): AuthenticCasementSpec["configuration"] | null {
  const normalized = normalizeLabel(value);
  const compact = normalized.replace(/[^A-Z0-9]/g, "");

  if (compact === "XL") return "XL";
  if (compact === "XR") return "XR";
  if (isCasementFixedValue(value)) return "O";

  const hasLeft = /\bLEFT\b/.test(normalized);
  const hasRight = /\bRIGHT\b/.test(normalized);
  if (hasLeft && !hasRight) return "XL";
  if (hasRight && !hasLeft) return "XR";

  return null;
}

function resolveCasement(
  configurationLabel: string,
  explicitSpec: SpecRecord | null,
): AuthenticCasementSpec | null {
  const explicitRenderer = asTrimmedString(
    explicitSpec?.renderer,
  )?.toUpperCase();
  if (
    explicitRenderer &&
    explicitRenderer !== "AUTHENTIC_EVOLUTION" &&
    explicitRenderer !== "CASEMENT_WINDOW"
  ) {
    return null;
  }

  const explicitValue =
    asTrimmedString(explicitSpec?.configuration) ??
    asTrimmedString(explicitSpec?.hingeSideExterior);
  const explicitConfiguration = explicitValue
    ? casementConfigurationFromValue(explicitValue)
    : null;
  if (explicitValue && !explicitConfiguration) return null;

  const configuration =
    explicitConfiguration ?? casementConfigurationFromValue(configurationLabel);
  if (!configuration) return null;

  return {
    renderer: "CASEMENT_WINDOW",
    configuration,
    source: explicitValue ? "diagramSpec" : "configuration",
  };
}

const FIXED_SHAPE_BY_COMPACT_VALUE: Readonly<
  Record<string, FixedWindowShape>
> = {
  CIRCLE: "CIRCLE",
  FX70FC: "CIRCLE",
  EYEBROW: "EYEBROW",
  FX70EB: "EYEBROW",
  FAN: "FAN",
  FX70FN: "FAN",
  HALFCIRCLE: "HALF_CIRCLE",
  FX70HC: "HALF_CIRCLE",
  HALFEYEBROWLEFT: "HALF_EYEBROW_LEFT",
  FX70HEBL: "HALF_EYEBROW_LEFT",
  HALFEYEBROWRIGHT: "HALF_EYEBROW_RIGHT",
  HALFFANLEFT: "HALF_FAN_LEFT",
  FX70HFNL: "HALF_FAN_LEFT",
  HALFFANRIGHT: "HALF_FAN_RIGHT",
  HALFTOMBSTONELEFT: "HALF_TOMBSTONE_LEFT",
  FX70HARL: "HALF_TOMBSTONE_LEFT",
  HALFTOMBSTONERIGHT: "HALF_TOMBSTONE_RIGHT",
  HEXAGON: "HEXAGON_SYMMETRIC",
  HEXAGONSYMMETRIC: "HEXAGON_SYMMETRIC",
  FX70HX: "HEXAGON_SYMMETRIC",
  OCTAGON: "OCTAGON_SYMMETRIC",
  OCTAGONSYMMETRIC: "OCTAGON_SYMMETRIC",
  FX70OC: "OCTAGON_SYMMETRIC",
  O: "PICTURE_WINDOW",
  PICTURE: "PICTURE_WINDOW",
  PICTUREWINDOW: "PICTURE_WINDOW",
  PICTUREWINDOWO: "PICTURE_WINDOW",
  FX70PW: "PICTURE_WINDOW",
  QUARTERCIRCLE: "QUARTER_CIRCLE",
  FX70QC: "QUARTER_CIRCLE",
  TOMBSTONE: "TOMBSTONE",
  FX70AR: "TOMBSTONE",
  TRAPEZOIDLEFT: "TRAPEZOID_LEFT",
  FX70TRZL: "TRAPEZOID_LEFT",
  TRAPEZOIDRIGHT: "TRAPEZOID_RIGHT",
  TRIANGLE90LEFT: "TRIANGLE_90_LEFT",
  FX70TRGL: "TRIANGLE_90_LEFT",
  TRIANGLE90RIGHT: "TRIANGLE_90_RIGHT",
};

function fixedShapeFromValue(value: string): FixedWindowShape | null {
  const normalized = normalizeLabel(value);
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const exact = FIXED_SHAPE_BY_COMPACT_VALUE[compact];
  if (exact) return exact;

  const label = normalized
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\bFIXED\b/g, " ")
    .replace(/\bWINDOW\b/g, " ")
    .replace(/\bSHAPE\b/g, " ")
    .replace(/\bSYMMETRIC\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hasLeft = /\bLEFT\b/.test(label);
  const hasRight = /\bRIGHT\b/.test(label);

  if (/\bHALF\s+EYEBROW\b/.test(label)) {
    if (hasLeft && !hasRight) return "HALF_EYEBROW_LEFT";
    if (hasRight && !hasLeft) return "HALF_EYEBROW_RIGHT";
    return null;
  }
  if (/\bHALF\s+FAN\b/.test(label)) {
    if (hasLeft && !hasRight) return "HALF_FAN_LEFT";
    if (hasRight && !hasLeft) return "HALF_FAN_RIGHT";
    return null;
  }
  if (/\bHALF\s+TOMBSTONE\b/.test(label)) {
    if (hasLeft && !hasRight) return "HALF_TOMBSTONE_LEFT";
    if (hasRight && !hasLeft) return "HALF_TOMBSTONE_RIGHT";
    return null;
  }
  if (/\bTRAPEZOID\b/.test(label)) {
    if (hasLeft && !hasRight) return "TRAPEZOID_LEFT";
    if (hasRight && !hasLeft) return "TRAPEZOID_RIGHT";
    return null;
  }
  if (/\bTRIANGLE\b/.test(label)) {
    if (hasLeft && !hasRight) return "TRIANGLE_90_LEFT";
    if (hasRight && !hasLeft) return "TRIANGLE_90_RIGHT";
    return null;
  }
  if (/\bQUARTER\s+CIRCLE\b/.test(label)) return "QUARTER_CIRCLE";
  if (/\bHALF\s+CIRCLE\b/.test(label)) return "HALF_CIRCLE";
  if (/\bPICTURE\b/.test(label)) return "PICTURE_WINDOW";
  if (/\bHEXAGON\b/.test(label)) return "HEXAGON_SYMMETRIC";
  if (/\bOCTAGON\b/.test(label)) return "OCTAGON_SYMMETRIC";
  if (/\bEYEBROW\b/.test(label)) return "EYEBROW";
  if (/\bTOMBSTONE\b/.test(label)) return "TOMBSTONE";
  if (/\bCIRCLE\b/.test(label)) return "CIRCLE";
  if (/\bFAN\b/.test(label)) return "FAN";

  return null;
}

function resolveFixedWindow(
  configurationLabel: string,
  explicitSpec: SpecRecord | null,
): AuthenticFixedWindowSpec | null {
  if (explicitSpec && !rendererIsSupported(explicitSpec)) return null;

  const explicitValue =
    asTrimmedString(explicitSpec?.shape) ??
    asTrimmedString(explicitSpec?.shapeKey) ??
    asTrimmedString(explicitSpec?.configuration);
  const explicitShape = explicitValue
    ? fixedShapeFromValue(explicitValue)
    : null;
  if (explicitValue && !explicitShape) return null;

  const shape = explicitShape ?? fixedShapeFromValue(configurationLabel);
  if (!shape) return null;

  return {
    renderer: "FIXED_WINDOW_SHAPE",
    shape,
    source: explicitValue ? "diagramSpec" : "configuration",
  };
}

export function resolveAuthenticWindowSpec({
  diagramFamily,
  configuration,
  diagramSpec,
}: {
  diagramFamily?: DiagramFamily;
  configuration?: string;
  diagramSpec?: DiagramSpec | null;
}): AuthenticWindowSpec | null {
  if (
    diagramFamily !== "HORIZONTAL_SLIDER" &&
    diagramFamily !== "SINGLE_HUNG" &&
    diagramFamily !== "CASEMENT" &&
    diagramFamily !== "FIXED_SHAPE"
  ) {
    return null;
  }

  const explicitSpec = asRecord(diagramSpec);
  const explicitFamily = asTrimmedString(explicitSpec?.family)?.toUpperCase();

  const familyMatches =
    !explicitFamily ||
    explicitFamily === diagramFamily ||
    (diagramFamily === "CASEMENT" && explicitFamily === "CASEMENT_WINDOW") ||
    (diagramFamily === "FIXED_SHAPE" &&
      (explicitFamily === "FIXED_WINDOW_SHAPE" ||
        explicitFamily === "FIXED_WINDOW_SHAPES"));

  if (!familyMatches) {
    return null;
  }

  if (diagramFamily === "HORIZONTAL_SLIDER") {
    return resolveHorizontalRolling(configuration ?? "", explicitSpec);
  }

  if (diagramFamily === "CASEMENT") {
    return resolveCasement(configuration ?? "", explicitSpec);
  }

  if (diagramFamily === "FIXED_SHAPE") {
    return resolveFixedWindow(configuration ?? "", explicitSpec);
  }

  return resolveSingleHung(configuration ?? "", explicitSpec);
}
