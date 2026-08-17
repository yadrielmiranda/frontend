import type { DiagramFamily, DiagramSpec } from "@/lib/types";

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

export type AuthenticWindowSpec =
  | AuthenticHorizontalRollingSpec
  | AuthenticSingleHungSpec
  | AuthenticCasementSpec;

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
    renderer === "CASEMENT_WINDOW"
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
    diagramFamily !== "CASEMENT"
  ) {
    return null;
  }

  const explicitSpec = asRecord(diagramSpec);
  const explicitFamily = asTrimmedString(explicitSpec?.family)?.toUpperCase();

  const familyMatches =
    !explicitFamily ||
    explicitFamily === diagramFamily ||
    (diagramFamily === "CASEMENT" && explicitFamily === "CASEMENT_WINDOW");

  if (!familyMatches) {
    return null;
  }

  if (diagramFamily === "HORIZONTAL_SLIDER") {
    return resolveHorizontalRolling(configuration ?? "", explicitSpec);
  }

  if (diagramFamily === "CASEMENT") {
    return resolveCasement(configuration ?? "", explicitSpec);
  }

  return resolveSingleHung(configuration ?? "", explicitSpec);
}
