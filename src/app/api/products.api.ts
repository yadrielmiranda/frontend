import { apiFetch } from "./_base";
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductWithBrands,
} from "../../lib/types";

export function getProductsWithBrands() {
  return apiFetch<ProductWithBrands[]>("/api/products/with-brands");
}

export function getProducts() {
  return apiFetch<Product[]>("/api/products");
}

export function getProduct(id: number) {
  return apiFetch<Product>(`/api/products/${id}`);
}

export function createProduct(productData: CreateProductData) {
  return apiFetch<Product>("/api/products", {
    method: "POST",
    body: productData,
  });
}

export function updateProduct(id: number, productData: UpdateProductData) {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: "PATCH",
    body: productData,
  });
}

export function deleteProduct(id: number) {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: "DELETE",
  });
}