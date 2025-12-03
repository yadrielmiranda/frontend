import { apiFetch } from './_base';

// --- Tipos ---
export type CreateConfigData = {
  conf: string;
  idProduct: number;
};

export type UpdateConfigData = Partial<CreateConfigData>;

/**
 * Obtiene todas las configuraciones (incluye el producto asociado).
 */
export function getConfigs() {
  return apiFetch<any[]>('/api/configs');
}

/**
 * Obtiene una configuración específica por ID.
 */
export function getConfig(id: number) {
  return apiFetch<any>(`/api/configs/${id}`);
}

/**
 * Crea una nueva configuración.
 */
export function createConfig(data: CreateConfigData) {
  return apiFetch<any>('/api/configs', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza una configuración existente.
 */
export function updateConfig(id: number, data: UpdateConfigData) {
  return apiFetch<any>(`/api/configs/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina una configuración.
 */
export function deleteConfig(id: number) {
  return apiFetch<{ success: boolean }>(`/api/configs/${id}`, {
    method: 'DELETE',
  });
}
