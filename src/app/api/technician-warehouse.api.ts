import { apiFetch } from "./_base";
import { technicianState } from "./technician.api";
import type { Paged, WarehouseMovement, WarehousePoInventory, WarehouseReleaseRequest, WarehouseReleaseResult, WarehouseUnit } from "./warehouse.api";
import type { MaterialStoreCountInventory, MaterialStoreInternalUseInput, MaterialStoreInternalUseResult } from "./materials.api";

type Query = Record<string, string | number | boolean | undefined>;
type TechnicianWarehouseUnit = Omit<WarehouseUnit, "pieceId">;

// The shared controls do not need the private piece identifier. The technician
// projection keeps the same PO identification for scanned and selected parts.
const selectionUnit = (unit: TechnicianWarehouseUnit): WarehouseUnit => ({
  ...unit, pieceId: null,
});
export async function technicianWarehouseInventoryByPo(query?: Query): Promise<WarehousePoInventory> {
  const data = await apiFetch<Omit<WarehousePoInventory, "items"> & { items: Array<Omit<WarehousePoInventory["items"][number], "units"> & { units: TechnicianWarehouseUnit[] }> }>(
    "/api/technician/warehouse/inventory/po", { query, cache: "no-store" },
  );
  return { ...data, items: data.items.map(group => ({ ...group, units: group.units.map(unit => ({
    ...selectionUnit(unit), orderId: group.orderId, customer: group.customer, project: group.project,
  })) })) };
}
export async function technicianWarehouseUnit(barcode: string) {
  return selectionUnit(await apiFetch<TechnicianWarehouseUnit>(`/api/technician/warehouse/units/${encodeURIComponent(barcode)}`, { cache: "no-store" }));
}
export const technicianWarehouseStores = async () => (await technicianState()).stores;
export const technicianWarehouseRelease = (body: WarehouseReleaseRequest) =>
  apiFetch<WarehouseReleaseResult>("/api/technician/releases", { method: "POST", body, timeoutMs: 90000 });
export const technicianWarehouseHistory = (query?: Query) =>
  apiFetch<Paged<WarehouseMovement>>("/api/technician/warehouse/history", { query, cache: "no-store" });
export const technicianMaterialInventory = (storeId: number) =>
  apiFetch<MaterialStoreCountInventory>(`/api/technician/materials/stores/${storeId}/inventory`, { cache: "no-store" });
export const technicianWithdrawMaterials = (storeId: number, body: Pick<MaterialStoreInternalUseInput, "requestKey" | "lines">) =>
  apiFetch<MaterialStoreInternalUseResult>(`/api/technician/materials/stores/${storeId}/internal-use`, {
    method: "POST", body: { requestKey: body.requestKey, lines: body.lines }, timeoutMs: 90000,
  });
export type TechnicianMaterialMovement = {
  id: number; operationKey: string; kind: "INTERNAL_USE"; quantity: number; deltaBaseUnits: number;
  actorId: number; recipient: string; note: string; createdAt: string;
  product: { id: number; code: string; name: string };
  presentation: { id: number; name: string; multiplier: number } | null;
  store: { id: number; name: string };
};
export const technicianMaterialHistory = (query?: Query) =>
  apiFetch<Paged<TechnicianMaterialMovement>>("/api/technician/materials/history", { query, cache: "no-store" });
