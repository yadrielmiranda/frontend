
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type Fcolor = {
  id: number;
  color: string;
};

// Para la creación, no necesitamos el 'id'
export type CreateFcolorData = Omit<Fcolor, 'id'>;



export async function getFColors(): Promise<Fcolor[]> {
  const res = await fetch(`${API_URL}/api/framecolors`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch frame colors");
  }
  return res.json();
}

export async function getFColor(id: number): Promise<Fcolor> {
  const res = await fetch(`${API_URL}/api/framecolors/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    // Si el backend devuelve un 404, aquí se lanzará el error
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch frame color");
  }
  return res.json();
}

export async function createFColor(colorData: CreateFcolorData): Promise<Fcolor> {
  const res = await fetch(`${API_URL}/api/framecolors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(colorData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create color');
  }
  return res.json();
}

export async function updateFColor(id: number, colorData: CreateFcolorData): Promise<Fcolor> {
  const res = await fetch(`${API_URL}/api/framecolors/${id}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(colorData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update color');
  }
  return res.json();
}

export async function deleteFColor(id: number): Promise<Fcolor> {
  const res = await fetch(`${API_URL}/api/framecolors/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete color');
  }
  return res.json();
}