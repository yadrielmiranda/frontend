import type { FactoryPartCounts, FactoryPartTracking, FactoryPartType } from "@/app/api/warehouse.api";

export const factoryPartTypes = ["DOOR", "FRAME", "WINDOW", "UNKNOWN"] as const;
export const factoryPartLabel: Record<(typeof factoryPartTypes)[number], string> = {
  DOOR: "Door panels", FRAME: "Frames", WINDOW: "Other pieces", UNKNOWN: "Earlier parts (type not recorded)",
};
export const factoryPartsTotal = (parts: FactoryPartCounts) =>
  factoryPartTypes.reduce((sum, type) => sum + (parts[type] ?? 0), 0);
export function factoryBarcode(value: string) {
  const match = value.trim().match(/^(?:[Ii](\d{1,50})|(\d{1,50})(?:-(DOOR|SIDELITE|FRAME|WINDOW))?)$/i);
  if (!match) return null;
  const lineNumber = match[1] ?? match[2];
  if (/^0+$/.test(lineNumber)) return null;
  const suffix = match[3]?.toUpperCase();
  // Sidelites share the existing door-panel allowance; frames remain separate.
  return { lineNumber: lineNumber.replace(/^0+(?=\d)/, ""), type: (suffix === "SIDELITE" ? "DOOR" : suffix) as FactoryPartType | undefined };
}
export function factoryPartSource(tracking: FactoryPartTracking | undefined, source: "TRANSIT" | "WAREHOUSE", storeId: string) {
  if (!tracking) return undefined;
  if (source === "TRANSIT") return tracking.inTransit;
  return storeId === "unassigned" ? tracking.unassigned : tracking.stores.find((store) => String(store.id) === storeId)?.parts ?? {};
}
export function selectedFactoryParts(available: FactoryPartCounts | undefined, quantity: number, selected?: FactoryPartCounts): FactoryPartCounts | undefined {
  if (!available) return undefined;
  if (selected) {
    if (Object.keys(selected).some((type) => !factoryPartTypes.includes(type as typeof factoryPartTypes[number])) ||
      factoryPartTypes.some((type) => !Number.isInteger(selected[type] ?? 0) || (selected[type] ?? 0) < 0) ||
      (selected.UNKNOWN ?? 0) + factoryPartTypes.filter(type => type !== "UNKNOWN").reduce((sum, type) => sum + Math.max(0, (selected[type] ?? 0) - (available[type] ?? 0)), 0) > (available.UNKNOWN ?? 0) ||
      factoryPartsTotal(selected) !== quantity)
      throw new Error("Choose available quantities for each part type.");
    return Object.fromEntries(factoryPartTypes.filter(type => (selected[type] ?? 0) > 0).map(type => [type, selected[type]!]));
  }
  if (quantity === factoryPartsTotal(available)) return undefined;
  const types = factoryPartTypes.filter(type => (available[type] ?? 0) > 0);
  if (types.length === 1 && quantity <= available[types[0]]!) return { [types[0]]: quantity };
  throw new Error("Choose how many door panels and frames to move.");
}
export function displayedFactoryParts(available: FactoryPartCounts, quantity: number, selected?: FactoryPartCounts): FactoryPartCounts {
  if (selected) return selected;
  if (quantity === factoryPartsTotal(available)) return available;
  const types = factoryPartTypes.filter(type => (available[type] ?? 0) > 0);
  return types.length === 1 ? { [types[0]]: quantity } : {};
}
export const factoryPartsText = (parts?: FactoryPartCounts) => parts
  ? factoryPartTypes.filter(type => (parts[type] ?? 0) > 0).map(type => `${parts[type]} ${parts[type] === 1 ? ({ DOOR: "door panel", FRAME: "frame", WINDOW: "other piece", UNKNOWN: "earlier part (type not recorded)" }[type]) : factoryPartLabel[type].toLowerCase()}`).join(" · ")
  : "";
