import { apiFetch } from "./_base";

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
  expectedParts: number | null;
  inTransit: number;
  onHand: number;
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
  summary: { onHand: number; inTransit: number; released: number };
  activeCountId: number | null;
};
export type CountInfo = {
  id: number;
  status: "OPEN" | "COMPLETED" | "CANCELED";
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
export const warehouseUnit = (barcode: string) =>
  get<WarehouseUnit>(`units/${encodeURIComponent(barcode)}`);
export const warehouseHistory = (query?: Query) =>
  get<Paged<WarehouseMovement>>("history", query);
export const warehouseScan = (
  barcode: string,
  action: WarehouseAction,
  requestKey: string,
) => post<ScanResult>("scan", { barcode, action, requestKey });
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
export const warehouseStartCount = (requestKey: string) =>
  post<{ id: number }>("counts", { requestKey });
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

// getRandomValues funciona también en el HTTP local usado con lectores físicos.
export function warehouseRequestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
