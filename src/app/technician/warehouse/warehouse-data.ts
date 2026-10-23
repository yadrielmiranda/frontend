import type { WarehousePoInventory } from "@/app/api/warehouse.api";

export const technicianStoreSelection = (value?: string) =>
  value === "unassigned" || (/^[1-9]\d*$/.test(value ?? "") && Number.isSafeInteger(Number(value))) ? value! : "";

export const emptyTechnicianWarehouseInventory = (): WarehousePoInventory => ({
  items: [], total: 0, page: 1, pageSize: 20,
  summary: { onHand: 0, unassigned: 0, inTransit: null, released: null }, activeCountId: null,
});
