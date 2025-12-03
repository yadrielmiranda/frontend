import { apiFetch } from './_base';

// --- Tipos ---
export type Tint = {
  id: number;
  color: string;
};

export type CreateTintData = Omit<Tint, 'id'>;

/**
 * Obtiene todos los tonos (tints).
 */
export function getTints() {
  return apiFetch<Tint[]>('/api/tints');
}

/**
 * Obtiene un tono específico por su ID.
 */
export function getTint(id: number) {
  return apiFetch<Tint>(`/api/tints/${id}`);
}

/**
 * Crea un nuevo tono.
 */
export function createTint(data: CreateTintData) {
  return apiFetch<Tint>('/api/tints', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza un tono existente.
 */
export function updateTint(id: number, data: CreateTintData) {
  return apiFetch<Tint>(`/api/tints/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina un tono por su ID.
 */
export function deleteTint(id: number) {
  return apiFetch<Tint>(`/api/tints/${id}`, {
    method: 'DELETE',
  });
}
