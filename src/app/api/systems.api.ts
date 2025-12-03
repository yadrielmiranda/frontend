import { apiFetch } from './_base';
import type { System, SystemWithConfigs } from './types';

export type SystemData = {
  name: string;
  idBrand: number;
  idProduct: number;
};

export type UpdateSystemData = Partial<SystemData>;

/**
 * ✅ Obtiene todos los sistemas y precarga las configuraciones asociadas.
 */
export function getSystemsWithConfigs() {
  return apiFetch<SystemWithConfigs[]>('/api/systems/with-configs');
}

/**
 * Obtiene sistemas, opcionalmente filtrados por marca y producto.
 */
export function getSystems(params?: { idBrand?: number; idProduct?: number }) {
  const query = new URLSearchParams();
  if (params?.idBrand) query.append('brand', String(params.idBrand));
  if (params?.idProduct) query.append('product', String(params.idProduct));
  const q = query.toString();
  return apiFetch<System[]>(`/api/systems${q ? `?${q}` : ''}`);
}

/**
 * Obtiene un único sistema por su ID.
 */
export function getSystem(id: number) {
  return apiFetch<System>(`/api/systems/${id}`);
}

/**
 * Crea un nuevo sistema.
 */
export function createSystem(data: SystemData) {
  return apiFetch<System>('/api/systems', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza un sistema existente.
 */
export function updateSystem(id: number, data: UpdateSystemData) {
  return apiFetch<System>(`/api/systems/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina un sistema por su ID.
 */
export function deleteSystem(id: number) {
  return apiFetch<{ success: boolean }>(`/api/systems/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Obtiene un sistema con sus configuraciones asociadas.
 */
export function getSystemWithConfigs(systemId: number) {
  return apiFetch<SystemWithConfigs>(`/api/systems/${systemId}/configs`);
}

/**
 * Obtiene las configuraciones disponibles para un sistema.
 */
export function getAvailableConfigs(systemId: number) {
  return apiFetch<any[]>(`/api/systems/${systemId}/available-configs`);
}

/**
 * Asocia una configuración a un sistema.
 */
export function addConfigToSystem(systemId: number, configId: number) {
  return apiFetch<SystemWithConfigs>(
    `/api/systems/${systemId}/configs/${configId}`,
    { method: 'POST' }
  );
}

/**
 * Desasocia una configuración de un sistema.
 */
export function removeConfigFromSystem(systemId: number, configId: number) {
  return apiFetch<SystemWithConfigs>(
    `/api/systems/${systemId}/configs/${configId}`,
    { method: 'DELETE' }
  );
}
