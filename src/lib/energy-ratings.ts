export type EnergySelection = {
  idBrand: number | null;
  idProd: number | null;
  idSyst: number | null;
  idCryst: number | null;
  idTint: number | null;
  idCoat: number | null;
  idPrivacy: number | null;
  idConf: number | null;
};

export type EnergySnapshot = {
  schemaVersion: 1;
  status: "AVAILABLE" | "UNAVAILABLE" | "AMBIGUOUS" | "NOT_APPLICABLE";
  uFactor: string | null;
  shgc: string | null;
  vlt: string | null;
  ratingId: number | null;
  selection?: EnergySelection;
  capturedAt?: string;
  reason?: string;
};

export type EnergyOption = { id: number; name: string };
export type EnergySystem = EnergyOption & {
  idBrand: number;
  idProduct: number;
  brand: EnergyOption;
  product: EnergyOption;
};
export type EnergyCatalogSystem = EnergySystem & {
  crystals: EnergyOption[];
  configs: EnergyOption[];
  tints: EnergyOption[];
  coatings: EnergyOption[];
  privacies: EnergyOption[];
};
export type EnergyCatalogOptions = { systems: EnergyCatalogSystem[] };

export type EnergyRatingInput = {
  idSystem: number;
  idCrystal: number;
  idTint: number;
  idCoating: number;
  idPrivacy: number;
  idConfig: number | null;
  appliesToAllConfigs: boolean;
  uFactor: string | number | null;
  shgc: string | number | null;
  vlt: string | number | null;
  isActive: boolean;
};

export type EnergyRating = EnergyRatingInput & {
  id: number;
  system: EnergySystem;
  crystal: EnergyOption;
  tint: EnergyOption;
  coating: EnergyOption;
  privacy: EnergyOption;
  config: EnergyOption | null;
};

export function formatEnergyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number.toFixed(3) : "—";
}

/** Displays only the values frozen on the piece; never guesses from its labels. */
export function buildEnergyDescription(
  snapshot: EnergySnapshot | null | undefined,
  productKind?: string | null,
): string | null {
  if (productKind === "LINEAR_MATERIAL" || snapshot?.status === "NOT_APPLICABLE") {
    return null;
  }
  const values = [snapshot?.uFactor, snapshot?.shgc, snapshot?.vlt].map(formatEnergyValue);
  if (snapshot?.status !== "AVAILABLE" || values.includes("—")) {
    return "Energy performance: Data unavailable";
  }
  return `NFRC: U-factor: ${values[0]} | SHGC: ${values[1]} | VLT: ${values[2]}`;
}

/** Updates frozen energy values only; unsaved selections and pricing remain local. */
export function mergePieceEnergySnapshots<T extends Partial<EnergySelection> & { id?: number }>(
  current: T[],
  refreshed: Array<{ id: number; energyRatingId?: number | null; energySnapshot?: EnergySnapshot | null }>,
): Array<T & { energyRatingId?: number | null; energySnapshot?: EnergySnapshot | null }> {
  const byId = new Map(refreshed.map((piece) => [piece.id, piece]));
  return current.map((piece) => {
    const update = piece.id == null ? undefined : byId.get(Number(piece.id));
    if (!update) return piece;
    const selection = update.energySnapshot?.selection;
    if (selection && (Object.keys(selection) as Array<keyof EnergySelection>).some((key) =>
      (piece[key] == null ? null : Number(piece[key])) !== selection[key])) return piece;
    return { ...piece, energyRatingId: update.energyRatingId ?? null, energySnapshot: update.energySnapshot ?? null };
  });
}
