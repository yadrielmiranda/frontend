import { apiFetch } from "./_base";
import type { MuntinPattern } from "@/lib/types";

export type CreateMuntinPatternData = {
  name: string;
  requiresLites?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
};

export type UpdateMuntinPatternData = Partial<CreateMuntinPatternData>;

export function getMuntinPatterns(params?: { active?: boolean }) {
  const query = new URLSearchParams();

  if (params?.active !== undefined) {
    query.set("active", String(params.active));
  }

  const q = query.toString();

  return apiFetch<MuntinPattern[]>(`/api/muntin-patterns${q ? `?${q}` : ""}`);
}

export function getMuntinPattern(id: number) {
  return apiFetch<MuntinPattern>(`/api/muntin-patterns/${id}`);
}

export function createMuntinPattern(data: CreateMuntinPatternData) {
  return apiFetch<MuntinPattern>("/api/muntin-patterns", {
    method: "POST",
    body: data,
  });
}

export function updateMuntinPattern(id: number, data: UpdateMuntinPatternData) {
  return apiFetch<MuntinPattern>(`/api/muntin-patterns/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteMuntinPattern(id: number) {
  return apiFetch<MuntinPattern>(`/api/muntin-patterns/${id}`, {
    method: "DELETE",
  });
}