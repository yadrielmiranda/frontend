import type { ConfigMuntinLayoutItem, PieceMuntin } from "@/lib/types";

// Window Wall uses the same lite counts in every glass panel, regardless of
// columns or horizontal divisions. Persist one shared configuration only.
export function buildWindowWallMuntinLayout(): ConfigMuntinLayoutItem[] {
  return [{ panelIndex: 1, panelCode: "O", panelLabel: "All glass panels" }];
}

export function syncWindowWallMuntinPanels(
  layout: readonly ConfigMuntinLayoutItem[] | null | undefined,
  existing: PieceMuntin["panels"] | null | undefined,
): PieceMuntin["panels"] {
  const panels = existing ?? [];
  if (!layout?.length || hasAmbiguousWindowWallMuntinPanels(layout, panels)) return panels;
  const shared = { ...layout[0], horizontalLites: panels[0]?.horizontalLites ?? 1,
    verticalLites: panels[0]?.verticalLites ?? 1 };
  const current = panels[0];
  if (panels.length === 1 && current.panelIndex === shared.panelIndex
    && current.panelCode === shared.panelCode && current.panelLabel === shared.panelLabel
    && current.horizontalLites === shared.horizontalLites && current.verticalLites === shared.verticalLites) return panels;
  return [shared];
}

export function hasAmbiguousWindowWallMuntinPanels(
  layout: readonly ConfigMuntinLayoutItem[] | null | undefined,
  panels: readonly Partial<PieceMuntin["panels"][number]>[] | null | undefined,
): boolean {
  if (!layout?.length || !panels?.length) return false;
  const first = panels[0];
  return panels.some((panel) => !Number.isSafeInteger(panel.horizontalLites)
    || Number(panel.horizontalLites) < 1 || !Number.isSafeInteger(panel.verticalLites)
    || Number(panel.verticalLites) < 1 || panel.horizontalLites !== first.horizontalLites
    || panel.verticalLites !== first.verticalLites);
}
