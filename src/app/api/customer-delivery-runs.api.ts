import { apiFetch } from "./_base";
import type {
  CustomerDelivery,
  CustomerDeliveryItem,
  FactoryPartType,
  Paged,
  WarehousePoInventory,
} from "./warehouse.api";
import type { SignatureStrokes } from "./contracts.api";

export type CustomerDeliveryRunOrder = {
  key: string;
  poNumber: string;
  poName?: string;
  customer?: string;
  project?: string;
  source: "ORDER" | "EXTERNAL";
  orderNumber: string;
  totalPieces: number;
  totalParts: number;
  pendingPieces: number;
  pendingParts: number;
  unknownPending: boolean;
  canRemove?: boolean;
};
export type CustomerDeliveryRun = {
  id: number;
  status: "ACTIVE" | "CLOSED";
  storeId: number | null;
  storeName: string;
  multiStore?: boolean;
  availableStorages?: Array<{ storeId: number | null; storeName: string }>;
  canDelete?: boolean;
  allocations?: Array<
    CustomerDeliveryItem & { storeId: number | null; storeName: string }
  >;
  createdById: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  revision: string;
  orders: CustomerDeliveryRunOrder[];
  items: CustomerDeliveryItem[];
  pendingItems: CustomerDeliveryItem[];
  totalPieces: number;
  totalParts: number;
  pendingPieces: number;
  pendingParts: number;
  hasPending: boolean;
  deliveryId: number | null;
  delivery: CustomerDelivery | null;
};
export type CloseCustomerDeliveryRun = {
  requestKey: string;
  revision: string;
  firstName: string;
  lastName: string;
  signatureStrokes: SignatureStrokes;
  acceptPartial?: boolean;
};
const base = "/api/warehouse/customer-delivery-runs";
export const customerDeliveryRuns = (query?: {
  page?: number;
  pageSize?: number;
  status?: "ACTIVE" | "CLOSED";
}) => apiFetch<Paged<CustomerDeliveryRun>>(base, { query, cache: "no-store" });
export const customerDeliveryRun = (id: number) =>
  apiFetch<CustomerDeliveryRun>(`${base}/${id}`, { cache: "no-store" });
export const createCustomerDeliveryRun = (body: {
  requestKey: string;
  storeId?: number | null;
  poKeys?: string[];
}) => apiFetch<CustomerDeliveryRun>(base, { method: "POST", body });
export type ManualCustomerDeliveryRequest = {
  requestKey: string;
  poKey: string;
  runId?: number;
  storeId?: number | null;
};
export const recordManualCustomerDelivery = (body: ManualCustomerDeliveryRequest) =>
  apiFetch<CustomerDeliveryRun>(`${base}/manual`, { method: "POST", body });
export const customerDeliveryPoOptions = (
  id: number,
  query?: { search?: string; page?: number; pageSize?: number },
) =>
  apiFetch<WarehousePoInventory>(`${base}/${id}/po-options`, {
    query,
    cache: "no-store",
  });
export const addCustomerDeliveryPos = (id: number, poKeys: string[], requestKey?: string) =>
  apiFetch<CustomerDeliveryRun>(`${base}/${id}/pos`, {
    method: "POST",
    body: { poKeys, ...(requestKey ? { requestKey } : {}) },
  });
export const deleteCustomerDeliveryRun = (id: number) =>
  apiFetch<{ id: number; deleted: true }>(`${base}/${id}`, { method: "DELETE" });
export const removeCustomerDeliveryPo = (
  id: number,
  body: { requestKey: string; poKey: string },
) => apiFetch<CustomerDeliveryRun>(`${base}/${id}/remove-po`, { method: "POST", body });
export const scanCustomerDeliveryPart = (
  id: number,
  body: {
    requestKey: string;
    barcode: string;
    partType?: FactoryPartType;
    addPo?: boolean;
    storeId?: number | null;
  },
) =>
  apiFetch<CustomerDeliveryRun>(`${base}/${id}/scan`, { method: "POST", body });
export const removeCustomerDeliveryPart = (
  id: number,
  body: {
    requestKey: string;
    barcode: string;
    partType?: FactoryPartType;
    storeId?: number | null;
  },
) =>
  apiFetch<CustomerDeliveryRun>(`${base}/${id}/remove-part`, {
    method: "POST",
    body,
  });
export const closeCustomerDeliveryRun = (
  id: number,
  body: CloseCustomerDeliveryRun,
) =>
  apiFetch<CustomerDeliveryRun>(`${base}/${id}/close`, {
    method: "POST",
    body,
    timeoutMs: 90000,
  });
