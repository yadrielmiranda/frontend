import type { DiagramSpec } from "@/lib/types";

import runtimeConfig from "./sliding-glass-door-c139.json";

export const SLIDING_GLASS_DOOR_CONFIGURATIONS = [
  "O-XX",
  "OX",
  "OX-XO",
  "OX-XX",
  "OXO",
  "OXX",
  "OXX-XXO",
  "OXX-XXX",
  "OXXX",
  "OXXX-XXXO",
  "OXXX-XXXX",
  "PX",
  "PXX",
  "PXX-XX",
  "PXX-XXP",
  "PXXX",
  "PXXX-XXX",
  "PXXX-XXXP",
  "PXXXX",
  "XO",
  "XP",
  "XX",
  "XX-O",
  "XX-XO",
  "XX-XX",
  "XX-XXP",
  "XXO",
  "XXP",
  "XXX",
  "XXX-XXO",
  "XXX-XXX",
  "XXX-XXXP",
  "XXXO",
  "XXXP",
  "XXXX",
  "XXXX-XXXO",
  "XXXX-XXXX",
  "XXXXP",
] as const;

export type SlidingGlassDoorConfiguration =
  (typeof SLIDING_GLASS_DOOR_CONFIGURATIONS)[number];
export type SlidingGlassDoorManufacturer = "ECO" | "NOVO";
export type SlidingGlassDoorCatalogManufacturer =
  | SlidingGlassDoorManufacturer
  | "ECO_NOVO";

export interface SlidingGlassDoorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SlidingGlassDoorGlassDlo extends SlidingGlassDoorRect {
  panelIndex: number;
  kind: "O" | "X";
  direction: "-" | "L" | "R";
}

export interface SlidingGlassDoorScreenPanel {
  panelIndex: number;
  direction: "LEFT" | "RIGHT";
  outer: SlidingGlassDoorRect;
  mesh: SlidingGlassDoorRect;
  railThickness: 12;
  layerOrder: "ABOVE_GLASS_INDICATORS_AND_HARDWARE";
}

export interface SlidingGlassDoorCatalogEntry {
  configuration: SlidingGlassDoorConfiguration;
  manufacturer: SlidingGlassDoorCatalogManufacturer;
  tracks: 2 | 3 | 4;
  panelCount: 1 | 2 | 3 | 4 | 6 | 8;
  pocketLeft: boolean;
  pocketRight: boolean;
  structuralAsset: string;
  viewBox: [number, number, number, number];
  structuralAssetPlacementBox: [number, number, number, number];
  dimensionBox: [number, number, number, number];
  glassDlos: SlidingGlassDoorGlassDlo[];
  screenPanels: SlidingGlassDoorScreenPanel[];
}

type SpecRecord = Record<string, unknown>;

const configurationSet = new Set<string>(
  SLIDING_GLASS_DOOR_CONFIGURATIONS,
);
const catalog = runtimeConfig.catalog as SlidingGlassDoorCatalogEntry[];
const catalogByIdentity = new Map(
  catalog.map((entry) => [
    `${entry.configuration}__${entry.manufacturer}`,
    entry,
  ]),
);

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

export function normalizeSlidingGlassDoorConfiguration(
  value: unknown,
): SlidingGlassDoorConfiguration | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const normalized = raw
    .toUpperCase()
    .replace(/_/g, "-")
    .replace(
      /\s*\[(?:(?:2|3|4)\s*TRACK|POCKET\s+DOOR)\]\s*$/,
      "",
    )
    .replace(/\s+/g, "");

  return configurationSet.has(normalized)
    ? (normalized as SlidingGlassDoorConfiguration)
    : null;
}

function normalizeManufacturer(
  value: unknown,
): SlidingGlassDoorManufacturer | null {
  const raw = asTrimmedString(value)?.toUpperCase();
  if (!raw) return null;
  if (raw === "NOVO" || raw.includes("ECO NOVO")) return "NOVO";
  if (raw === "ECO" || raw.includes("ECO WINDOWS")) return "ECO";
  return null;
}

function rendererIsSupported(spec: SpecRecord): boolean {
  const renderer = asTrimmedString(spec.renderer)?.toUpperCase();

  return (
    !renderer ||
    renderer === "AUTHENTIC_EVOLUTION" ||
    renderer === "SLIDING_DOOR" ||
    renderer === "SLIDING_GLASS_DOOR"
  );
}

export function resolveSlidingGlassDoorSpec({
  configuration,
  diagramSpec,
  brandName,
}: {
  configuration?: string;
  diagramSpec?: DiagramSpec | null;
  brandName?: string | null;
}): SlidingGlassDoorCatalogEntry | null {
  const explicitSpec = asRecord(diagramSpec);
  if (explicitSpec && !rendererIsSupported(explicitSpec)) return null;

  const explicitFamily = asTrimmedString(explicitSpec?.family)?.toUpperCase();
  if (
    explicitFamily &&
    explicitFamily !== "SLIDING_DOOR" &&
    explicitFamily !== "SLIDING_GLASS_DOOR"
  ) {
    return null;
  }

  const explicitConfiguration =
    asTrimmedString(explicitSpec?.configuration) ??
    asTrimmedString(explicitSpec?.catalogConfiguration);
  const resolvedConfiguration = normalizeSlidingGlassDoorConfiguration(
    explicitConfiguration ?? configuration,
  );

  if (!resolvedConfiguration) return null;
  if (
    explicitConfiguration &&
    !normalizeSlidingGlassDoorConfiguration(explicitConfiguration)
  ) {
    return null;
  }

  const explicitManufacturer = asTrimmedString(explicitSpec?.manufacturer);
  const normalizedExplicitManufacturer = normalizeManufacturer(
    explicitManufacturer,
  );
  const explicitSharedManufacturer =
    explicitManufacturer?.toUpperCase().replace(/[\s-]+/g, "_") ===
    "ECO_NOVO";

  if (
    explicitManufacturer &&
    !normalizedExplicitManufacturer &&
    !explicitSharedManufacturer
  ) {
    return null;
  }

  const sharedEntry = catalogByIdentity.get(
    `${resolvedConfiguration}__ECO_NOVO`,
  );
  if (sharedEntry) return sharedEntry;

  const manufacturer =
    normalizedExplicitManufacturer ?? normalizeManufacturer(brandName);

  if (explicitSharedManufacturer) return null;
  if (!manufacturer) return null;

  return (
    catalogByIdentity.get(`${resolvedConfiguration}__${manufacturer}`) ?? null
  );
}

export function slidingGlassDoorSupportsScreen(
  spec: SlidingGlassDoorCatalogEntry,
): boolean {
  return spec.screenPanels.length > 0;
}

export const SLIDING_GLASS_DOOR_RELEASE = runtimeConfig.release;
