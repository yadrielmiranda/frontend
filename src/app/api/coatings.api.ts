import { apiFetch } from './_base';

// --- Type Definitions ---
export type Coating = {
  id: number;
  name: string;
};

export type CreateCoatingData = Omit<Coating, 'id'>;

/**
 * Obtiene todos los coatings.
 */
export function getCoatings() {
  return apiFetch<Coating[]>('/api/coatings');
}

/**
 * Obtiene un coating por ID.
 */
export function getCoating(id: number) {
  return apiFetch<Coating>(`/api/coatings/${id}`);
}

/**
 * Crea un nuevo coating.
 */
export function createCoating(coatingData: CreateCoatingData) {
  return apiFetch<Coating>('/api/coatings', {
    method: 'POST',
    body: coatingData,
  });
}

/**
 * Actualiza un coating existente.
 */
export function updateCoating(id: number, coatingData: CreateCoatingData) {
  return apiFetch<Coating>(`/api/coatings/${id}`, {
    method: 'PATCH',
    body: coatingData,
  });
}

/**
 * Elimina un coating por su ID.
 */
export function deleteCoating(id: number) {
  return apiFetch<Coating>(`/api/coatings/${id}`, {
    method: 'DELETE',
  });
}
