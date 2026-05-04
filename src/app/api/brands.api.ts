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