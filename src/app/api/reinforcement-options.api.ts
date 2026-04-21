import { apiFetch } from "./_base";
import type { ReinforcementOption } from "../../lib/types";

export type CreateReinforcementOptionData = Omit<
  ReinforcementOption,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateReinforcementOptionData = Partial<
  CreateReinforcementOptionData
>;

export function getReinforcementOptions() {
  return apiFetch<ReinforcementOption[]>("/api/reinforcement-options");
}

export function getReinforcementOption(id: number) {
  return apiFetch<ReinforcementOption>(`/api/reinforcement-options/${id}`);
}

export function createReinforcementOption(data: CreateReinforcementOptionData) {
  return apiFetch<ReinforcementOption>("/api/reinforcement-options", {
    method: "POST",
    body: data,
  });
}

export function updateReinforcementOption(
  id: number,
  data: UpdateReinforcementOptionData
) {
  return apiFetch<ReinforcementOption>(`/api/reinforcement-options/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteReinforcementOption(id: number) {
  return apiFetch<ReinforcementOption>(`/api/reinforcement-options/${id}`, {
    method: "DELETE",
  });
}