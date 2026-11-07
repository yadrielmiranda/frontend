import { apiFetch } from "./_base";
import type { DoorDesignCatalogEntry } from "@/lib/door-designs";

const catalogPath = "/api/door-designs";

export const getDoorDesignCatalog = () => apiFetch<DoorDesignCatalogEntry[]>(catalogPath);
export const updateDoorDesign = (id: number, data: { code?: string; unitPrice?: string | null }) =>
  apiFetch<DoorDesignCatalogEntry>(`${catalogPath}/${id}`, { method: "PATCH", body: data });
