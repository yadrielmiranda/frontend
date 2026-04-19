import { apiFetch } from "./_base";
import type { MuntinType } from "@/lib/types";

export type CreateMuntinTypeData = {
  name: string;
  isActive?: boolean;
};

export type UpdateMuntinTypeData = Partial<CreateMuntinTypeData>;

export function getMuntinTypes(params?: { active?: boolean }) {
  const query = new URLSearchParams();

  if (params?.active !== undefined) {
    query.set("active", String(params.active));
  }

  const q = query.toString();

  return apiFetch<MuntinType[]>(`/api/muntin-types${q ? `?${q}` : ""}`);
}

export function getMuntinType(id: number) {
  return apiFetch<MuntinType>(`/api/muntin-types/${id}`);
}

export function createMuntinType(data: CreateMuntinTypeData) {
  return apiFetch<MuntinType>("/api/muntin-types", {
    method: "POST",
    body: data,
  });
}

export function updateMuntinType(id: number, data: UpdateMuntinTypeData) {
  return apiFetch<MuntinType>(`/api/muntin-types/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteMuntinType(id: number) {
  return apiFetch<MuntinType>(`/api/muntin-types/${id}`, {
    method: "DELETE",
  });
}