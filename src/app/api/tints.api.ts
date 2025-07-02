const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type Tint = {
  id: number;
  color: string;
};

export type CreateTintData = Omit<Tint, 'id'>;

export async function getTints(): Promise<Tint[]> {
  const res = await fetch(`${API_URL}/api/tints`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tints");
  return res.json();
}

export async function getTint(id: number): Promise<Tint> {
  const res = await fetch(`${API_URL}/api/tints/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch tint");
  }
  return res.json();
}

export async function createTint(data: CreateTintData): Promise<Tint> {
  const res = await fetch(`${API_URL}/api/tints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create tint');
  }
  return res.json();
}

export async function updateTint(id: number, data: CreateTintData): Promise<Tint> {
  const res = await fetch(`${API_URL}/api/tints/${id}`, {
    method: "PATCH",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update tint');
  }
  return res.json();
}

export async function deleteTint(id: number): Promise<Tint> {
  const res = await fetch(`${API_URL}/api/tints/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete tint');
  }
  return res.json();
}
