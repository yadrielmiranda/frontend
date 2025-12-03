import { apiFetch } from './_base';
import type { Role } from '@/app/api/types';

/**
 * Obtiene todos los roles desde el backend.
 */
export function getRoles(token?: string) {
  return apiFetch<Role[]>('/api/roles', { token });
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
