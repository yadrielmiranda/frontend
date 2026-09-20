import { apiFetch } from "./_base";

export type WarehouseAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type WarehouseDeliverySettings = WarehouseAddress & {
  id: number;
  revision: number;
  maxDeliveryMiles: string;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseDeliveryState = {
  configuration: WarehouseDeliverySettings | null;
  pricing: {
    basePrice: string | null;
    includedMiles: string | null;
    additionalMilePrice: string | null;
  };
};

export type SaveWarehouseDeliveryInput = WarehouseAddress & {
  revision: number;
  maxDeliveryMiles: number;
  basePrice: number;
  includedMiles: number;
  additionalMilePrice: number;
};

export function getWarehouseDeliverySettings() {
  return apiFetch<WarehouseDeliveryState>("/api/warehouse-delivery", {
    cache: "no-store",
  });
}

export function saveWarehouseDeliverySettings(
  data: SaveWarehouseDeliveryInput,
) {
  return apiFetch<WarehouseDeliveryState>("/api/warehouse-delivery", {
    method: "PUT",
    body: data,
  });
}

export async function getWarehousePickupAddress() {
  const response = await apiFetch<{ address: WarehouseAddress | null }>(
    "/api/warehouse-delivery/pickup-address",
    { cache: "no-store" },
  );
  return response.address;
}
