import { apiFetch } from "./_base";
import type { SillOption } from "../../lib/types";

export type CreateSillOptionData = Omit<
  SillOption,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateSillOptionData = Partial<CreateSillOptionData>;

export function getSillOptions() {
  return apiFetch<SillOption[]>("/api/sill-options");
}

export function getSillOption(id: number) {
  return apiFetch<SillOption>(`/api/sill-options/${id}`);
}

export function createSillOption(data: CreateSillOptionData) {
  return apiFetch<SillOption>("/api/sill-options", {
    method: "POST",
    body: data,
  });
}

export function updateSillOption(id: number, data: UpdateSillOptionData) {
  return apiFetch<SillOption>(`/api/sill-options/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteSillOption(id: number) {
  return apiFetch<SillOption>(`/api/sill-options/${id}`, {
    method: "DELETE",
  });
}