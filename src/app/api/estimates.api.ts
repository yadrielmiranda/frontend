import { apiFetch } from "./_base";
import type {
  EstimateWithRelations,
  CreateEstimateHeaderData,
  UpdateEstimateHeaderData,
  CreatePieceData,
} from "../../lib/types";

export interface CalculatedPiece extends CreatePieceData {
  id?: number;
  highBottom?: boolean;
  highBottomPercent?: number | null;
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
  idReinforcementOption?: number | null;

  width?: number;
  height: number;
  heightLeft?: number;
  heightRight?: number;
  legHeight?: number;

  doorWidth?: number;
  doorHeight?: number;
  leftSideliteWidth?: number;
  rightSideliteWidth?: number;
  leftPanels?: number;
  rightPanels?: number;
  panelCount?: number;
  horizontalHeights?: number[];
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

// crea inmediatamente el Estimate vacío
// y devuelve el Estimate persistido con su id y número.
export function initializeEstimate(
  data: CreateEstimateHeaderData,
) {
  return apiFetch<EstimateWithRelations>(
    "/api/estimates/initialize",
    {
      method: "POST",
      body: data,
    },
  );
}

// actualiza solamente el encabezado.
// Este endpoint no modifica las piezas guardadas.
export function updateEstimateHeader(
  estimateId: number,
  data: UpdateEstimateHeaderData,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/header`,
    {
      method: "PATCH",
      body: data,
    },
  );
}

// calcula y guarda una pieza nueva
// dentro de un Estimate ya persistido.
export function addEstimatePiece(
  estimateId: number,
  data: CreatePieceData,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/pieces`,
    {
      method: "POST",
      body: data,
    },
  );
}

// recalcula y reemplaza los datos
// de una pieza que ya pertenece al Estimate.
export function updateEstimatePiece(
  estimateId: number,
  pieceId: number,
  data: CreatePieceData,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/pieces/${pieceId}`,
    {
      method: "PATCH",
      body: data,
    },
  );
}

// elimina una pieza persistida
// y devuelve el Estimate con sus totales actualizados.
export function deleteEstimatePiece(
  estimateId: number,
  pieceId: number,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/pieces/${pieceId}`,
    {
      method: "DELETE",
    },
  );
}

export function applyGeneralDealerMarkup(
  estimateId: number,
  dealerMarkup: number,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/pieces/general-markup`,
    {
      method: "PATCH",
      body: {
        dealerMarkup,
      },
    },
  );
}

export type ApplyBulkPieceAttributeData = {
  idFC?: number;
  idTint?: number;
  idCoat?: number;
};

export function applyBulkPieceAttribute(
  estimateId: number,
  data: ApplyBulkPieceAttributeData,
) {
  return apiFetch<EstimateWithRelations>(
    `/api/estimates/${estimateId}/pieces/bulk-attribute`,
    {
      method: "PATCH",
      body: data,
    },
  );
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

export function deleteEstimate(id: number) {
  return apiFetch<void>(`/api/estimates/${id}`, {
    method: "DELETE",
  });
}

export function recalculateEstimate(id: number) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${id}/recalculate`, {
    method: "POST",
  });
}

export type EstimatePublicTokenResponse = {
  token: string;
  enabled: boolean;
};

export function getOrCreateEstimatePublicToken(id: number) {
  return apiFetch<EstimatePublicTokenResponse>(
    `/api/estimates/${id}/public-token`,
    {
      method: "POST",
    },
  );
}

export function getPublicEstimate(token: string) {
  return apiFetch<EstimateWithRelations>(
    `/api/public/estimates/${token}`,
    {
      cache: "no-store",
    },
  );
}