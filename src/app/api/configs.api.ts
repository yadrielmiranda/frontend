import { apiFetch } from "./_base";
import type { Config } from "@/lib/types";

export type ConfigMuntinLayoutItemData = {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
};

export type CreateConfigData = {
  conf: string;
  idProduct: number;
  categoryId?: number | null;
  isActive?: boolean;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  requiresSashHeight?: boolean;
  muntinLayout?: ConfigMuntinLayoutItemData[];
};

export type UpdateConfigData = Partial<CreateConfigData>;

export function getConfigs() {
  return apiFetch<Config[]>("/api/configs");
}

export function getConfig(id: number) {
  return apiFetch<Config>(`/api/configs/${id}`);
}

export function createConfig(data: CreateConfigData) {
  return apiFetch<Config>("/api/configs", {
    method: "POST",
    body: data,
  });
}

export function updateConfig(id: number, data: UpdateConfigData) {
  return apiFetch<Config>(`/api/configs/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteConfig(id: number) {
  return apiFetch<Config>(`/api/configs/${id}`, {
    method: "DELETE",
  });
}