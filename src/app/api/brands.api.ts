const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- Type Definitions ---
export type Product = {
  id: number;
  name: string;
};

export type BrandProduct = {
  idBrand: number;
  idProduct: number;
  product: Product;
};

export type Brand = {
  id: number;
  name: string;
};

export type BrandWithProducts = Brand & {
  brandProducts: BrandProduct[];
};

export type CreateBrandData = Omit<Brand, 'id'>;


// --- Brand Fetching Functions ---

export async function getBrands(): Promise<Brand[]> {
  const res = await fetch(`${API_URL}/api/brands`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch brands");
  }
  return res.json();
}

export async function getBrandsWithProducts(): Promise<BrandWithProducts[]> {
  const res = await fetch(`${API_URL}/api/brands/with-products`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch brands with their products");
  }
  return res.json();
}


export async function getBrand(id: number): Promise<Brand> {
  const res = await fetch(`${API_URL}/api/brands/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch brand");
  }
  return res.json();
}

export async function getBrandWithProducts(id: number): Promise<BrandWithProducts> {
  const res = await fetch(`${API_URL}/api/brands/${id}/products`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch brand with products");
  }
  return res.json();
}


// --- Brand Mutation Functions ---

export async function createBrand(data: CreateBrandData): Promise<Brand> {
  const res = await fetch(`${API_URL}/api/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create brand');
  }
  return res.json();
}

export async function updateBrand(id: number, data: CreateBrandData): Promise<Brand> {
  const res = await fetch(`${API_URL}/api/brands/${id}`, {
    method: "PATCH",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update brand');
  }
  return res.json();
}

export async function deleteBrand(id: number): Promise<Brand> {
  const res = await fetch(`${API_URL}/api/brands/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete brand');
  }
  return res.json();
}


// --- Brand-Product Relationship Functions ---

export async function addProductToBrand(brandId: number, productId: number): Promise<BrandWithProducts> {
  const res = await fetch(`${API_URL}/api/brands/${brandId}/products/${productId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to add product to brand");
  }
  return res.json();
};

export async function removeProductFromBrand(brandId: number, productId: number): Promise<BrandWithProducts> {
  const res = await fetch(`${API_URL}/api/brands/${brandId}/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to remove product from brand");
  }
  return res.json();
};
