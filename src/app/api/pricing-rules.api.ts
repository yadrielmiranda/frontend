import { apiFetch } from './_base';

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
  // Relaciones opcionales para mostrar en tablas
  brand?: { name: string };
  product?: { name: string };
  system?: { name: string };
  config?: { conf: string };
  crystal?: { glass: string };
}

export type CreatePricingRuleData = Omit<PricingRule, 'id'>;
export type UpdatePricingRuleData = Partial<CreatePricingRuleData>;

/**
 * Obtiene todas las reglas de precios (SSR opcional con token).
 */
export function getPricingRules(token?: string) {
  return apiFetch<PricingRule[]>('/api/pricing-rules', { token });
}

/**
 * Obtiene una regla de precios por ID (SSR opcional con token).
 */
export function getPricingRule(id: number, token?: string) {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`, { token });
}

/**
 * Crea una nueva regla de precios.
 */
export function createPricingRule(data: CreatePricingRuleData) {
  return apiFetch<PricingRule>('/api/pricing-rules', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza una regla de precios existente.
 */
export function updatePricingRule(id: number, data: UpdatePricingRuleData) {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina una regla de precios por su ID.
 */
export function deletePricingRule(id: number) {
  return apiFetch<void>(`/api/pricing-rules/${id}`, {
    method: 'DELETE',
  });
}
