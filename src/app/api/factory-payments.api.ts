import { apiFetch } from "./_base";
import type { FactoryManufacturer, FactoryPaymentDetail, FactoryPaymentFilters, FactoryPaymentList, RegisterFactoryPayment } from "@/lib/factory-payments";

const root = "/api/factory-payments";
export const getFactoryManufacturers = () => apiFetch<FactoryManufacturer[]>(`${root}/manufacturers`);
export const saveFactoryManufacturer = (body: { name?: string; active?: boolean; isDefault?: boolean }, id?: number) =>
  apiFetch<FactoryManufacturer>(`${root}/manufacturers${id == null ? "" : `/${id}`}`, { method: id == null ? "POST" : "PATCH", body });
export const getFactoryPaymentOrders = (filters: FactoryPaymentFilters = {}) =>
  apiFetch<FactoryPaymentList>(`${root}/orders`, { query: filters });
export const getFactoryPaymentDetail = (id: number) => apiFetch<FactoryPaymentDetail>(`${root}/orders/${id}`);
export const saveFactoryPaymentManufacturer = (id: number, manufacturerId: number, version: number | null) =>
  apiFetch<FactoryPaymentDetail>(`${root}/orders/${id}/account`, { method: "PUT", body: { manufacturerId, ...(version == null ? {} : { version }) } });
export const syncFactoryPaymentTotal = (id: number, version: number) =>
  apiFetch<FactoryPaymentDetail>(`${root}/orders/${id}/sync-total`, { method: "POST", body: { version } });
export const registerFactoryPayment = (id: number, body: RegisterFactoryPayment) =>
  apiFetch<FactoryPaymentDetail>(`${root}/orders/${id}/payments`, { method: "POST", body });
export const voidFactoryPayment = (id: number, reason: string) =>
  apiFetch<FactoryPaymentDetail>(`${root}/payments/${id}/void`, { method: "POST", body: { reason } });
