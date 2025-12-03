import { apiFetch } from './_base';
import type { Product, CreateProductData, ProductWithBrands } from './types';

/**
 * ✅ Obtiene todos los productos y precarga las marcas asociadas a cada uno.
 */
export function getProductsWithBrands() {
  return apiFetch<ProductWithBrands[]>('/api/products/with-brands');
}

/**
 * Obtiene todos los productos (sin relaciones).
 */
export function getProducts() {
  return apiFetch<Product[]>('/api/products');
}

/**
 * Obtiene un único producto por su ID.
 */
export function getProduct(id: number) {
  return apiFetch<Product>(`/api/products/${id}`);
}

/**
 * Crea un nuevo producto.
 */
export function createProduct(productData: CreateProductData) {
  return apiFetch<Product>('/api/products', {
    method: 'POST',
    body: productData,
  });
}

/**
 * Actualiza un producto existente.
 */
export function updateProduct(id: number, productData: CreateProductData) {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'PATCH',
    body: productData,
  });
}

/**
 * Elimina un producto por su ID.
 */
export function deleteProduct(id: number) {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'DELETE',
  });
}
