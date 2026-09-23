import { apiFetch } from "./_base";
import type { Paged, ReceiptItem, ReceiptResult, WarehouseStoreRef, InstallationDestination, InstallationDeliveryRequest, InstallationDeliveryResult } from "./warehouse.api";

export type TechnicianUnit = {
  lineNumber: string; barcode: string; mark: string;
  product: string; system: string; configuration: string;
  orderNumber: string; poNumber: string;
  expectedParts: number | null; inTransit: number; onHand: number;
  pending: number | null; version: number;
  installation: InstallationDestination | null;
};
export type TechnicianState = {
  stores: WarehouseStoreRef[];
  countOpen: boolean;
  activePickup: { id: number; startedAt: string } | null;
  activePickupCount: number;
};
export type TechnicianScanResult = {
  stock: TechnicianUnit; replayed: boolean;
  movement: { id: number; type: string; quantity: number; createdAt: string; toStore: WarehouseStoreRef | null };
};
export type TechnicianAction = "RECEIVE";

export type FactoryPickupPoPreview = {
  orderId: number;
  orderNumber: string;
  poNumber: string;
  pieces: number;
  parts: number;
};

export type FactoryPickupLine = TechnicianUnit & {
  orderId: number | null;
  targetParts: number;
  collected: number;
  remaining: number;
  collectionState: "COMPLETE" | "PARTIAL" | "PENDING";
};

export type FactoryPickupOrder = {
  orderId: number;
  orderNumber: string;
  poNumber: string;
  addedDuringPickup: boolean;
  addedAt: string;
  pieces: number;
  expectedParts: number;
  collectedParts: number;
  remainingParts: number;
};

export type FactoryPickupRun = {
  id: number;
  cycle: number;
  events: Array<{ id: number; status: "ACTIVE" | "COMPLETED" | "PARTIAL"; cycle: number; createdAt: string; actor: FactoryPickupPerson; partialReason: FactoryPickupPartialReason | null; note: string | null }>;
  createdBy: FactoryPickupPerson;
  closedBy: FactoryPickupPerson | null;
  technicians: FactoryPickupPerson[];
  collectors: Array<FactoryPickupPerson & { parts: number; firstScanAt: string; lastScanAt: string }>;
  status: "ACTIVE" | "COMPLETED" | "PARTIAL";
  startedAt: string;
  finishedAt: string | null;
  partialReason:
    | "NOT_READY_AT_FACTORY"
    | "MANUFACTURER_HELD_MATERIAL"
    | "DAMAGED_NOT_ACCEPTED"
    | "OTHER"
    | null;
  note: string | null;
  poCount: number;
  expectedParts: number;
  collectedParts: number;
  remainingParts: number;
  orders: FactoryPickupOrder[];
  lines: FactoryPickupLine[];
};

export type FactoryPickupPerson = { id: number; name: string };
export type FactoryPickupListItem = Omit<FactoryPickupRun, "lines">;
export type FactoryPickupListQuery = { status: "ACTIVE" | "CLOSED"; page: number; pageSize?: number };

export type FactoryPickupCandidate = FactoryPickupPoPreview & {
  lineNumber: string;
  barcode: string;
  mark: string;
  product: string;
  system: string;
  configuration: string;
};

export type FactoryPickupScanResult =
  | {
      kind: "PO_NOT_INCLUDED";
      candidate: FactoryPickupCandidate;
    }
  | {
      kind: "COLLECTED";
      stock: TechnicianUnit;
      replayed: boolean;
      movement: {
        id: number;
        type: string;
        quantity: number;
        createdAt: string;
        toStore: WarehouseStoreRef | null;
      };
      pickup: FactoryPickupRun;
    };

export type FactoryPickupPartialReason =
  | "NOT_READY_AT_FACTORY"
  | "MANUFACTURER_HELD_MATERIAL"
  | "DAMAGED_NOT_ACCEPTED"
  | "OTHER";
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

export const technicianDeliverToInstallation = (body: InstallationDeliveryRequest) =>
  apiFetch<InstallationDeliveryResult>("/api/technician/installation-deliveries", {
    method: "POST", body, timeoutMs: 90000,
  });

export function parseCurrentFactoryPickup(value: unknown): FactoryPickupRun | null {
  // Sin recogida activa, la respuesta HTTP puede venir sin cuerpo en lugar de JSON null.
  if (value == null || value === "") return null;
  const run = value as Partial<FactoryPickupRun>;
  if (typeof value !== "object" || Array.isArray(value) ||
      typeof run.id !== "number" || !Number.isSafeInteger(run.id) || run.id < 1 ||
      !Array.isArray(run.lines) || !Array.isArray(run.orders)) {
    throw new Error("Unable to load the current factory pickup. Refresh and try again.");
  }
  return run as FactoryPickupRun;
}

export const technicianPickupCurrent = async () =>
  parseCurrentFactoryPickup(await apiFetch<unknown>("/api/technician/pickups/current", { cache: "no-store" }));

export const technicianPickups = (query: FactoryPickupListQuery) =>
  apiFetch<Paged<FactoryPickupListItem>>("/api/technician/pickups", { query, cache: "no-store" });
export const technicianPickup = (id: number) =>
  apiFetch<FactoryPickupRun>(`/api/technician/pickups/${id}`, { cache: "no-store" });

export const technicianPickupScan = (
  pickupRunId: number,
  barcode: string,
  requestKey: string,
  addPo = false,
) => apiFetch<FactoryPickupScanResult>(`/api/technician/pickups/${pickupRunId}/scan`, {
  method: "POST", body: { barcode, requestKey, ...(addPo ? { addPo: true } : {}) }, timeoutMs: 30000,
});

export const technicianFinishPickup = (
  pickupRunId: number,
  data: { cycle: number; partialReason?: FactoryPickupPartialReason; note?: string },
) => apiFetch<FactoryPickupRun>(`/api/technician/pickups/${pickupRunId}/finish`, {
  method: "POST", body: data, timeoutMs: 30000,
});
