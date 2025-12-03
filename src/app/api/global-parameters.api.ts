import { apiFetch } from './_base';
import type { GlobalParameter, UpdateGlobalParameterData } from './types';

/**
 * Obtiene todos los parámetros globales.
 * Requiere token de admin (para SSR o llamadas protegidas).
 */
export function getGlobalParameters(token?: string) {
  return apiFetch<GlobalParameter[]>('/api/global-parameters', { token });
}

/**
 * Actualiza un parámetro global por su clave.
 * @param key La clave del parámetro a actualizar (ej. "SALES_TAX").
 * @param data Los nuevos datos para el parámetro.
 */
export function updateGlobalParameter(key: string, data: UpdateGlobalParameterData) {
  return apiFetch<GlobalParameter>(`/api/global-parameters/${key}`, {
    method: 'PATCH',
    body: data,
  });
}
