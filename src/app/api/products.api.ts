const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Definición del tipo para un Producto
export type Product = {
  id: number;
  name: string;
  // Puedes añadir más campos aquí si los necesitas en el frontend
};

// Tipo para la creación de un producto, omitiendo el 'id'
export type CreateProductData = Omit<Product, 'id'>;

/**
 * Obtiene todos los productos desde la API.
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
 * @param id - El ID del producto a obtener.
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
 * @param productData - Los datos del producto a crear.
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
 * @param id - El ID del producto a actualizar.
 * @param productData - Los nuevos datos para el producto.
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
 * @param id - El ID del producto a eliminar.
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
