import { apiFetch } from "./_base";
import type { DealerEarningsPlan, SaveEarningsPlan } from "@/lib/dealer-earnings";

export const getEarningsPlans = () =>
  apiFetch<DealerEarningsPlan[]>("/api/earnings-plans", { cache: "no-store" });

export const saveEarningsPlan = (data: SaveEarningsPlan, id?: number) =>
  apiFetch<DealerEarningsPlan>(`/api/earnings-plans${id == null ? "" : `/${id}`}`, {
    method: id == null ? "POST" : "PATCH", body: data,
  });

export const deleteEarningsPlan = (id: number) =>
  apiFetch<{ id: number }>(`/api/earnings-plans/${id}`, { method: "DELETE" });
