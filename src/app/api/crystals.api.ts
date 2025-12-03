import { apiFetch } from './_base';

// --- Tipos ---
export type Crystal = {
  id: number;
  glass: string;
};

export type CreateCrystalData = Omit<Crystal, 'id'>;

/**
 * Obtiene todos los cristales.
 */
export function getCrystals() {
  return apiFetch<Crystal[]>('/api/crystals');
}

/**
 * Obtiene un cristal por su ID.
 */
export function getCrystal(id: number) {
  return apiFetch<Crystal>(`/api/crystals/${id}`);
}

/**
 * Crea un nuevo cristal.
 */
export function createCrystal(data: CreateCrystalData) {
  return apiFetch<Crystal>('/api/crystals', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza un cristal existente.
 */
export function updateCrystal(id: number, data: CreateCrystalData) {
  return apiFetch<Crystal>(`/api/crystals/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina un cristal por su ID.
 */
export function deleteCrystal(id: number) {
  return apiFetch<Crystal>(`/api/crystals/${id}`, {
    method: 'DELETE',
  });
}
