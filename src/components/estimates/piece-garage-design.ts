import type { GarageDesignSnapshot, SystemDesignOption } from "@/lib/garage-designs";
import { garageDesignHasGlass } from "@/lib/garage-design-templates";

type DesignPiece = {
  preserveExistingDesign?: boolean;
  id?: number;
  idProd?: number;
  idBrand?: number;
  idSyst?: number;
  idDesign?: number | null;
  idDesignColor?: number | null;
  designSnapshot?: GarageDesignSnapshot | null;
};

export type ExistingGarageDesignContext = Pick<DesignPiece, "idSyst" | "idDesign" | "idDesignColor" | "designSnapshot">;

type DesignSystem = {
  id?: number;
  allowDesign?: boolean;
  defaultDesignId?: number | null;
  defaultDesignColorId?: number | null;
  designOptions?: SystemDesignOption[];
};

export function availableGarageDesignOptions(system?: DesignSystem | null): SystemDesignOption[] {
  if (!system?.allowDesign) return [];
  return (system.designOptions ?? []).filter(option =>
    option.idSystem === system.id && option.design.isActive && option.color.isActive,
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.design.name.localeCompare(b.design.name)
    || a.color.name.localeCompare(b.color.name));
}

export function defaultGarageDesignPair(system?: DesignSystem | null) {
  const match = availableGarageDesignOptions(system).find(option =>
    option.idDesign === system?.defaultDesignId && option.idDesignColor === system?.defaultDesignColorId,
  );
  return { idDesign: match?.idDesign ?? null, idDesignColor: match?.idDesignColor ?? null };
}

export function garageDesignPairForColor(options: SystemDesignOption[], idDesign: number | null, idDesignColor: number | null) {
  return { idDesign: options.some(option => option.idDesign === idDesign && option.idDesignColor === idDesignColor) ? idDesign : null, idDesignColor };
}

export function garageDesignPairForDesign(options: SystemDesignOption[], idDesign: number | null, idDesignColor: number | null) {
  return { idDesign, idDesignColor: options.some(option => option.idDesign === idDesign && option.idDesignColor === idDesignColor) ? idDesignColor : null };
}

export function isRetainedGarageDesign(piece: DesignPiece, initial: DesignPiece): boolean {
  return Boolean((initial.id || initial.preserveExistingDesign) && initial.idDesign && initial.idDesignColor
    && ["idProd", "idBrand", "idSyst", "idDesign", "idDesignColor"].every(key =>
      Number(piece[key as keyof DesignPiece]) === Number(initial[key as keyof DesignPiece]),
    ));
}

export function garageDesignSelectionError({ enabled, piece, initial, diagramFamily, system }: {
  enabled: boolean;
  piece: DesignPiece;
  initial: DesignPiece;
  diagramFamily?: string;
  system?: DesignSystem | null;
}): string | null {
  if (!enabled) return null;
  if (!piece.idDesign || !piece.idDesignColor) return "Select both a design and a design color.";
  if (isRetainedGarageDesign(piece, initial)) return null;
  if (diagramFamily !== "GARAGE_DOOR" || !system?.allowDesign) {
    return "Designs are not available for this product and series. Remove the design or select another series.";
  }
  if (!availableGarageDesignOptions(system).some(option =>
    option.idDesign === Number(piece.idDesign) && option.idDesignColor === Number(piece.idDesignColor),
  )) return "This design and color combination is no longer available. Select an available combination or remove the design.";
  return null;
}

/** Resolve the real frame catalog ID; ordinary frame colors never create design choices. */
export function garageDesignFrameSelection({ enabled, piece, system, frameColors }: {
  enabled: boolean;
  piece: DesignPiece;
  system?: DesignSystem | null;
  frameColors: readonly { id: number; isActive?: boolean }[];
}): { idFrameColor: number | null; error: string | null } {
  if (!enabled || !piece.idDesignColor) return { idFrameColor: null, error: null };
  const snapshot = piece.designSnapshot;
  const capturedFrame = snapshot?.version === 1 && snapshot.systemId === Number(piece.idSyst)
    && snapshot.design.id === Number(piece.idDesign) && snapshot.color.id === Number(piece.idDesignColor)
    ? snapshot.color.idFrameColor : null;
  const currentColor = system?.designOptions?.find(option => option.idSystem === Number(piece.idSyst)
    && option.idDesignColor === Number(piece.idDesignColor))?.color;
  const idFrameColor = capturedFrame ?? currentColor?.idFrameColor;
  if (!Number.isSafeInteger(idFrameColor) || Number(idFrameColor) <= 0) {
    return { idFrameColor: null, error: "Link this Design Color to a Frame Color in Garage Designs before calculating." };
  }
  if (!frameColors.some(color => color.id === idFrameColor && color.isActive !== false)) {
    return { idFrameColor: null, error: "The Frame Color linked to this Design Color is unavailable for this series. Enable it in Manage Frame Colors." };
  }
  return { idFrameColor: Number(idFrameColor), error: null };
}

/** Prefer the captured names for the selected pair, even after catalog changes. */
export function pieceGarageDesign(piece: DesignPiece, system?: DesignSystem | null) {
  if (!piece.idDesign && !piece.idDesignColor) return null;
  const snapshot = piece.designSnapshot;
  if (snapshot?.version === 1 && snapshot.systemId === Number(piece.idSyst)
    && snapshot.design.id === Number(piece.idDesign) && snapshot.color.id === Number(piece.idDesignColor)) {
    return { design: snapshot.design, color: snapshot.color };
  }
  const option = system?.designOptions?.find(item => item.idSystem === Number(piece.idSyst)
    && item.idDesign === Number(piece.idDesign) && item.idDesignColor === Number(piece.idDesignColor));
  if (option) return { design: option.design, color: option.color };
  const design = system?.designOptions?.find(item => item.idSystem === Number(piece.idSyst) && item.idDesign === Number(piece.idDesign))?.design;
  const color = system?.designOptions?.find(item => item.idSystem === Number(piece.idSyst) && item.idDesignColor === Number(piece.idDesignColor))?.color;
  return {
    design: design ?? { id: Number(piece.idDesign), name: piece.idDesign ? `Design #${piece.idDesign}` : "Not selected", imageUrl: null, template: null },
    color: color ?? { id: Number(piece.idDesignColor), name: piece.idDesignColor ? `Color #${piece.idDesignColor}` : "Not selected", hexCode: null },
  };
}

export function garageDesignDescription(piece: DesignPiece, system?: DesignSystem | null): string | null {
  const selected = pieceGarageDesign(piece, system);
  return selected ? `Design: ${selected.design.name} | Design Color: ${selected.color.name}` : null;
}

/** Only a complete selection with a validated all-slat template suppresses glass. */
export function pieceHasSolidGarageDesign(piece: DesignPiece, system?: DesignSystem | null): boolean {
  if (!piece.idDesign || !piece.idDesignColor) return false;
  const selected = pieceGarageDesign(piece, system);
  return garageDesignHasGlass(selected?.design.template) === false;
}

/** The captured design finish also finishes the frame; the ordinary frame stays available when design is removed. */
export function pieceFrameColor(
  piece: DesignPiece,
  ordinaryFrame?: { color?: string | null; hexCode?: string | null } | null,
  system?: DesignSystem | null,
): { color: string | null; hexCode: string | null } {
  const selected = pieceGarageDesign(piece, system);
  if (selected && Number(piece.idDesignColor) > 0) {
    return { color: selected.color.name, hexCode: selected.color.hexCode ?? null };
  }
  return { color: ordinaryFrame?.color ?? null, hexCode: ordinaryFrame?.hexCode ?? null };
}
