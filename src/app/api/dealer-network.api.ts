import { apiFetch } from './_base';

export type NetworkBusinessAction = {
  id: number; actorId: number | null; actorName: string; suspended: boolean; reason: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED' | 'WITHDRAWN' | 'SUPERSEDED';
  createdAt: string; reviewedAt: string | null; reviewNote: string | null;
};

export type NetworkMember = {
  id: number; username: string; firstName: string; lastName: string;
  email: string | null; phone: string | null; isActive: boolean;
  networkSuspended: boolean; networkAccessBlocked: boolean; networkSalesBlocked: boolean; canSuspend: boolean;
  canRequestSuspension: boolean; canReviewSuspension: boolean; canWithdrawRequest: boolean;
  businessAction: NetworkBusinessAction | null;
  parentDealerId: number | null; parentName: string | null;
  parentDealerMode: 'INTERNAL' | 'EXTERNAL' | null;
  level: number; levelLabel: string; dealerMode: 'INTERNAL' | 'EXTERNAL';
  canManage: boolean; markupPercent?: string; taxPercent?: string; subdealerEarningsMode?: 'AVAILABLE_PROFIT' | 'MARKUP' | null; subdealerEarningsPercent?: string | null;
};
export type DealerNetwork = { canCreate: boolean; level: string | null; defaultTaxPercent: string; members: NetworkMember[] };
export type NetworkAccountInput = {
  username: string; firstName: string; lastName: string; email: string; phone: string;
  password: string; street: string; city: string; state: string; postalCode: string;
  markupPercent: number; taxPercent: number; parentDealerId?: number; dealerMode?: 'INTERNAL' | 'EXTERNAL';
  subdealerEarningsMode?: 'AVAILABLE_PROFIT' | 'MARKUP'; subdealerEarningsPercent?: number;
};
export const getDealerNetwork = () => apiFetch<DealerNetwork>('/api/dealer-network');
export const createNetworkAccount = (body: NetworkAccountInput) => apiFetch<{ id: number }>('/api/dealer-network', { method: 'POST', body });
export const updateNetworkMarkup = (id: number, terms: Pick<NetworkAccountInput, 'markupPercent' | 'taxPercent' | 'dealerMode' | 'subdealerEarningsMode' | 'subdealerEarningsPercent'>) => apiFetch(`/api/dealer-network/${id}/markup`, { method: 'PATCH', body: terms });
export const setNetworkSuspension = (id: number, suspended: boolean, reason: string) => apiFetch(`/api/dealer-network/${id}/suspension`, { method: 'PATCH', body: { suspended, reason } });
export const requestNetworkSuspension = (id: number, suspended: boolean, reason: string) => apiFetch(`/api/dealer-network/${id}/suspension-requests`, { method: 'POST', body: { suspended, reason } });
export const reviewNetworkSuspension = (id: number, approve: boolean, reason?: string) => apiFetch(`/api/dealer-network/suspension-requests/${id}`, { method: 'PATCH', body: { approve, reason } });
export const withdrawNetworkSuspension = (id: number) => apiFetch(`/api/dealer-network/suspension-requests/${id}`, { method: 'DELETE' });
