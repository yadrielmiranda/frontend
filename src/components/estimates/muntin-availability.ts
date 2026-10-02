import type { MuntinPattern, MuntinType, PieceMuntin, SysConf } from "@/lib/types";

export type MuntinOptions = {
  patterns: MuntinPattern[];
  types: MuntinType[];
  defaultType: MuntinType | null;
  fullViewPattern: MuntinPattern | null;
};

export function getMuntinOptions(
  settings: Pick<SysConf, "muntinAvailability" | "allowedMuntinTypeIds"> | null | undefined,
  patterns: readonly MuntinPattern[],
  types: readonly MuntinType[],
  hasLayout: boolean,
): MuntinOptions {
  const mode = settings?.muntinAvailability ?? "ALL";
  const allowedIds = new Set(settings?.allowedMuntinTypeIds ?? []);
  const availableTypes = hasLayout && mode !== "NONE"
    ? types.filter((type) => type.isActive && (mode !== "SELECTED" || allowedIds.has(type.id)))
    : [];
  const availablePatterns = patterns.filter((pattern) =>
    pattern.isActive && (!pattern.requiresLites || availableTypes.length > 0));
  return {
    patterns: availablePatterns,
    types: availableTypes,
    defaultType: availableTypes.find((type) => type.isDefault) ?? availableTypes[0] ?? null,
    fullViewPattern: availablePatterns.find((pattern) => !pattern.requiresLites && pattern.isDefault)
      ?? availablePatterns.find((pattern) => !pattern.requiresLites) ?? null,
  };
}

// Return the original object when it remains supported, so a valid existing
// calculation is not invalidated merely by opening the editor or rerendering.
export function normalizeMuntinSelection(
  selection: PieceMuntin | null | undefined,
  options: MuntinOptions,
): PieceMuntin | null {
  if (!selection) return null;
  const pattern = options.patterns.find((item) => item.id === Number(selection.idPattern));
  if (!pattern) {
    return options.fullViewPattern
      ? { idPattern: options.fullViewPattern.id, idType: null, panels: [] }
      : null;
  }
  if (!pattern.requiresLites) {
    return selection.idType == null && selection.panels.length === 0
      ? selection : { idPattern: pattern.id, idType: null, panels: [] };
  }
  if (options.types.some((type) => type.id === Number(selection.idType))) return selection;
  return options.defaultType ? { ...selection, idType: options.defaultType.id } : null;
}
