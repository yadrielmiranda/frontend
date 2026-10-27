import { apiFetch } from "./_base";
import type { DesignColor, DesignPattern, EditableSystemDesigns } from "@/lib/garage-designs";

export type DesignPatternInput = Omit<DesignPattern, "id">;
export type DesignColorInput = Omit<DesignColor, "id" | "idFrameColor"> & { idFrameColor: number };

export interface SystemDesignsManage extends EditableSystemDesigns {
  system: {
    id: number;
    name: string;
    product: { id: number; name: string; diagramFamily: string };
  };
  designCatalog: DesignPattern[];
  colorCatalog: DesignColor[];
}

export const getDesignPatterns = () => apiFetch<DesignPattern[]>("/api/garage-designs/patterns");
export const getDesignColors = () => apiFetch<DesignColor[]>("/api/garage-designs/colors");
export const createDesignPattern = (body: DesignPatternInput) =>
  apiFetch<DesignPattern>("/api/garage-designs/patterns", { method: "POST", body });
export const updateDesignPattern = (id: number, body: Partial<DesignPatternInput>) =>
  apiFetch<DesignPattern>(`/api/garage-designs/patterns/${id}`, { method: "PATCH", body });
export const deleteDesignPattern = (id: number) =>
  apiFetch<{ id: number }>(`/api/garage-designs/patterns/${id}`, { method: "DELETE" });
export const createDesignColor = (body: DesignColorInput) =>
  apiFetch<DesignColor>("/api/garage-designs/colors", { method: "POST", body });
export const updateDesignColor = (id: number, body: Partial<DesignColorInput>) =>
  apiFetch<DesignColor>(`/api/garage-designs/colors/${id}`, { method: "PATCH", body });
export const getSystemDesignsForManage = (id: number) =>
  apiFetch<SystemDesignsManage>(`/api/systems/${id}/designs/manage`);
export const updateSystemDesigns = (id: number, body: EditableSystemDesigns) =>
  apiFetch<SystemDesignsManage>(`/api/systems/${id}/designs/manage`, { method: "PATCH", body });
