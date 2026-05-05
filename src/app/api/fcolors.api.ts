import { apiFetch } from "./_base";
import type {
  FrameColor,
  CreateFrameColorData,
  UpdateFrameColorData,
} from "../../lib/types";

export function getFColors() {
  return apiFetch<FrameColor[]>("/api/framecolors");
}

export function getFColor(id: number) {
  return apiFetch<FrameColor>(`/api/framecolors/${id}`);
}

export function createFColor(data: CreateFrameColorData) {
  return apiFetch<FrameColor>("/api/framecolors", {
    method: "POST",
    body: data,
  });
}

export function updateFColor(id: number, data: UpdateFrameColorData) {
  return apiFetch<FrameColor>(`/api/framecolors/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteFColor(id: number) {
  return apiFetch<FrameColor>(`/api/framecolors/${id}`, {
    method: "DELETE",
  });
}

export function getGlobalFrameColors() {
  return apiFetch<FrameColor[]>("/api/framecolors/globals");
}