import { apiFetch } from "./_base";
import { parseCurrentFactoryPickup } from "./technician.api";
import type {
  FactoryPickupPartialReason,
  FactoryPickupPoPreview,
  FactoryPickupRun,
  FactoryPickupPerson,
  FactoryPickupListItem,
  FactoryPickupListQuery,
  FactoryPickupScanResult,
} from "./technician.api";

export type WarehouseStoreRef = { id: number; name: string; isActive: boolean };
export type InstallationDestination = { id: number; address: string };
export type WarehouseStore = WarehouseStoreRef & {
  version: number;
  onHand: number;
  units: number;
};
export type WarehouseUnit = {
  lineNumber: string;
  barcode: string;
  pieceId: number;
  mark: string;
  product: string;
  system: string;
  configuration: string;
  orderId: number | null;
  orderNumber: string;
  poNumber: string;
  customer: string;
  project: string;
  installation: InstallationDestination | null;
  expectedParts: number | null;
  inTransit: number;
  onHand: number;
  unassigned: number;
  stores: (WarehouseStoreRef & { onHand: number })[];
  released: number;
  pending: number | null;
  version: number;
  updatedAt: string;
  state: string;
};
export type WarehouseMovement = {
  id: number;
  lineNumber: string;
  type: string;
  quantity: number;
  fromStore: WarehouseStoreRef | null;
  toStore: WarehouseStoreRef | null;
  installation: InstallationDestination | null;
  transitDelta: number;
  onHandDelta: number;
  releasedDelta: number;
  transitAfter: number;
  onHandAfter: number;
  releasedAfter: number;
  expectedPartsBefore: number | null;
  expectedPartsAfter: number | null;
  actor: string;
  actorId: number;
  reason: string | null;
  reversalOfId: number | null;
  reversed: boolean;
  countId: number | null;
  countDelta: number;
  createdAt: string;
};
export type WarehouseAction = "COLLECT" | "RECEIVE" | "RELEASE";
export type ScanResult = {
  stock: WarehouseUnit;
  movement: WarehouseMovement;
  replayed: boolean;
  counted?: number;
};
export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Inventory = Paged<WarehouseUnit> & {
  summary: { onHand: number; unassigned: number; inTransit: number | null; released: number | null };
  activeCountId: number | null;
};
export type WarehousePoGroup = {
  key: string;
  orderId: number | null;
  orderNumber: string;
  poNumber: string;
  customer: string;
  project: string;
  units: WarehouseUnit[];
};
export type WarehousePoInventory = Paged<WarehousePoGroup> & {
  summary: Inventory["summary"];
  activeCountId: number | null;
};
export type CountInfo = {
  id: number;
  status: "OPEN" | "COMPLETED" | "CANCELED";
  scope: "ALL" | "STORE" | "UNASSIGNED";
  storeId: number | null;
  store: WarehouseStoreRef | null;
  startedAt: string;
  closedAt: string | null;
  reason: string | null;
  startedBy: { id: number; firstName: string; lastName: string };
  closedBy: CountInfo["startedBy"] | null;
};
export type PhysicalCount = CountInfo &
  Paged<{
    stock: WarehouseUnit;
    expected: number;
    counted: number;
    difference: number;
  }> & {
    expected: number;
    counted: number;
    differences: number;
    revision: string;
  };
type Query = Record<string, string | number | boolean | undefined>;
const get = <T>(path: string, query?: Query) =>
  apiFetch<T>(`/api/warehouse/${path}`, { query, cache: "no-store" });
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(`/api/warehouse/${path}`, {
    method: "POST",
    body,
    timeoutMs: 30000,
  });

export const warehouseInventory = (query?: Query) =>
  get<Inventory>("inventory", query);
export const warehouseInventoryByPo = (query?: Query) =>
  get<WarehousePoInventory>("inventory/po", query);
export const warehouseUnit = (barcode: string) =>
  get<WarehouseUnit>(`units/${encodeURIComponent(barcode)}`);
export const warehouseHistory = (query?: Query) =>
  get<Paged<WarehouseMovement>>("history", query);
export const warehouseScan = (
  barcode: string,
  action: WarehouseAction,
  requestKey: string,
  storeId?: number | null,
) => post<ScanResult>("scan", { barcode, action, requestKey, storeId });
export const warehousePickupCurrent = async () =>
  parseCurrentFactoryPickup(await get<unknown>("pickups/current"));
export const warehousePickupPo = (poNumber: string) =>
  get<FactoryPickupPoPreview>("pickups/po", { poNumber });
export const warehousePickups = (query: FactoryPickupListQuery) =>
  get<Paged<FactoryPickupListItem>>("pickups", query);
