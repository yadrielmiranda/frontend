import { GlobalParameter, UpdateGlobalParameterData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Obtiene todos los parámetros globales. Requiere token de admin.
 * @param token Token JWT para llamadas desde el servidor (opcional).
 */
export async function getGlobalParameters(token?: string): Promise<GlobalParameter[]> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }

  const res = await fetch(`${API_URL}/api/global-parameters`, {
    cache: "no-store",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch global parameters. You might not have admin rights.");
  }
  return res.json();
}

/**
 * Actualiza un parámetro global por su clave.
 * @param key La clave del parámetro a actualizar (ej. "SALES_TAX").
 * @param data Los nuevos datos para el parámetro.
 */
export async function updateGlobalParameter(key: string, data: UpdateGlobalParameterData): Promise<GlobalParameter> {
  const res = await fetch(`${API_URL}/api/global-parameters/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Para enviar la cookie de sesión desde el cliente
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update global parameter');
  }
  return res.json();
}
