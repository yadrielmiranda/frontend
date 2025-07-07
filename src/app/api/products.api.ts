import {
  Product,
  CreateProductData,
  ProductWithBrands, // Importamos el nuevo tipo
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * ✅ NUEVA FUNCIÓN
 * Obtiene todos los productos y precarga las marcas asociadas a cada uno.
 */
export async function getProductsWithBrands(): Promise<ProductWithBrands[]> {
  const res = await fetch(`${API_URL}/api/products/with-brands`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch products with their brands");
  }
  return res.json();
}

/**
 * Obtiene todos los productos (sin relaciones).
 */
export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }
  return res.json();
}

/**
 * Obtiene un único producto por su ID.
 */
export async function getProduct(id: number): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch product");
  }
  return res.json();
}

/**
 * Crea un nuevo producto.
 */
export async function createProduct(productData: CreateProductData): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create product');
  }
  return res.json();
}

/**
 * Actualiza un producto existente.
 */
export async function updateProduct(id: number, productData: CreateProductData): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update product');
  }
  return res.json();
}

/**
 * Elimina un producto por su ID.
 */
export async function deleteProduct(id: number): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete product');
  }
  return res.json();
}
