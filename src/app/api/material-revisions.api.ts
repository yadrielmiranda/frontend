import { apiFetch } from "./_base";
import type { CreatePieceData } from "@/lib/types";
import type { CalculatedPiece } from "./estimates.api";

export type MaterialRevisionStatus = "DRAFT" | "PENDING_APPROVAL" | "AWAITING_SIGNATURE" | "APPLIED" | "REJECTED" | "CANCELED";
export type MaterialRevisionSummary = {
  material: string; installation: string; servicesAndFees: string; projectTotal: string;
  customerProjectTotal?: string; customerTotalIncomplete?: boolean;
  paid: string; approvedCredit: string; balance: string; creditBalance: string;
  provisionalInstallation: boolean;
};
export type MaterialRevisionItem = {
  key: string; action: "ADD" | "UPDATE"; originalPieceId: number | null;
  label: string; originalLabel: string | null; changeDescription: string[];
  input: CreatePieceData; price: string; subtotal: string;
  customerPrice?: string; customerSubtotal?: string;
};
export type MaterialRevision = {
  id: number; version: number; status: MaterialRevisionStatus; reason: string;
  createdAt: string; submittedAt: string | null; approvedAt: string | null;
  appliedAt: string | null; closedAt: string | null; requiresSignature: boolean;
  canEdit: boolean; canApprove: boolean; canCancel: boolean;
  original: MaterialRevisionSummary; revised: MaterialRevisionSummary | null;
  items: MaterialRevisionItem[];
};
export type MaterialRevisionsData = {
  estimateId: number; estimateNumber: string; orderId: number | null; installationId: number | null;
  installationRevisionId?: number | null;
  isOwner: boolean; canBegin: boolean; canReviseExisting: boolean; dealerPricing: boolean;
  defaultDealerMarkup: number; canRequestSignature: boolean; unavailableReason: string | null;
  pieces: Array<{ id: number; label: string; input: CreatePieceData }>;
  current: MaterialRevision | null; history: MaterialRevision[];
};
export type MaterialRevisionPieceInput = { originalPieceId?: number; itemKey?: string; piece: CreatePieceData };
const url = (id: number) => `/api/estimates/${id}/material-revisions`;
export const getMaterialRevisions = (id: number) => apiFetch<MaterialRevisionsData>(url(id), { cache: "no-store" });
export const beginMaterialRevision = (id: number, reason: string, factoryNotSentConfirmed: boolean) =>
  apiFetch<MaterialRevisionsData>(url(id), { method: "POST", body: { reason, factoryNotSentConfirmed }, timeoutMs: 120000 });
export const calculateMaterialRevisionPiece = (id: number, revisionId: number, input: MaterialRevisionPieceInput) =>
  apiFetch<CalculatedPiece>(`${url(id)}/${revisionId}/calculate-piece`, { method: "POST", body: input, timeoutMs: 120000 });
export const saveMaterialRevisionPiece = (id: number, revisionId: number, input: MaterialRevisionPieceInput) =>
  apiFetch<MaterialRevisionsData>(`${url(id)}/${revisionId}/pieces`, { method: "POST", body: input, timeoutMs: 120000 });
export const removeMaterialRevisionItem = (id: number, revisionId: number, key: string) =>
  apiFetch<MaterialRevisionsData>(`${url(id)}/${revisionId}/items/${encodeURIComponent(key)}`, { method: "DELETE", timeoutMs: 120000 });
export const submitMaterialRevision = (id: number, revisionId: number, accepted: boolean) =>
  apiFetch<MaterialRevisionsData>(`${url(id)}/${revisionId}/submit`, { method: "POST", body: { accepted }, timeoutMs: 120000 });
export const decideMaterialRevision = (id: number, revisionId: number, decision: "APPROVE" | "REJECT" | "CANCEL", accepted = false) =>
  apiFetch<MaterialRevisionsData>(`${url(id)}/${revisionId}/decision`, { method: "POST", body: { decision, accepted }, timeoutMs: 120000 });
