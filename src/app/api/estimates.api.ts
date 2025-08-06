// La importación de 'cookies' se ha eliminado para que este archivo sea compatible con el cliente.
import {
  EstimateWithRelations,
  CreateEstimateData,
  UpdateEstimateData,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' ;

/**
 * Obtiene un único presupuesto por su ID.
 * Acepta un token opcional para ser llamado desde el servidor.
 */
export async function getEstimate(id: number, token?: string): Promise<EstimateWithRelations> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  const res = await fetch(`${API_URL}/api/estimates/${id}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    throw new Error("Failed to fetch estimate");
  }
  return res.json();
}

/**
 * Obtiene todos los presupuestos. También acepta un token para llamadas desde el servidor.
 */
export async function getEstimates(token?: string): Promise<EstimateWithRelations[]> {
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Cookie'] = `access_token=${token}`;
    }
    const response = await fetch(`${API_URL}/api/estimates`, {
      cache: 'no-store',
      headers,
    });
    if (!response.ok) throw new Error(`Failed to fetch estimates. Status: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error("Error in getEstimates function:", error);
    return [];
  }
}

/**
 * Crea un nuevo presupuesto. Se llama desde el cliente.
 */
export async function createEstimate(data: CreateEstimateData): Promise<EstimateWithRelations> {
  const response = await fetch(`${API_URL}/api/estimates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create estimate');
  }
  return response.json();
}

/**
 * Actualiza un presupuesto. Se llama desde el cliente.
 */
export async function updateEstimate(id: number, data: UpdateEstimateData): Promise<EstimateWithRelations> {
  const res = await fetch(`${API_URL}/api/estimates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // El navegador se encarga de enviar la cookie
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update estimate');
  }
  return res.json();
}

/**
 * Elimina un presupuesto por su ID. Se llama desde el cliente.
 */
export async function deleteEstimate(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/estimates/${id}`, {
      method: 'DELETE',
      credentials: 'include', // El navegador se encarga de enviar la cookie
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete estimate');
    }
}
