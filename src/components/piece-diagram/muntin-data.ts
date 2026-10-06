import type { MuntinPattern, MuntinType } from "@/lib/types";

type PanelInput = {
  panelIndex?: number;
  panelCode?: string | null;
  panelLabel?: string | null;
  horizontalLites?: number;
  verticalLites?: number;
};

export type ResolvedMuntin = {
  profile: "flat" | "ogee";
  panels: {
    panelIndex: number;
    panelCode?: string | null;
    panelLabel: string;
    horizontalLites: number;
    verticalLites: number;
  }[];
};

type MuntinInput = {
  pattern?: Pick<MuntinPattern, "name" | "requiresLites" | "inputMode" | "requiresType"> | null;
  type?: Pick<MuntinType, "name"> | null;
  panels?: readonly (PanelInput | undefined)[];
};

const normalizedName = (name: string) =>
  name.trim().toLowerCase().replace(/[\u2010-\u2014]/g, "-").replace(/\s+/g, " ");

// These two catalog profiles are one inch wide. Unknown profiles/patterns
// retain their written specification instead of inventing a visual design.
export function resolveMuntinForDiagram(input?: MuntinInput | null): ResolvedMuntin | null {
  if (!input?.pattern) return null;
  // New catalogs explicitly declare the design. Legacy snapshots only have a
  // name, so preserve the known Colonial drawing without guessing other shapes.
  const isGrid = input.pattern.inputMode !== undefined
    ? input.pattern.inputMode === "GRID"
    : input.pattern.requiresLites && normalizedName(input.pattern.name) === "colonial";
  if (!isGrid) return null;
  const typeName = normalizedName(input.type?.name ?? "");
  const profile = typeName === "1 in flat-flat" ? "flat"
    : typeName === "1 in ogee-flat" ? "ogee" : null;
  if (!profile || !input.panels?.length) return null;

  const indices = new Set<number>();
  const panels: ResolvedMuntin["panels"] = [];
  for (const panel of input.panels) {
    if (!panel) return null;
    const { panelIndex, horizontalLites, verticalLites } = panel;
    if (
      !Number.isSafeInteger(panelIndex) || Number(panelIndex) < 1 ||
      !Number.isSafeInteger(horizontalLites) || Number(horizontalLites) < 1 ||
      !Number.isSafeInteger(verticalLites) || Number(verticalLites) < 1 ||
      indices.has(panelIndex!)
    ) return null;
    indices.add(panelIndex!);
    panels.push({
      panelIndex: panelIndex!,
      panelCode: panel.panelCode?.trim() ?? null,
      panelLabel: panel.panelLabel?.trim() ?? "",
      horizontalLites: horizontalLites!,
      verticalLites: verticalLites!,
    });
  }
  return { profile, panels };
}

// Live form data is deliberately separate from saved pieceMuntin relations.
// In particular, null/Full View must never fall back to the saved grid.
export function resolveFormMuntinForDiagram(
  muntin: { idPattern?: number; idType?: number | null; panels?: readonly (PanelInput | undefined)[] } | null | undefined,
  patterns: readonly MuntinPattern[],
  types: readonly MuntinType[],
): ResolvedMuntin | null {
  if (!muntin) return null;
  return resolveMuntinForDiagram({
    pattern: patterns.find((pattern) => pattern.id === Number(muntin.idPattern)),
    type: types.find((type) => type.id === Number(muntin.idType)),
    panels: muntin.panels,
  });
}
