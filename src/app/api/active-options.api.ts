import { apiFetch } from "./_base";
import type { ActiveOption } from "../../lib/types";

export type CreateActiveOptionData = Omit<
  ActiveOption,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateActiveOptionData = Partial<CreateActiveOptionData>;

export function getActiveOptions() {
  return apiFetch<ActiveOption[]>("/api/active-options");
}

export function getActiveOption(id: number) {
  return apiFetch<ActiveOption>(`/api/active-options/${id}`);
}

export function createActiveOption(data: CreateActiveOptionData) {
  return apiFetch<ActiveOption>("/api/active-options", {
    method: "POST",
    body: data,
  });
}

export function updateActiveOption(id: number, data: UpdateActiveOptionData) {
  return apiFetch<ActiveOption>(`/api/active-options/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteActiveOption(id: number) {
  return apiFetch<ActiveOption>(`/api/active-options/${id}`, {
    method: "DELETE",
  });
}