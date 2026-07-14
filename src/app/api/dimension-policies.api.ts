// src/app/api/dimension-policies.api.ts
import { apiFetch } from './_base';
import type { DimensionRuleType } from '@/lib/types';

// ========================================
// Tipos
// ========================================
export type PolicyListItem = {
  id: number;
  idSystem: number;
  idConfig: number;
  idCrystal: number;
  idReinforcementOption?: number | null;

  sizeBasis: 'FRAME' | 'DLO';
  roundingRule: 'ROUND_UP_TO_NEXT' | 'NEAREST';
  notes?: string | null;
  isActive: boolean;

  systemName: string;
  configName: string;
  crystalName: string;
  reinforcementName?: string | null;
};

export type PolicyDetail = PolicyListItem & {
  rules?: RuleRow[];
};

export type CreatePolicyData = {
  idSystem: number;
  idConfig: number;
  idCrystal: number;
  idReinforcementOption?: number | null;

  sizeBasis: 'FRAME' | 'DLO';
  roundingRule: 'ROUND_UP_TO_NEXT' | 'NEAREST';
  notes?: string;
  isActive?: boolean;
};

//FORMA DE LA REGLA (fila única)
export type RuleRow = {
  ruleType?: DimensionRuleType;
  widthIn: number;
  heightIn: number;
  dpPosPsf: number;
  dpNegPsf: number;
  screws?: number;
  note?: string;
};

// ========================================
// POLICIES CRUD
// ========================================
export function getPolicies(params?: {
  idSystem?: number;
  idConfig?: number;
  idCrystal?: number;
  idReinforcementOption?: number | null;
  activeOnly?: boolean;
}) {
  const search = new URLSearchParams();

  if (params?.idSystem != null) {
    search.append('idSystem', String(params.idSystem));
  }

  if (params?.idConfig != null) {
    search.append('idConfig', String(params.idConfig));
  }

  if (params?.idCrystal != null) {
    search.append('idCrystal', String(params.idCrystal));
  }

  if (params?.idReinforcementOption != null) {
    search.append(
      'idReinforcementOption',
      String(params.idReinforcementOption),
    );
  }

  if (params?.activeOnly) {
    search.append('activeOnly', 'true');
  }

  const qs = search.toString();

  return apiFetch<PolicyListItem[]>(
    `/api/dimension-policies${qs ? `?${qs}` : ''}`,
  );
}

export function getPolicy(id: number) {
  return apiFetch<PolicyDetail>(`/api/dimension-policies/${id}`);
}

export function createPolicy(policyData: CreatePolicyData) {
  return apiFetch<PolicyDetail>('/api/dimension-policies', {
    method: 'POST',
    body: policyData,
  });
}

export function updatePolicy(id: number, policyData: Partial<CreatePolicyData>) {
  return apiFetch<PolicyDetail>(`/api/dimension-policies/${id}`, {
    method: 'PATCH',
    body: policyData,
  });
}

export function deletePolicy(id: number) {
  return apiFetch<PolicyDetail>(`/api/dimension-policies/${id}`, {
    method: 'DELETE',
  });
}

// ========================================
// RULES BULK (CSV o tabla manual)
// ========================================
export function bulkUpsertRules(
  idPolicy: number,
  ruleType: DimensionRuleType,
  rows: RuleRow[],
) {
  return apiFetch<{ ok: boolean; count: number }>(
    `/api/dimension-policies/${idPolicy}/rules/bulk-upsert`,
    {
      method: 'POST',
      body: { ruleType, rows },
    },
  );
}

export function deleteRulesByType(
  idPolicy: number,
  ruleType: DimensionRuleType,
) {
  return apiFetch<{
    ok: boolean;
    ruleType: DimensionRuleType;
    deletedCount: number;
  }>(
    `/api/dimension-policies/${idPolicy}/rules/${ruleType}`,
    {
      method: 'DELETE',
    },
  );
}
