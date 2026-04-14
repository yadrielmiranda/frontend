import { apiFetch } from "./_base";
import type {
  EstimateWithRelations,
  CreateEstimateData,
  UpdateEstimateData,
  CreatePieceData,
} from "../../lib/types";

export interface CalculatedPiece extends CreatePieceData {
  id?: number;
  rate: number;
  price: number;
  markup: number;
  subtotal: number;
  netProfit: number;
  dealerMarkup: number;
  customerPrice: number;
  customerSubtotal: number;
  netProfitD: number;
  dpPosPsf?: number | null;
  dpNegPsf?: number | null;
}

export type ValidateReason = "NOT_RATED" | "OVERSIZE";

export interface ValidatePieceResponse {
  ok: boolean;
  reason?: ValidateReason;
  dpPos?: number;
  dpNeg?: number;
  screws?: number;
  usedRange?: { w: [number, number]; h: [number, number] };
  suggestion?: {
    maxWidthIn?: number;
    maxHeightIn?: number;
    minWidthIn?: number;
    minHeightIn?: number;
  };
  belowMinimum?: boolean;
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

export function calculatePiece(data: CreatePieceData) {
  return apiFetch<CalculatedPiece>("/api/estimates/calculate-piece", {
    method: "POST",
    body: data,
  });
}

export function validatePiece(data: ValidatePieceRequest) {
  return apiFetch<ValidatePieceResponse>("/api/estimates/preview-dimension", {
    method: "POST",
    body: data,
  });
}

export function getEstimate(id: number) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${id}`);
}

export function getEstimates() {
  return apiFetch<EstimateWithRelations[]>(`/api/estimates`).catch((err) => {
    console.error("Error in getEstimates:", err);
    return [] as EstimateWithRelations[];
  });
}

export function createEstimate(data: CreateEstimateData) {
  return apiFetch<EstimateWithRelations>("/api/estimates", {
    method: "POST",
    body: data,
  });
}

export function updateEstimate(id: number, data: UpdateEstimateData) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteEstimate(id: number) {
  return apiFetch<void>(`/api/estimates/${id}`, {
    method: "DELETE",
  });
}