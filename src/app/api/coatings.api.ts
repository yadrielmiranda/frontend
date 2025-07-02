const API_URL = process.env.NEXT_PUBLIC_API_URL;

// El tipo de dato para un Coating
export type Coating = {
  id: number;
  name: string; 
};

// Para la creación, no necesitamos el 'id'
export type CreateCoatingData = Omit<Coating, 'id'>;

/**
 * Obtiene todos los coatings desde la API.
 */
export async function getCoatings(): Promise<Coating[]> {
  const res = await fetch(`${API_URL}/api/coatings`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch coatings");
  }
  return res.json();
}

/**
 * Obtiene un único coating por su ID.
 * @param id - El ID del coating a obtener.
 */
export async function getCoating(id: number): Promise<Coating> {
  const res = await fetch(`${API_URL}/api/coatings/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch coating");
  }
  return res.json();
}

/**
 * Crea un nuevo coating.
 * @param coatingData - Los datos del coating a crear.
 */
export async function createCoating(coatingData: CreateCoatingData): Promise<Coating> {
  const res = await fetch(`${API_URL}/api/coatings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coatingData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create coating');
  }
  return res.json();
}

/**
 * Actualiza un coating existente.
 * @param id - El ID del coating a actualizar.
 * @param coatingData - Los nuevos datos para el coating.
 */
export async function updateCoating(id: number, coatingData: CreateCoatingData): Promise<Coating> {
  const res = await fetch(`${API_URL}/api/coatings/${id}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coatingData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update coating');
  }
  return res.json();
}

/**
 * Elimina un coating por su ID.
 * @param id - El ID del coating a eliminar.
 */
export async function deleteCoating(id: number): Promise<Coating> {
  const res = await fetch(`${API_URL}/api/coatings/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete coating');
  }
  return res.json();
}
