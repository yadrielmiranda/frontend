import { apiFetch } from './_base';
import type {
  EstimateWithRelations,
  CreateEstimateData,
  UpdateEstimateData,
  CreatePieceData,
  Piece,
} from './types';

// --- Tipo de respuesta del cálculo ---
export interface CalculatedPiece extends Piece {}

// --- Tipos para validación de dimensiones ---
export type ValidateReason = 'NOT_RATED' | 'OVERSIZE';

export interface ValidatePieceResponse {
  ok: boolean;
  reason?: ValidateReason;
  dpPos?: number;
  dpNeg?: number;
  screws?: number; // cantidad de tornillos
  usedRange?: { w: [number, number]; h: [number, number] };
  suggestion?: {
    maxWidthIn?: number;
    maxHeightIn?: number;
    minWidthIn?: number;
    minHeightIn?: number;
  };
  belowMinimum?: boolean;   // 👈 nuevo flag
  note?: string;
}

export interface ValidatePieceRequest {
  idSyst: number;
  idConf: number;
  idCryst: number;
  width: number;
  height: number;
  heightLeft?: number;
  heightRight?: number;
  legHeight?: number;
}


/**
 * Calcula las métricas de una pieza sin guardarla.
 */
export function calculatePiece(data: CreatePieceData) {
  return apiFetch<CalculatedPiece>('/api/estimates/calculate-piece', {
    method: 'POST',
    body: data,
  });
}

/**
 * Valida dimensiones contra DimensionPolicy (pre-chequeo).
 * El backend devuelve 200 con ok:true/false.
 */
export function validatePiece(data: ValidatePieceRequest) {
  return apiFetch<ValidatePieceResponse>('/api/estimates/preview-dimension', {
    method: 'POST',
    body: data,
  });
}

/**
 * Obtiene un estimado por ID (SSR opcional con token).
 */
export function getEstimate(id: number, token?: string) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${id}`);
}

/**
 * Obtiene todos los estimados (SSR opcional con token).
 */
export function getEstimates(token?: string) {
  return apiFetch<EstimateWithRelations[]>(`/api/estimates`).catch(
    (err) => {
      // Mantén tu tolerancia a fallos original
      console.error('Error in getEstimates:', err);
      return [] as EstimateWithRelations[];
    }
  );
}

/**
 * Crea un nuevo estimado (cliente).
 */
export function createEstimate(data: CreateEstimateData) {
  return apiFetch<EstimateWithRelations>('/api/estimates', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza un estimado (cliente).
 */
export function updateEstimate(id: number, data: UpdateEstimateData) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina un estimado (cliente).
 */
export function deleteEstimate(id: number) {
  return apiFetch<void>(`/api/estimates/${id}`, {
    method: 'DELETE',
  });
}
