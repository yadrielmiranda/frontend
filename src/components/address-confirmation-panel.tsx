"use client";

import { Button } from "@/components/ui/button";
import { AddressLocationMap } from "./address-location-map";
import { addressText, type AddressConfirmationController } from "@/lib/use-address-confirmation";
import type { InstallationAddress } from "@/lib/types";

export function AddressConfirmationPanel({ confirmation, address, disabled, onEdit, purpose }: {
  confirmation: AddressConfirmationController; address: InstallationAddress; disabled: boolean;
  onEdit: () => void; purpose: "installation" | "delivery";
}) {
  const { state } = confirmation;
  if (state.kind === "idle") return null;
  if (state.kind === "checking") return <p role="status" className="text-sm">Checking the {purpose} address…</p>;
  if (state.kind === "validated") return <p role="status" className="text-sm font-medium text-emerald-700">Address verified. You can continue with the calculation.</p>;
  if (state.kind === "error") return <div role="alert" className="space-y-2 text-sm text-red-700"><p>{state.message}</p>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => void confirmation.review()}>Try address again</Button>
    <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>Edit my address</Button></div>;
  return <div role="region" aria-label={`${purpose} address confirmation`} aria-live="polite"
    className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
    {state.kind === "suggestion" ? <>
      <h3 className="font-semibold">Confirm the suggested address</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-white p-3"><p className="text-xs">Address you entered</p><p>{addressText(state.entered)}</p></div>
        <div className="rounded-md border border-blue-300 bg-white p-3"><p className="text-xs">Suggested address</p><p>{addressText(state.suggested)}</p></div>
      </div>
      <Button type="button" disabled={disabled} onClick={() => void confirmation.review(state.suggested)}>Use suggested address</Button>
    </> : <>
      <h3 className="font-semibold">Confirm the {purpose} location</h3><p className="text-sm">{addressText(address)}</p>
      <AddressLocationMap center={state.center} maxAdjustmentMeters={state.maxAdjustmentMeters} disabled={disabled}
        onConfirm={confirmedLocation => void confirmation.review({ ...address, confirmedLocation })} />
    </>}
    <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>Edit my address</Button>
  </div>;
}
