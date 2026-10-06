import { apiFetch } from "./_base";
import type { Crystal, MuntinPattern, MuntinType } from "@/lib/types";

export type SystemMuntinTarget = { configId: number; crystalId: number };
export type SystemMuntinRuleSettings = {
  availability: "ALL" | "SELECTED";
  allowedTypeIds: number[];
};
export type SystemMuntinRule = SystemMuntinRuleSettings & {
  id: number;
  patternId: number;
  targets: SystemMuntinTarget[];
};
export type SystemMuntinsManage = {
  system: { id: number; name: string };
  configs: { id: number; conf: string }[];
  crystals: Crystal[];
  patterns: MuntinPattern[];
  types: MuntinType[];
  rules: SystemMuntinRule[];
};
export type ApplySystemMuntinsData = {
  patternId: number;
  targets: SystemMuntinTarget[];
  availability: "NONE" | "ALL" | "SELECTED";
  allowedTypeIds: number[];
};

export function getSystemMuntins(systemId: number) {
  return apiFetch<SystemMuntinsManage>(`/api/systems/${systemId}/muntins`, { cache: "no-store" });
}

export function applySystemMuntins(systemId: number, data: ApplySystemMuntinsData) {
  return apiFetch<SystemMuntinsManage>(`/api/systems/${systemId}/muntins/apply`, { method: "POST", body: data });
}

export function updateSystemMuntinRule(systemId: number, ruleId: number, data: SystemMuntinRuleSettings) {
  return apiFetch<SystemMuntinsManage>(`/api/systems/${systemId}/muntins/rules/${ruleId}`, { method: "PATCH", body: data });
}

export function deleteSystemMuntinRule(systemId: number, ruleId: number) {
  return apiFetch<SystemMuntinsManage>(`/api/systems/${systemId}/muntins/rules/${ruleId}`, { method: "DELETE" });
}
