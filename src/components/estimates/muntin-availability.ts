import type { MuntinInputMode, MuntinPattern, MuntinType, PieceMuntin, SysConf } from "@/lib/types";

export function getMuntinInputMode(pattern: MuntinPattern | null | undefined): MuntinInputMode {
  return pattern?.inputMode ?? (pattern?.requiresLites ? "GRID" : "NONE");
}

export function muntinPatternRequiresType(pattern: MuntinPattern | null | undefined): boolean {
  return getMuntinInputMode(pattern) !== "NONE"
    && (pattern?.requiresType ?? Boolean(pattern?.requiresLites));
}

export type MuntinOptions = {
  patterns: MuntinPattern[];
  types: MuntinType[];
  typesByPattern: Map<number, MuntinType[]>;
  fullViewPattern: MuntinPattern | null;
};

export function getMuntinOptions(
  settings: Pick<SysConf, "muntinRules"> | null | undefined,
  patterns: readonly MuntinPattern[],
  types: readonly MuntinType[],
  hasLayout: boolean,
  crystalId: number,
  selectedPatternId?: number,
): MuntinOptions {
  const typesByPattern = new Map<number, MuntinType[]>();
  const availablePatterns = patterns.filter((pattern) => {
    if (!pattern.isActive) return false;
    const mode = getMuntinInputMode(pattern);
    if (mode === "NONE") return true;
    if (mode === "GRID" && !hasLayout) return false;
    // Rules are exact; the old SysConf-wide settings never grant availability.
    const rule = settings?.muntinRules?.find((item) =>
      item.crystalId === crystalId && item.patternId === pattern.id);
    if (!rule) return false;
    const allowedIds = new Set(rule.allowedTypeIds);
    const availableTypes = types.filter((type) => type.isActive
      && (rule.availability === "ALL" || allowedIds.has(type.id)));
    typesByPattern.set(pattern.id, availableTypes);
    return !muntinPatternRequiresType(pattern) || availableTypes.length > 0;
  });
  return {
    patterns: availablePatterns,
    types: typesByPattern.get(Number(selectedPatternId)) ?? [],
    typesByPattern,
    fullViewPattern: availablePatterns.find((pattern) => getMuntinInputMode(pattern) === "NONE" && pattern.isDefault)
      ?? availablePatterns.find((pattern) => getMuntinInputMode(pattern) === "NONE") ?? null,
  };
}

export function isMuntinSelectionAvailable(
  selection: Pick<PieceMuntin, "idPattern" | "idType"> | null | undefined,
  options: MuntinOptions,
): boolean {
  if (!selection) return true;
  const pattern = options.patterns.find((item) => item.id === Number(selection.idPattern));
  return Boolean(pattern && (!muntinPatternRequiresType(pattern)
    || options.typesByPattern.get(pattern.id)?.some((type) => type.id === Number(selection.idType))));
}

// A context change never silently substitutes a different priced type.
export function normalizeMuntinSelection(
  selection: PieceMuntin | null | undefined,
  options: MuntinOptions,
): PieceMuntin | null {
  if (!selection) return null;
  if (!isMuntinSelectionAvailable(selection, options)) {
    return options.fullViewPattern
      ? { idPattern: options.fullViewPattern.id, idType: null, panels: [] }
      : null;
  }
  const pattern = options.patterns.find((item) => item.id === Number(selection.idPattern))!;
  const idType = muntinPatternRequiresType(pattern) ? selection.idType : null;
  const panels = getMuntinInputMode(pattern) === "GRID" ? selection.panels : [];
  return idType === selection.idType && (panels === selection.panels || !selection.panels.length)
    ? selection : { ...selection, idType, panels };
}
