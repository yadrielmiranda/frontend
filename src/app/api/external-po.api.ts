import { apiFetch } from "./_base";

export type ExternalPoLine = {
  lineNumber: string;
  mark: string;
  description: string;
  panels: number | null;
  expectedParts: number | null;
  family: string;
  needsReview: boolean;
  issues: string[];
  existing: boolean;
  locked: boolean;
};
export type ExternalPoPreview = {
  revision: string;
  document: { poNumber: string; orderName: string; supplierName: string };
  lines: ExternalPoLine[];
  expectedUnits: number;
  linkedUnits: number;
};

export function previewExternalPo(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ExternalPoPreview>("/api/warehouse/external-po/preview", {
    method: "POST", body, timeoutMs: 90000,
  });
}

export function confirmExternalPo(
  file: File,
  revision: string,
  parts: Array<{ lineNumber: string; expectedParts: number }>,
  reviewed: boolean,
) {
  const body = new FormData();
  body.append("file", file);
  body.append("revision", revision);
  body.append("parts", JSON.stringify(parts));
  body.append("reviewed", String(reviewed));
  return apiFetch<{ addedUnits: number; linkedUnits: number; unchanged: boolean }>(
    "/api/warehouse/external-po/confirm", { method: "POST", body, timeoutMs: 90000 },
  );
}
