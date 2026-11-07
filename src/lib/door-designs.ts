export type DoorDesignKind = "SINGLE" | "DOUBLE";

export interface DoorDesignOption {
  id: number;
  artworkKey: string;
  kind: DoorDesignKind;
  code: string;
}

export interface DoorDesignCatalogEntry extends DoorDesignOption {
  unitPrice: string | null;
}

export interface DoorDesignSnapshot extends DoorDesignOption {
  version: 1;
  systemId: number;
  configId: number;
  unitPrice?: string;
}

// A saved piece keeps the quoted code and artwork when the catalog or series settings change.
export function selectedDoorDesign(
  designId: number | null | undefined,
  systemId: number,
  configId: number,
  options: readonly DoorDesignOption[],
  snapshot?: DoorDesignSnapshot | null,
): DoorDesignOption | null {
  if (!designId) return null;
  if (snapshot?.id === designId && snapshot.systemId === systemId && snapshot.configId === configId) return snapshot;
  return options.find(option => option.id === designId) ?? null;
}
