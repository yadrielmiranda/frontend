import type { GarageDesignTemplate } from "./garage-design-templates";

export interface DesignPattern {
  id: number;
  name: string;
  imageUrl: string | null;
  template?: GarageDesignTemplate | null;
  isActive: boolean;
  sortOrder: number;
}

export interface DesignColor {
  id: number;
  idFrameColor?: number | null;
  name: string;
  hexCode: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SystemDesignOption {
  idSystem: number;
  idDesign: number;
  idDesignColor: number;
  sortOrder: number;
  design: DesignPattern;
  color: DesignColor;
}

export interface SystemDesignSettings {
  allowDesign?: boolean;
  garageMaxSectionHeightIn?: number | string;
  defaultDesignId?: number | null;
  defaultDesignColorId?: number | null;
  designOptions?: SystemDesignOption[];
}

export interface GarageDesignSnapshot {
  version: 1;
  systemId: number;
  design: Pick<DesignPattern, "id" | "name" | "imageUrl" | "template">;
  color: Pick<DesignColor, "id" | "name" | "hexCode" | "idFrameColor">;
}

export interface SystemDesignAssignment {
  designId: number;
  colorIds: number[];
  sortOrder: number;
}

export interface DesignColorModifier {
  designColorId: number;
  modifierEnabled: boolean;
  basePriceMultiplier: string;
  basePriceDeduction: string;
}

export function neutralDesignColorModifier(
  designColorId: number,
): DesignColorModifier {
  return {
    designColorId,
    modifierEnabled: false,
    basePriceMultiplier: "1",
    basePriceDeduction: "0",
  };
}

export function validateDesignColorModifier(
  modifier: DesignColorModifier,
): string | null {
  const decimal = /^\d{1,18}(?:\.\d{1,20})?$/;
  if (typeof modifier.modifierEnabled !== "boolean")
    return "Choose whether the modifier is enabled.";
  const multiplier =
    typeof modifier.basePriceMultiplier === "string"
      ? modifier.basePriceMultiplier.trim()
      : "";
  const deduction =
    typeof modifier.basePriceDeduction === "string"
      ? modifier.basePriceDeduction.trim()
      : "";
  if (!decimal.test(multiplier) || !/[1-9]/.test(multiplier))
    return "Base Multiplier must be greater than zero, with up to 18 whole digits and 20 decimal places.";
  if (!decimal.test(deduction))
    return "Amount to Subtract must be zero or greater, with up to 18 whole digits and 20 decimal places.";
  return null;
}

export interface EditableSystemDesigns {
  allowDesign: boolean;
  garageMaxSectionHeightIn?: number;
  defaultDesignId: number | null;
  defaultDesignColorId: number | null;
  designs: SystemDesignAssignment[];
  colorModifiers?: DesignColorModifier[];
}

/** Restrict catalog previews to browser images and same-origin paths. */
export function safeDesignImageUrl(
  value: string | null | undefined,
): string | null {
  const url = value?.trim();
  if (!url || url.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(url))
    return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? url
      : null;
  } catch {
    return null;
  }
}

export function validateSystemDesignSettings(
  settings: EditableSystemDesigns,
  patterns: DesignPattern[],
  colors: DesignColor[],
): string | null {
  const maximumSectionHeight = settings.garageMaxSectionHeightIn;
  if (
    maximumSectionHeight !== undefined &&
    (typeof maximumSectionHeight !== "number" ||
      !Number.isFinite(maximumSectionHeight) ||
      maximumSectionHeight < 1 ||
      maximumSectionHeight > 240 ||
      Number(maximumSectionHeight.toFixed(2)) !== maximumSectionHeight)
  ) {
    return "Maximum section height must be between 1 and 240 inches, with up to 2 decimal places.";
  }
  if (settings.designs.some((item) => item.colorIds.length === 0)) {
    return "Select at least one color for each selected design.";
  }
  if (
    settings.designs.some(
      (item) => !Number.isInteger(item.sortOrder) || item.sortOrder < 0,
    )
  ) {
    return "Design order must be a whole number of zero or greater.";
  }
  const hasDesign = settings.defaultDesignId !== null;
  const hasColor = settings.defaultDesignColorId !== null;
  if (hasDesign !== hasColor || (settings.allowDesign && !hasDesign)) {
    return "Choose both a default design and a default color.";
  }
  if (hasDesign && hasColor) {
    const assignment = settings.designs.find(
      (item) => item.designId === settings.defaultDesignId,
    );
    if (!assignment?.colorIds.includes(settings.defaultDesignColorId!)) {
      return "The default design and color must be an allowed combination for this system.";
    }
    const design = patterns.find(
      (item) => item.id === settings.defaultDesignId,
    );
    const color = colors.find(
      (item) => item.id === settings.defaultDesignColorId,
    );
    if (
      !design ||
      !color ||
      (settings.allowDesign && (!design.isActive || !color.isActive))
    ) {
      return "Choose an active default design and color before enabling designs.";
    }
  }
  if (settings.colorModifiers !== undefined) {
    if (!Array.isArray(settings.colorModifiers))
      return "Design color modifiers must be a list.";
    const seen = new Set<number>();
    for (const modifier of settings.colorModifiers) {
      if (
        !modifier ||
        !Number.isSafeInteger(modifier.designColorId) ||
        modifier.designColorId < 1 ||
        seen.has(modifier.designColorId)
      )
        return "Configure each design color modifier only once.";
      seen.add(modifier.designColorId);
      const color = colors.find((item) => item.id === modifier.designColorId);
      if (!color) return "A design color modifier refers to an unknown color.";
      const error = validateDesignColorModifier(modifier);
      if (error) return `${color.name}: ${error}`;
    }
  }
  return null;
}
