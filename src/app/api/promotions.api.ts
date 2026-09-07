import { apiFetch } from "./_base";
export type Promotion = {
  brandName?: string | null;
  productName?: string | null;
  systemName?: string | null;
  excludedProductNames?: string[];
  excludedSystemNames?: string[];
  id: number;
  version: number;
  name: string;
  percent: string;
  audience: string;
  roleIds: number[];
  userIds: number[];
  excludedProductIds: number[];
  excludedSystemIds: number[];
  brandId: number | null;
  productId: number | null;
  systemId: number | null;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};
export type AvailablePromotion = Pick<
  Promotion,
  | "id"
  | "version"
  | "name"
  | "startsAt"
  | "endsAt"
  | "brandName"
  | "productName"
  | "systemName"
  | "excludedProductIds"
  | "excludedSystemIds"
  | "excludedProductNames"
  | "excludedSystemNames"
> & { percent: string | null; automaticDealerAdjustment?: boolean };
export type PromotionOptions = {
  roles: { id: number; name: string }[];
  users: { id: number; username: string; idRole: number }[];
  brands: { id: number; name: string }[];
  products: { id: number; name: string }[];
  systems: { id: number; name: string; idBrand: number; idProduct: number }[];
};
export const getPromotions = () => apiFetch<Promotion[]>("/api/promotions");
export const getPromotionOptions = () =>
  apiFetch<PromotionOptions>("/api/promotions/options");
export const savePromotion = (body: unknown, id?: number) =>
  apiFetch<Promotion>(id ? `/api/promotions/${id}` : "/api/promotions", {
    method: id ? "PUT" : "POST",
    body,
  });
export const getAvailablePromotions = (estimateId?: number) =>
  apiFetch<{ serverNow: string; promotions: AvailablePromotion[] }>(
    estimateId
      ? `/api/promotions/available/estimate/${estimateId}`
      : "/api/promotions/available",
  );
