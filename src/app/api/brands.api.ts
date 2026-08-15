import { apiFetch } from "./_base";
import type {
  Brand,
  BrandProduct,
  CreateBrandData,
  Product,
  UpdateBrandData,
} from "../../lib/types";

export type BrandWithProducts = Brand & {
  brandProducts: BrandProduct[];
};

export type BrandOptionManageItem = {
  id: number;
  isActive: boolean;
  isGlobal?: boolean;
  globalSortOrder?: number;
  isAssociated: boolean;
  sortOrder: number | null;
  surchargeEnabled: boolean;
  isDefault: boolean;
  costoA: string | number | null;
  costoB: string | number | null;
  costoC: string | number | null;
};

export type BrandTintsManage = {
  brand: Pick<Brand, "id" | "name">;
  tints: Array<
    BrandOptionManageItem & {
      color: string;
      hexCode: string;
    }
  >;
};

export type BrandCoatingsManage = {
  brand: Pick<Brand, "id" | "name">;
  coatings: Array<BrandOptionManageItem & { name: string }>;
};

export type BrandPrivaciesManage = {
  brand: Pick<Brand, "id" | "name">;
  privacies: Array<BrandOptionManageItem & { name: string }>;
};

export type UpdateBrandTintAssociations = {
  tints: Array<{
    tintId: number;
    sortOrder: number;
    surchargeEnabled: boolean;
    isDefault: boolean;
    costoA: string | null;
    costoB: string | null;
    costoC: string | null;
  }>;
};

export type UpdateBrandCoatingAssociations = {
  coatings: Array<{
    coatingId: number;
    sortOrder: number;
    surchargeEnabled: boolean;
    isDefault: boolean;
    costoA: string | null;
    costoB: string | null;
    costoC: string | null;
  }>;
};

export type UpdateBrandPrivacyAssociations = {
  privacies: Array<{
    privacyId: number;
    sortOrder: number;
    surchargeEnabled: boolean;
    isDefault: boolean;
    costoA: string | null;
    costoB: string | null;
    costoC: string | null;
  }>;
};

export function getBrands() {
  return apiFetch<Brand[]>("/api/brands");
}

export function getBrandsWithProducts() {
  return apiFetch<BrandWithProducts[]>("/api/brands/with-products");
}

export function getBrand(id: number) {
  return apiFetch<Brand>(`/api/brands/${id}`);
}

export function getBrandWithProducts(id: number) {
  return apiFetch<BrandWithProducts>(`/api/brands/${id}/products`);
}

export function createBrand(data: CreateBrandData) {
  return apiFetch<Brand>("/api/brands", {
    method: "POST",
    body: data,
  });
}

export function updateBrand(id: number, data: UpdateBrandData) {
  return apiFetch<Brand>(`/api/brands/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteBrand(id: number) {
  return apiFetch<Brand>(`/api/brands/${id}`, {
    method: "DELETE",
  });
}

export function addProductToBrand(brandId: number, productId: number) {
  return apiFetch<BrandWithProducts>(
    `/api/brands/${brandId}/products/${productId}`,
    { method: "POST" },
  );
}

export function removeProductFromBrand(brandId: number, productId: number) {
  return apiFetch<BrandWithProducts>(
    `/api/brands/${brandId}/products/${productId}`,
    { method: "DELETE" },
  );
}

export function getAvailableProductsForBrand(brandId: number) {
  return apiFetch<Product[]>(`/api/brands/${brandId}/available-products`);
}

export function getBrandTintsForManage(brandId: number) {
  return apiFetch<BrandTintsManage>(`/api/brands/${brandId}/tints/manage`);
}

export function updateBrandTints(
  brandId: number,
  data: UpdateBrandTintAssociations,
) {
  return apiFetch<BrandTintsManage>(`/api/brands/${brandId}/tints/manage`, {
    method: "PATCH",
    body: data,
  });
}

export function getBrandCoatingsForManage(brandId: number) {
  return apiFetch<BrandCoatingsManage>(
    `/api/brands/${brandId}/coatings/manage`,
  );
}

export function updateBrandCoatings(
  brandId: number,
  data: UpdateBrandCoatingAssociations,
) {
  return apiFetch<BrandCoatingsManage>(
    `/api/brands/${brandId}/coatings/manage`,
    {
      method: "PATCH",
      body: data,
    },
  );
}

export function getBrandPrivaciesForManage(brandId: number) {
  return apiFetch<BrandPrivaciesManage>(
    `/api/brands/${brandId}/privacies/manage`,
  );
}

export function updateBrandPrivacies(
  brandId: number,
  data: UpdateBrandPrivacyAssociations,
) {
  return apiFetch<BrandPrivaciesManage>(
    `/api/brands/${brandId}/privacies/manage`,
    {
      method: "PATCH",
      body: data,
    },
  );
}
