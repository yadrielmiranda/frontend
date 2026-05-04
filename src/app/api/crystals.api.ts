import { apiFetch } from "./_base";
import type { Crystal, CreateCrystalData, UpdateCrystalData } from "@/lib/types";

export function getCrystals() {
  return apiFetch<Crystal[]>("/api/crystals");
}

export function getCrystal(id: number) {
  return apiFetch<Crystal>(`/api/crystals/${id}`);
}

export function createCrystal(data: CreateCrystalData) {
  return apiFetch<Crystal>("/api/crystals", {
    method: "POST",
    body: data,
  });
}

export function updateCrystal(id: number, data: UpdateCrystalData) {
  return apiFetch<Crystal>(`/api/crystals/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteCrystal(id: number) {
  return apiFetch<Crystal>(`/api/crystals/${id}`, {
    method: "DELETE",
  });
}