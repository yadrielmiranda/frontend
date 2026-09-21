import { apiFetch } from "./_base";
import type { Paged, ReceiptItem, ReceiptResult, WarehouseStoreRef } from "./warehouse.api";

export type TechnicianUnit = {
  lineNumber: string; barcode: string; mark: string;
  product: string; system: string; configuration: string;
  orderNumber: string; poNumber: string;
  expectedParts: number | null; inTransit: number; onHand: number;
  pending: number | null; version: number;
};
export type TechnicianState = { stores: WarehouseStoreRef[]; countOpen: boolean };
export type TechnicianScanResult = {
  stock: TechnicianUnit; replayed: boolean;
  movement: { id: number; type: string; quantity: number; createdAt: string; toStore: WarehouseStoreRef | null };
};
export type TechnicianAction = "COLLECT" | "RECEIVE";
export const technicianLogin = (identifier: string, password: string) =>
  apiFetch<{ role: string }>("/api/auth/technician-login", {
    method: "POST", body: { identifier, password }, suppressAuthEvent: true,
  });
export const technicianState = () => apiFetch<TechnicianState>("/api/technician/state", { cache: "no-store" });
export const technicianPending = (query: { search?: string; page?: number; pageSize?: number }) =>
  apiFetch<Paged<TechnicianUnit>>("/api/technician/pending", { query, cache: "no-store" });
export const technicianScan = (barcode: string, action: TechnicianAction, requestKey: string, storeId?: number) =>
  apiFetch<TechnicianScanResult>("/api/technician/scan", {
    method: "POST", body: { barcode, action, requestKey, ...(action === "RECEIVE" ? { storeId } : {}) }, timeoutMs: 30000,
  });
export const technicianReceive = (storeId: number, items: ReceiptItem[], requestKey: string) =>
  apiFetch<ReceiptResult>("/api/technician/receipts", {
    method: "POST", body: { storeId, items, requestKey }, timeoutMs: 90000,
  });
