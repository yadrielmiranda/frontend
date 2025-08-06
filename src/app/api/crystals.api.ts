const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type Crystal = {
  id: number;
  glass: string;
};

export type CreateCrystalData = Omit<Crystal, 'id'>;

export async function getCrystals(): Promise<Crystal[]> {
  const res = await fetch(`${API_URL}/api/crystals`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch crystals");
  return res.json();
}

export async function getCrystal(id: number): Promise<Crystal> {
  const res = await fetch(`${API_URL}/api/crystals/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch crystal");
  }
  return res.json();
}

export async function createCrystal(data: CreateCrystalData): Promise<Crystal> {
  const res = await fetch(`${API_URL}/api/crystals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create crystal');
  }
  return res.json();
}

export async function updateCrystal(id: number, data: CreateCrystalData): Promise<Crystal> {
  const res = await fetch(`${API_URL}/api/crystals/${id}`, {
    method: "PATCH",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update crystal');
  }
  return res.json();
}

export async function deleteCrystal(id: number): Promise<Crystal> {
  const res = await fetch(`${API_URL}/api/crystals/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete crystal');
  }
  return res.json();
}
