import { API_URL, apiFetch } from "./_base";
import type { EstimateWithRelations } from "@/lib/types";

export type ContractInfo = {
  id: string;
  name: string;
  version: number;
  sizeBytes: number;
  createdAt: string;
};
export type AgreementInfo = {
  id: string;
  revision: number;
  kind: "AGREEMENT" | "CHANGE_ORDER";
  baseAgreementId: string | null;
  changeOrderNumber: number | null;
  pricingMode: "detailed" | "total";
  contentHash: string;
  contract: ContractInfo;
  signedAt: string | null;
  signedAtLabel: string | null;
  signerName: string | null;
  invalidatedAt: string | null;
  ready: boolean;
  createdAt: string;
  state:
    | "PREPARING"
    | "AWAITING_SIGNATURE"
    | "SIGNED"
    | "REQUIRES_NEW_SIGNATURE";
};
export type AgreementStatus = {
  current: AgreementInfo | null;
  history: AgreementInfo[];
  defaultContract?: ContractInfo | null;
  consentText?: string;
  nextSignatureKind?: "AGREEMENT" | "CHANGE_ORDER" | null;
  changeOrder?: ChangeOrderSummary | null;
  paymentsEnabled?: boolean;
};
export type ChangeOrderSummary = {
  number: number;
  baseAgreementId: string;
  baseRevision: number;
  previousTotal: string;
  newTotal: string;
  difference: string;
  previousIncomplete: boolean;
  newIncomplete: boolean;
  changedCharges: string[];
  items: Array<{
    description: string;
    before: { amount: string | null } | null;
    after: { amount: string | null } | null;
  }>;
};
export type SignatureStrokes = { x: number; y: number }[][];

export const getDealerContract = () =>
  apiFetch<ContractInfo | null>("/api/contracts/me", { cache: "no-store" });
export function uploadDealerContract(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ContractInfo>("/api/contracts/me", {
    method: "POST",
    body: form,
    timeoutMs: 60000,
  });
}
export const removeDealerContract = () =>
  apiFetch("/api/contracts/me", { method: "DELETE" });
export const dealerContractPdfUrl = (id: string) =>
  `${API_URL}/api/contracts/me/${id}/pdf`;
export const getEstimateAgreement = (
  id: number,
  pricingMode: "detailed" | "total",
) =>
  apiFetch<AgreementStatus>(`/api/contracts/estimates/${id}`, {
    query: { pricingMode },
    cache: "no-store",
  });
export const prepareEstimateAgreement = (
  id: number,
  pricingMode: "detailed" | "total",
  useLatestContract = false,
) =>
  apiFetch<{ current: AgreementInfo | null }>(
    `/api/contracts/estimates/${id}`,
    {
      method: "POST",
      body: { pricingMode, useLatestContract },
      timeoutMs: 120000,
    },
  );
export const ownerAgreementPdfUrl = (
  estimateId: number,
  id: string,
  kind: "contract" | "quote" | "signed",
) =>
  `${API_URL}/api/contracts/estimates/${estimateId}/agreements/${id}/${kind}/pdf`;
export const publicAgreementPdfUrl = (
  token: string,
  id: string,
  kind: "contract" | "quote" | "signed",
) =>
  `${API_URL}/api/public/contracts/${encodeURIComponent(token)}/agreements/${id}/${kind}/pdf`;
export const getPublicAgreement = (token: string, agreementId: string) =>
  apiFetch<AgreementStatus>(
    `/api/public/contracts/${encodeURIComponent(token)}`,
    { query: { agreementId }, cache: "no-store", suppressAuthEvent: true },
  );
export const getAgreementSnapshot = (token: string, id: string) =>
  apiFetch<EstimateWithRelations>(
    `/api/public/contracts/${encodeURIComponent(token)}/agreements/${id}/snapshot`,
    { cache: "no-store", suppressAuthEvent: true },
  );
export const signAgreement = (
  token: string,
  agreement: AgreementInfo,
  input: {
    signerName: string;
    accepted: boolean;
    signature: SignatureStrokes;
  },
) =>
  apiFetch<{ current: AgreementInfo }>(
    `/api/public/contracts/${encodeURIComponent(token)}/agreements/${agreement.id}/sign`,
    {
      method: "POST",
      body: { ...input, contentHash: agreement.contentHash },
      suppressAuthEvent: true,
      timeoutMs: 120000,
    },
  );
