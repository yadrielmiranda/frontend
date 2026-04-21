import { apiFetch } from "./_base";
import type { PreparationOption } from "../../lib/types";

export type CreatePreparationOptionData = Omit<
  PreparationOption,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdatePreparationOptionData = Partial<CreatePreparationOptionData>;

export function getPreparationOptions() {
  return apiFetch<PreparationOption[]>("/api/preparation-options");
}

export function getPreparationOption(id: number) {
  return apiFetch<PreparationOption>(`/api/preparation-options/${id}`);
}

export function createPreparationOption(data: CreatePreparationOptionData) {
  return apiFetch<PreparationOption>("/api/preparation-options", {
    method: "POST",
    body: data,
  });
}

export function updatePreparationOption(
  id: number,
  data: UpdatePreparationOptionData
) {
  return apiFetch<PreparationOption>(`/api/preparation-options/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deletePreparationOption(id: number) {
  return apiFetch<PreparationOption>(`/api/preparation-options/${id}`, {
    method: "DELETE",
  });
}