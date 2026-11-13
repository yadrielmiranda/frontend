import { apiFetch } from "./_base";
import type { AddressLocation, InstallationAddress } from "@/lib/types";

export type AddressPurpose = "INSTALLATION" | "DELIVERY";
export type AddressReview =
  | { status: "VALIDATED"; address: InstallationAddress }
  | { status: "CONFIRM_SUGGESTION"; suggestedAddress: InstallationAddress }
  | { status: "CONFIRM_LOCATION"; center: AddressLocation; maxAdjustmentMeters: number };

export function reviewAddress(purpose: AddressPurpose, address: InstallationAddress) {
  return apiFetch<AddressReview>("/api/address-confirmations/review", {
    method: "POST", body: { purpose, address }, timeoutMs: 20000,
  });
}
