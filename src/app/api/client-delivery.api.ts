import { apiFetch } from "./_base";
import type { AddressLocation } from "@/lib/types";

export type DeliveryProfileAddress = {
  street: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

export type DeliveryPriceEstimate = {
  total: string;
  basePrice: string;
  includedMiles: string;
  additionalMiles: string;
  additionalMilePrice: string;
  additionalMileageCharge: string;
};

export type ClientDeliveryCoverage = {
  applies: boolean;
  canAddProfileAddress: boolean;
  address: DeliveryProfileAddress | null;
  available: boolean | null;
  estimatedPrice?: DeliveryPriceEstimate | null;
  verificationKey: string | null;
  reviewComplete: boolean;
  acknowledged: "DELIVERY" | "PICKUP" | null;
};

export function getClientDeliveryCoverage(estimateId?: number) {
  return apiFetch<ClientDeliveryCoverage>("/api/client-delivery/coverage", {
    cache: "no-store",
    timeoutMs: 8000,
    query: { estimateId },
  });
}

export type DeliveryAddressCheck = DeliveryProfileAddress & {
  confirmedLocation?: AddressLocation;
  expectedProfileAddressKey?: string;
  onlyIfMissing?: boolean;
};

export function checkClientDeliveryAddress(address: DeliveryAddressCheck) {
  return apiFetch<ClientDeliveryCoverage>("/api/client-delivery/coverage", {
    method: "POST",
    body: address,
  });
}

export function confirmClientCanPickUp(estimateId: number) {
  return apiFetch<ClientDeliveryCoverage>(`/api/client-delivery/estimates/${estimateId}/acknowledge`, {
    method: "POST",
    body: { choice: "PICKUP" },
  });
}
