const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getBrands() {
    const data = await fetch(`${API_URL}/api/brands`,{
        cache: "no-store"
    });
    return await data.json()
}

export async function getBrand(id : any) {
    const data = await fetch(`${API_URL}/api/brands/${id}`, {
       cache: "no-store" 
    });
    return await data.json()
}

export async function createBrand(productData: any) {

    const res = await fetch(`${API_URL}/api/brands`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
    });
    const data = await res.json()
    console.log(data)
}

export async function updateBrand(id: any, productData: any) {
    const res = await fetch(`${API_URL}/api/brands/${id}`,{
        method: "PATCH",
        headers: {
           'Content-Type': 'application/json',
        },
         body: JSON.stringify(productData)
    })  
}

export async function deleteBrand(id: any) {
    const res = await fetch(`${API_URL}/api/brands/${id}`, {
        method: 'DELETE',
    });
   const data = await res.json()
}

export const getBrandWithProducts = async (id: number) => {
  const res = await fetch(`${API_URL}/api/brands/${id}/products`,{
    cache: "no-store"
  });
  if (!res.ok) {
    // Puedes manejar el error como prefieras
    return null;
  }
  return res.json();
};

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