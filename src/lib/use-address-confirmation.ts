"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reviewAddress, type AddressPurpose } from "@/app/api/address-confirmations.api";
import type { AddressLocation, InstallationAddress } from "./types";

export const addressKey = (address: InstallationAddress) => JSON.stringify([
  address.street, address.addressLine2 ?? "", address.city, address.state, address.postalCode,
  address.confirmedLocation?.lat ?? null, address.confirmedLocation?.lng ?? null,
]);
export const addressText = (address: InstallationAddress) =>
  [address.street, address.addressLine2, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
export function withoutLocation(address: InstallationAddress): InstallationAddress {
  const { confirmedLocation: _location, ...text } = address;
  void _location;
  return text;
}
export function isAddressLocation(value: unknown): value is AddressLocation {
  if (!value || typeof value !== "object") return false;
  const point = value as AddressLocation;
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}
function validAddress(value: unknown): value is InstallationAddress {
  if (!value || typeof value !== "object") return false;
  const a = value as InstallationAddress;
  return [a.street, a.city, a.state, a.postalCode].every(item => typeof item === "string" && item.trim())
    && a.street.length <= 150 && a.city.length <= 100 && /^[A-Z]{2}$/.test(a.state)
    && /^\d{5}(?:-\d{4})?$/.test(a.postalCode)
    && (a.addressLine2 == null || typeof a.addressLine2 === "string" && a.addressLine2.length <= 150)
    && (a.confirmedLocation === undefined || isAddressLocation(a.confirmedLocation));
}
export type AddressConfirmationState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "validated" }
  | { kind: "error"; message: string }
  | { kind: "suggestion"; entered: InstallationAddress; suggested: InstallationAddress }
  | { kind: "location"; center: AddressLocation; maxAdjustmentMeters: number };
type BoundState = { key: string; context: string; value: AddressConfirmationState };

export function useAddressConfirmation({ purpose, address, contextKey, onAddressChange, disabled = false }: {
  purpose: AddressPurpose;
  address: InstallationAddress;
  contextKey: string;
  onAddressChange: (address: InstallationAddress) => void;
  disabled?: boolean;
}) {
  const key = addressKey(address);
  const [bound, setBound] = useState<BoundState | null>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const inFlight = useRef<{ request: number; key: string; context: string } | null>(null);
  const latest = useRef({ key, contextKey, disabled, onAddressChange });
  const observed = useRef({ key, contextKey });
  latest.current = { key, contextKey, disabled, onAddressChange };
  useEffect(() => {
    mounted.current = true;
    const lifetime = revision;
    return () => { mounted.current = false; lifetime.current++; };
  }, []);
  useEffect(() => {
    if (observed.current.key === key && observed.current.contextKey === contextKey) return;
    observed.current = { key, contextKey };
    revision.current++;
    inFlight.current = null;
    setBound(current => current?.key === key && current.context === contextKey ? current : null);
  }, [key, contextKey]);
  const state: AddressConfirmationState = bound?.key === key && bound.context === contextKey ? bound.value : { kind: "idle" };
  const validForPurpose = (value: unknown): value is InstallationAddress =>
    validAddress(value) && (purpose !== "INSTALLATION" || value.state === "FL");
  const bind = (value: AddressConfirmationState, nextAddress = address) =>
    setBound({ key: addressKey(nextAddress), context: contextKey, value });
  const invalidate = useCallback(() => { revision.current++; inFlight.current = null; setBound(null); }, []);

  async function review(candidate: InstallationAddress = address) {
    if (disabled || inFlight.current?.key === key && inFlight.current.context === contextKey) return;
    const normalized = { ...candidate, street: candidate.street.trim(), city: candidate.city.trim(),
      state: candidate.state.trim().toUpperCase(), postalCode: candidate.postalCode.trim() };
    if (!validAddress(normalized)) {
      bind({ kind: "error", message: "Enter a complete address with a two-letter state and a valid ZIP code. Check the length of each field." });
      return;
    }
    if (purpose === "INSTALLATION" && normalized.state !== "FL") {
      bind({ kind: "error", message: "Installation is available only in Florida." });
      return;
    }
    const request = ++revision.current;
    const current = () => mounted.current && revision.current === request && latest.current.key === key
      && latest.current.contextKey === contextKey && !latest.current.disabled;
    inFlight.current = { request, key, context: contextKey };
    bind({ kind: "checking" });
    try {
      const result = await reviewAddress(purpose, normalized);
      if (!current()) return;
      if (result.status === "VALIDATED" && validForPurpose(result.address)) {
        const verified = { ...result.address, ...(normalized.addressLine2 !== undefined ? { addressLine2: normalized.addressLine2 } : {}) };
        latest.current.onAddressChange(verified);
        bind({ kind: "validated" }, verified);
      } else if (result.status === "CONFIRM_SUGGESTION" && validForPurpose(result.suggestedAddress)) {
        const suggested = { ...withoutLocation(result.suggestedAddress), ...(normalized.addressLine2 !== undefined ? { addressLine2: normalized.addressLine2 } : {}) };
        if (addressKey(withoutLocation(normalized)) === addressKey(suggested)) throw new Error("Please edit the address or contact support; no different address was returned.");
        latest.current.onAddressChange(normalized);
        bind({ kind: "suggestion", entered: normalized, suggested }, normalized);
      } else if (result.status === "CONFIRM_LOCATION" && isAddressLocation(result.center)
        && Number.isFinite(result.maxAdjustmentMeters) && result.maxAdjustmentMeters > 0 && result.maxAdjustmentMeters <= 500) {
        const unconfirmed = withoutLocation(normalized);
        latest.current.onAddressChange(unconfirmed);
        bind({ kind: "location", center: result.center, maxAdjustmentMeters: result.maxAdjustmentMeters }, unconfirmed);
      } else throw new Error("Address verification returned an incomplete response. Please try again.");
    } catch (error) {
      if (!current()) return;
      latest.current.onAddressChange(normalized);
      bind({ kind: "error", message: error instanceof Error ? error.message : "Address verification is unavailable. Please try again." }, normalized);
    } finally { if (inFlight.current?.request === request) inFlight.current = null; }
  }

  function handleFinalError(error: unknown): boolean {
    if (!error || typeof error !== "object" || !("status" in error) || error.status !== 400 || !("data" in error)) return false;
    const data = error.data as Record<string, unknown> | null;
    if (!data) return false;
    if (data.code === "ADDRESS_LOCATION_CONFIRMATION_REQUIRED" && isAddressLocation(data.center)
      && typeof data.maxAdjustmentMeters === "number" && data.maxAdjustmentMeters > 0 && data.maxAdjustmentMeters <= 500) {
      bind({ kind: "location", center: data.center, maxAdjustmentMeters: data.maxAdjustmentMeters });
      return true;
    }
    if (["INSTALLATION_ADDRESS_CONFIRMATION_REQUIRED", "ADDRESS_CONFIRMATION_REQUIRED", "DELIVERY_ADDRESS_CONFIRMATION_REQUIRED"].includes(String(data.code))
      && validForPurpose(data.suggestedAddress)) {
      const suggested = { ...withoutLocation(data.suggestedAddress), ...(address.addressLine2 !== undefined ? { addressLine2: address.addressLine2 } : {}) };
      if (addressKey(withoutLocation(address)) === addressKey(suggested)) return false;
      bind({ kind: "suggestion", entered: address, suggested });
      return true;
    }
    return false;
  }
  return { state, isConfirmed: state.kind === "validated", checking: state.kind === "checking", review, invalidate, handleFinalError };
}
export type AddressConfirmationController = ReturnType<typeof useAddressConfirmation>;
