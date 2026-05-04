import { apiFetch } from "./_base";
import type { Tint, CreateTintData, UpdateTintData } from "@/lib/types";

export function getTints() {
  return apiFetch<Tint[]>("/api/tints");
}

export function getTint(id: number) {
  return apiFetch<Tint>(`/api/tints/${id}`);
}

export function createTint(data: CreateTintData) {
  return apiFetch<Tint>("/api/tints", {
    method: "POST",
    body: data,
  });
}

export function updateTint(id: number, data: UpdateTintData) {
  return apiFetch<Tint>(`/api/tints/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteTint(id: number) {
  return apiFetch<Tint>(`/api/tints/${id}`, {
    method: "DELETE",
  });
}