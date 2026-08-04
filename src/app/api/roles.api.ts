import { apiFetch } from './_base';
import type { Role } from '@/lib/types';

/**
 * Obtiene todos los roles desde el backend.
 */
export function getRoles() {
  return apiFetch<Role[]>('/api/roles');
}

/**
 * Actualiza el markup (porcentaje de ganancia) de un rol específico.
 */
export function updateRoleMarkup(id: number, markup: number) {
  return apiFetch<Role>(`/api/roles/${id}`, {
    method: 'PATCH',
    body: { markup },
  });
}

export function updateRole(
  id: number,
  data: { markup: number; installationPriceProfileId?: number | null },
) {
  return apiFetch<Role>(`/api/roles/${id}`, {
    method: 'PATCH',
    body: data,
  });
}
