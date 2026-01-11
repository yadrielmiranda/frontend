import { apiFetch } from './_base';
import { Brand, BrandProduct } from '../../lib/types';




export type BrandWithProducts = Brand & {
  brandProducts: BrandProduct[];
};

export type CreateBrandData = Omit<Brand, 'id'>;

// --- Brand Fetching Functions ---

export function getBrands() {
  return apiFetch<Brand[]>('/api/brands');
}

export function getBrandsWithProducts() {
  return apiFetch<BrandWithProducts[]>('/api/brands/with-products');
}

export function getBrand(id: number) {
  return apiFetch<Brand>(`/api/brands/${id}`);
}

export function getBrandWithProducts(id: number) {
  return apiFetch<BrandWithProducts>(`/api/brands/${id}/products`);
}

// --- Brand Mutation Functions ---

export function createBrand(data: CreateBrandData) {
  return apiFetch<Brand>('/api/brands', {
    method: 'POST',
    body: data,
  });
}

export function updateBrand(id: number, data: CreateBrandData) {
  return apiFetch<Brand>(`/api/brands/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export function deleteBrand(id: number) {
  return apiFetch<Brand>(`/api/brands/${id}`, {
    method: 'DELETE',
  });
}

// --- Brand-Product Relationship Functions ---

export function addProductToBrand(brandId: number, productId: number) {
  return apiFetch<BrandWithProducts>(
    `/api/brands/${brandId}/products/${productId}`,
    { method: 'POST' }
  );
}

export function removeProductFromBrand(brandId: number, productId: number) {
  return apiFetch<BrandWithProducts>(
    `/api/brands/${brandId}/products/${productId}`,
    { method: 'DELETE' }
  );
}
