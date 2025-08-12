export interface PricingRule {
  id: number;
  idBrand: number;
  idProduct: number;
  idSystem: number;
  idConfig: number;
  idCrystal: number;
  costoA: number;
  costoB: number;
  costoC: number;
  // Propiedades de relación para mostrar en la tabla
  brand?: { name: string };
  product?: { name:string };
  system?: { name: string };
  config?: { conf: string };
  crystal?: { glass: string };
}

export type CreatePricingRuleData = Omit<PricingRule, 'id'>;
export type UpdatePricingRuleData = Partial<CreatePricingRuleData>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Obtener todas las reglas de precios
export async function getPricingRules(token?: string): Promise<PricingRule[]> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  const res = await fetch(`${API_URL}/api/pricing-rules`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    throw new Error("Failed to fetch pricing rules");
  }
  return res.json();
}

// Obtener una única regla de precios por ID
export async function getPricingRule(id: number, token?: string): Promise<PricingRule> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  const res = await fetch(`${API_URL}/api/pricing-rules/${id}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    throw new Error("Failed to fetch pricing rule");
  }
  return res.json();
}

// Crear una nueva regla de precios
export async function createPricingRule(data: CreatePricingRuleData): Promise<PricingRule> {
  const res = await fetch(`${API_URL}/api/pricing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create pricing rule');
  }
  return res.json();
}

// Actualizar una regla de precios
export async function updatePricingRule(id: number, data: UpdatePricingRuleData): Promise<PricingRule> {
  const res = await fetch(`${API_URL}/api/pricing-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update pricing rule');
  }
  return res.json();
}

// Eliminar una regla de precios
export async function deletePricingRule(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/pricing-rules/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete pricing rule');
  }
}