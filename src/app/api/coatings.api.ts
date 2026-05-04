import { apiFetch } from "./_base";
import type { Coating, CreateCoatingData, UpdateCoatingData } from "@/lib/types";

export function getCoatings() {
  return apiFetch<Coating[]>("/api/coatings");
}

export function getCoating(id: number) {
  return apiFetch<Coating>(`/api/coatings/${id}`);
}

export function createCoating(coatingData: CreateCoatingData) {
  return apiFetch<Coating>("/api/coatings", {
    method: "POST",
    body: coatingData,
  });
}

export function updateCoating(id: number, coatingData: UpdateCoatingData) {
  return apiFetch<Coating>(`/api/coatings/${id}`, {
    method: "PATCH",
    body: coatingData,
  });
}

export function deleteCoating(id: number) {
  return apiFetch<Coating>(`/api/coatings/${id}`, {
    method: "DELETE",
  });
}