export const warehousePickup = (id: number) => get<FactoryPickupRun>(`pickups/${id}`);
export const warehousePickupTechnicians = () => get<FactoryPickupPerson[]>("pickups/technicians");
export const warehouseAssignPickup = (id: number, technicianIds: number[]) =>
  apiFetch<FactoryPickupRun>(`/api/warehouse/pickups/${id}/technicians`, {
    method: "PATCH", body: { technicianIds }, timeoutMs: 30000,
  });
export const warehouseStartPickup = (poNumbers: string[], technicianIds: number[]) =>
  apiFetch<FactoryPickupRun>("/api/warehouse/pickups", {
    method: "POST", body: { poNumbers, technicianIds }, timeoutMs: 90000,
  });
export const warehousePickupScan = (
  pickupRunId: number,
  barcode: string,
  requestKey: string,
  addPo = false,
) => apiFetch<FactoryPickupScanResult>(`/api/warehouse/pickups/${pickupRunId}/scan`, {
  method: "POST", body: { barcode, requestKey, ...(addPo ? { addPo: true } : {}) }, timeoutMs: 30000,
});
export const warehouseFinishPickup = (
  pickupRunId: number,
  data: { cycle: number; partialReason?: FactoryPickupPartialReason; note?: string },
) => apiFetch<FactoryPickupRun>(`/api/warehouse/pickups/${pickupRunId}/finish`, {
  method: "POST", body: data, timeoutMs: 30000,
});

export const warehouseReopenPickup = (id: number, cycle: number) =>
  apiFetch<FactoryPickupRun>(`/api/warehouse/pickups/${id}/reopen`, {
    method: "POST", body: { cycle }, timeoutMs: 30000,
  });
export const warehouseUndo = (id: number, requestKey: string) =>
  post<ScanResult>(`movements/${id}/undo`, { requestKey });
export const warehouseParts = (
  unit: WarehouseUnit,
  expectedParts: number,
  reason: string,
  requestKey: string,
) =>
  post<ScanResult>(`units/${unit.lineNumber}/parts`, {
    version: unit.version,
    expectedParts,
    reason,
    requestKey,
  });
export const warehouseCounts = () => get<CountInfo[]>("counts");
export const warehouseStartCount = (
  requestKey: string,
  scope: CountInfo["scope"],
  storeId: number | null,
) => post<{ id: number }>("counts", { requestKey, scope, storeId });
export const warehouseCount = (id: number, query?: Query) =>
  get<PhysicalCount>(`counts/${id}`, query);
export const warehouseCountScan = (
  id: number,
  barcode: string,
  requestKey: string,
) => post<ScanResult>(`counts/${id}/scan`, { barcode, requestKey });
export const warehouseCloseCount = (
  id: number,
  action: "COMPLETE" | "CANCEL",
  reason?: string,
  revision?: string,
) =>
  post<{ id: number; status: string }>(`counts/${id}/close`, {
    action,
    reason,
    revision,
  });

export const warehouseStores = () => get<WarehouseStore[]>("stores");
export const warehouseCreateStore = (name: string) =>
  post<WarehouseStoreRef & { version: number }>("stores", { name });
export const warehouseUpdateStore = (store: WarehouseStore, name: string, isActive: boolean) =>
  apiFetch<WarehouseStoreRef & { version: number }>(`/api/warehouse/stores/${store.id}`, {
    method: "PATCH", body: { name, isActive, version: store.version },
  });
export type ReceiptItem = { barcode: string; quantity: number; version: number };
export type ReceiptResult = {
  units: number; parts: number; storeId: number; storeName: string; replayed: boolean;
};
export type InstallationDeliveryRequest = {
  installationJobId: number; installationAddress: string;
  items: ReceiptItem[]; requestKey: string;
};
export type InstallationDeliveryResult = {
  units: number; parts: number; installation: InstallationDestination; replayed: boolean;
};
export const warehouseDeliverToInstallation = (body: InstallationDeliveryRequest) =>
  apiFetch<InstallationDeliveryResult>("/api/warehouse/installation-deliveries", {
    method: "POST", body, timeoutMs: 90000,
  });
export const warehouseReceive = (storeId: number, items: ReceiptItem[], requestKey: string) =>
  apiFetch<ReceiptResult>("/api/warehouse/receipts", {
    method: "POST", body: { storeId, items, requestKey }, timeoutMs: 90000,
  });
export const warehouseTransfer = (
  unit: WarehouseUnit, fromStoreId: number | null, toStoreId: number,
  quantity: number, requestKey: string,
) => post<ScanResult>("transfers", {
  barcode: unit.barcode, version: unit.version, fromStoreId, toStoreId, quantity, requestKey,
});

// getRandomValues funciona también en el HTTP local usado con lectores físicos.
export function warehouseRequestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
