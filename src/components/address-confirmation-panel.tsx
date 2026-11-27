"use client";

import { Button } from "@/components/ui/button";
import { AddressLocationMap } from "./address-location-map";
import { addressText, type AddressConfirmationController } from "@/lib/use-address-confirmation";
import type { InstallationAddress } from "@/lib/types";

type Purpose = "installation" | "delivery";
const spanishPurpose = { installation: "instalación", delivery: "entrega" };
const labels = {
  en: {
    checking: (purpose: Purpose) => `Checking the ${purpose} address…`,
    region: (purpose: Purpose) => `${purpose} address confirmation`,
    location: (purpose: Purpose) => `Confirm the ${purpose} location`,
    verified: "Address verified. You can continue with the calculation.", retry: "Try address again", edit: "Edit my address",
    heading: "Confirm the suggested address", entered: "Address you entered", suggested: "Suggested address", use: "Use suggested address",
  },
  es: {
    checking: (purpose: Purpose) => `Verificando la dirección de ${spanishPurpose[purpose]}…`,
    region: (purpose: Purpose) => `Confirmación de la dirección de ${spanishPurpose[purpose]}`,
    location: (purpose: Purpose) => `Confirma la ubicación de ${spanishPurpose[purpose]}`,
    verified: "Dirección verificada. Puedes continuar con el cálculo.", retry: "Volver a verificar", edit: "Editar mi dirección",
    heading: "Confirma la dirección sugerida", entered: "Dirección que escribiste", suggested: "Dirección sugerida", use: "Usar la dirección sugerida",
  },
};

const addressErrorsEs: Record<string, string> = {
  "Enter a complete address with a two-letter state and a valid ZIP code. Check the length of each field.":
    "Escribe la dirección completa con la abreviatura de dos letras del estado y un código postal válido. Revisa la longitud de cada campo.",
  "Enter a complete street address, including the street number, and try again.":
    "Escribe la dirección completa, incluido el número de la calle, y vuelve a intentarlo.",
  "The ZIP code does not match this street address. Enter the correct ZIP code and try again.":
    "El código postal no coincide con la dirección. Corrígelo y vuelve a intentarlo.",
  "Installation is available only in Florida.": "La instalación solo está disponible en Florida.",
  "Please edit the address or contact support; no different address was returned.":
    "No encontramos una dirección distinta. Edita la dirección o comunícate con soporte.",
  "Select a valid location on the map.": "Selecciona una ubicación válida en el mapa.",
  "The property location could not be matched to this address. Check the address and try again.":
    "La ubicación en el mapa no coincide con esta dirección. Revisa la dirección y vuelve a intentarlo.",
  "Address verification is unavailable. Please try again.": "La verificación de direcciones no está disponible. Vuelve a intentarlo.",
};

export function AddressConfirmationPanel({ confirmation, address, disabled, onEdit, purpose, locale = "en" }: {
  confirmation: AddressConfirmationController; address: InstallationAddress; disabled: boolean;
  onEdit: () => void; purpose: Purpose; locale?: "en" | "es";
}) {
  const { state } = confirmation;
  const copy = labels[locale];
  if (state.kind === "idle") return null;
  if (state.kind === "checking") return <p role="status" className="text-sm">{copy.checking(purpose)}</p>;
  if (state.kind === "validated") return <p role="status" className="text-sm font-medium text-emerald-700">{copy.verified}</p>;
  if (state.kind === "error") return <div role="alert" className="space-y-2 text-sm text-red-700"><p>{locale === "es"
    ? addressErrorsEs[state.message] ?? "No se pudo verificar la dirección. Revisa la calle, la ciudad, el estado y el código postal, y vuelve a intentarlo."
    : state.message}</p>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => void confirmation.review()}>{copy.retry}</Button>
    <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>{copy.edit}</Button></div>;
  return <div role="region" aria-label={copy.region(purpose)} aria-live="polite"
    className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
    {state.kind === "suggestion" ? <>
      <h3 className="font-semibold">{copy.heading}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-white p-3"><p className="text-xs">{copy.entered}</p><p>{addressText(state.entered)}</p></div>
        <div className="rounded-md border border-blue-300 bg-white p-3"><p className="text-xs">{copy.suggested}</p><p>{addressText(state.suggested)}</p></div>
      </div>
      <Button type="button" disabled={disabled} onClick={() => void confirmation.review(state.suggested)}>{copy.use}</Button>
    </> : <>
      <h3 className="font-semibold">{copy.location(purpose)}</h3><p className="text-sm">{addressText(address)}</p>
      <AddressLocationMap locale={locale} center={state.center} maxAdjustmentMeters={state.maxAdjustmentMeters} disabled={disabled}
        onConfirm={confirmedLocation => void confirmation.review({ ...address, confirmedLocation })} />
    </>}
    <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>{copy.edit}</Button>
  </div>;
}
