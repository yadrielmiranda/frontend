import { apiFetch } from "./_base";

export type FactoryPiece = {
  id: number;
  mark: string;
  qty: number;
  brand: string;
  product: string;
  system: string;
  configuration: string;
  frameColor: string;
  width: number | null;
  height: number | null;
  active: string;
  lineNumbers: string[];
};
export type FactoryImportContext = {
  order: {
    id: number;
    number: string;
    name: string;
    poNumber: string | null;
    factoryCost: string | null;
  };
  pieces: FactoryPiece[];
  expectedUnits: number;
  linkedUnits: number;
};
export type FactoryImportPreview = FactoryImportContext & {
  revision: string;
  document: { poNumber: string; factoryCost: string; orderName: string };
  lines: Array<{
    lineNumber: string;
    mark: string;
    description: string;
    size: string;
    frameColor: string;
    configurationId: string;
    panelConfig: string;
    pieceId: number | null;
    existing: boolean;
    issues: string[];
  }>;
};

export function getFactoryImport(orderId: number) {
  return apiFetch<FactoryImportContext>(
    `/api/orders/${orderId}/factory-import`,
    { cache: "no-store" },
  );
}
export function previewFactoryImport(orderId: number, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<FactoryImportPreview>(
    `/api/orders/${orderId}/factory-import/preview`,
    { method: "POST", body },
  );
}
export function confirmFactoryImport(
  orderId: number,
  file: File,
  revision: string,
  assignments: Array<{ lineNumber: string; pieceId: number }>,
  reviewed: boolean,
) {
  const body = new FormData();
  body.append("file", file);
  body.append("revision", revision);
  body.append("assignments", JSON.stringify(assignments));
  body.append("reviewed", String(reviewed));
  return apiFetch<{
    addedUnits: number;
    linkedUnits: number;
    unchanged: boolean;
  }>(`/api/orders/${orderId}/factory-import/confirm`, { method: "POST", body });
}
