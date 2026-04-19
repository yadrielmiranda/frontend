import { apiFetch } from "./_base";

export type ConfigMuntinLayoutItemData = {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
};

export type CreateConfigData = {
  conf: string;
  idProduct: number;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  muntinLayout?: ConfigMuntinLayoutItemData[];
};

export type UpdateConfigData = Partial<CreateConfigData>;

export function getConfigs() {
  return apiFetch<any[]>("/api/configs");
}

export function getConfig(id: number) {
  return apiFetch<any>(`/api/configs/${id}`);
}

export function createConfig(data: CreateConfigData) {
  return apiFetch<any>("/api/configs", {
    method: "POST",
    body: data,
  });
}

export function updateConfig(id: number, data: UpdateConfigData) {
  return apiFetch<any>(`/api/configs/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteConfig(id: number) {
  return apiFetch<{ success: boolean }>(`/api/configs/${id}`, {
    method: "DELETE",
  });
}