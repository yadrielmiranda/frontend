const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Funciones para Brands y Productos ---

export async function getBrands() {
    const response = await fetch(`${API_URL}/api/brands`,{
        cache: "no-store"
    });
    if (!response.ok) throw new Error("Error al obtener las marcas");
    return await response.json();
}

// Obtiene solo los datos básicos de la marca (para edición, etc.)
export async function getBrand(id: number) {
    const response = await fetch(`${API_URL}/api/brands/${id}`, {
       cache: "no-store" 
    });
    if (!response.ok) throw new Error("Error al obtener la marca");
    return await response.json();
}


export const getBrandWithProducts = async (id: number) => {
  const res = await fetch(`${API_URL}/api/brands/${id}/products`,{
    cache: "no-store"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: "Error al obtener la marca con sus productos" }));
    throw new Error(errorData.message);
  }
  return res.json();
};

// --- Funciones de mutación (create, update, delete) ---

export async function createBrand(brandData: { name: string }) {
    const res = await fetch(`${API_URL}/api/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
    });
    if (!res.ok) throw new Error("Error al crear la marca");
    return await res.json();
}

export async function updateBrand(id: number, brandData: { name: string }) {
    const res = await fetch(`${API_URL}/api/brands/${id}`,{
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
    });
    if (!res.ok) throw new Error("Error al actualizar la marca");
    return await res.json();
}

export async function deleteBrand(id: number) {
    const res = await fetch(`${API_URL}/api/brands/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error("Error al eliminar la marca");
    // DELETE a menudo no devuelve cuerpo, así que podemos retornar un estado de éxito
    return { success: true };}




export const addProductToBrand = async (brandId: number, productId: number) => {
  const res = await fetch(`${API_URL}/api/brands/${brandId}/products/${productId}`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to add product to brand");
  }
  return res.json();
};

export const removeProductFromBrand = async (brandId: number, productId: number) => {
  const res = await fetch(`${API_URL}/api/brands/${brandId}/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to remove product from brand");
  }
  return res.json();
};
