import { Role } from "@/app/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Función de ayuda para no repetir la lógica de las cabeceras
const getAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  return headers;
};

/**
 * Obtiene todos los roles desde el backend.
 */
export async function getRoles(token?: string): Promise<Role[]> {
  const res = await fetch(`${API_URL}/api/roles`, {
    cache: "no-store",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch roles");
  }
  
  return res.json();
}


export async function updateRoleMarkup(id: number, markup: number): Promise<Role> {
  const res = await fetch(`${API_URL}/api/roles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ markup }),
    credentials: 'include', // Importante para que el navegador envíe la cookie de sesión
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update role markup');
  }

  return res.json();
}