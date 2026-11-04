import { apiFetch } from "./_base";
import type { FactoryPartCounts, WarehousePoGroup } from "./warehouse.api";

export type PoInstallationReleaseRequest = {
  requestKey: string;
  poKey: string;
  items: Array<{ barcode: string; storeId: number | null; quantity: number; parts?: FactoryPartCounts; version: number }>;
};
export type PoInstallationReleaseResult = {
  units: number;
  parts: number;
  stores: Array<{ storeId: number | null; storeName: string; parts: number }>;
  replayed: boolean;
};
export const poInstallationReleaseOptions = (poKey: string, storeId = "all") =>
  apiFetch<{ group: WarehousePoGroup; activeCountId: number | null }>("/api/warehouse/releases/po-options", {
    query: { poKey, storeId }, cache: "no-store",
  });
export const releasePoToInstallation = (body: PoInstallationReleaseRequest) =>
  apiFetch<PoInstallationReleaseResult>("/api/warehouse/releases/po", { method: "POST", body, timeoutMs: 90000 });
