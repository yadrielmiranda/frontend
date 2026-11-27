"use client";

import React from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import type { PlaceAddress } from "@/app/api/geo.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { Label } from "@/components/ui/label";
import type { EstimateFormValues } from "./types";
import { StateCombobox } from "@/components/StateCombobox";
import { isValidPhone } from "@/lib/validators-phone";
import { normalizeEmail, isValidEmail } from "@/lib/validators-email";
import { normalizeUSZip, isValidUSZip } from "@/lib/validators-zip";
import type { CompanyLocale } from "@/components/company/company-content";

export type CustomerDetailsSaveState = "idle" | "pending" | "saving" | "saved" | "invalid" | "error";

type Props = {
  locale?: CompanyLocale;
  register: UseFormRegister<EstimateFormValues>;
  control: Control<EstimateFormValues>;
  setValue: UseFormSetValue<EstimateFormValues>;
  disabled?: boolean;
  errors?: FieldErrors<EstimateFormValues>;
  saveState?: CustomerDetailsSaveState;
  onRetrySave?: () => void;
};

const spanishErrors: Record<string, string> = {
  "Invalid email format": "Escribe un correo electrónico válido.",
  "Invalid phone number": "Escribe un número de teléfono válido.",
  "Address details must be 150 characters or fewer.": "Los detalles de la dirección deben tener como máximo 150 caracteres.",
  "Invalid ZIP (5 digits)": "Escribe un código postal de 5 dígitos.",
};

function FieldError({ message, locale }: { message?: string; locale: CompanyLocale }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{locale === "es" ? spanishErrors[message] ?? message : message}</p>;
}

const customerFieldClassName =
  "border-slate-400 shadow-none hover:border-slate-500 focus-visible:border-slate-500 focus-visible:ring-slate-500/10";
const customerLabelClassName = "mb-1.5 block";

export function CustomerDetailsCard({ locale = "en", register, control, setValue, disabled, errors, saveState = "idle", onRetrySave }: Props) {
  const spanish = locale === "es";
  const addressContext = useWatch({
    control,
    name: ["customerCity", "customerState", "customerPostalCode"],
  });

  const applyAddress = (address: PlaceAddress) => {
    if (disabled) return;
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("customerStreet", address.street, options);
    if (address.addressLine2 !== undefined) setValue("customerAddressLine2", address.addressLine2, options);
    setValue("customerCity", address.city, options);
    setValue("customerState", address.state, options);
    setValue("customerPostalCode", address.postalCode, options);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle>{spanish ? "Cliente" : "Customer"}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* First Name */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerFirstName"
            >
              {spanish ? "Nombre" : "First Name"}
            </Label>
            <Input
              id="customerFirstName"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="given-name"
              {...register("customerFirstName")}
            />
            <FieldError locale={locale}
              message={errors?.customerFirstName?.message as string | undefined}
            />
          </div>

          {/* Last Name */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerLastName"
            >
              {spanish ? "Apellido" : "Last Name"}
            </Label>
            <Input
              id="customerLastName"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="family-name"
              {...register("customerLastName")}
            />
            <FieldError locale={locale}
              message={errors?.customerLastName?.message as string | undefined}
            />
          </div>

          {/* Email */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerEmail"
            >
              {spanish ? "Correo electrónico" : "Email"}
            </Label>
            <Input
              id="customerEmail"
              className={customerFieldClassName}
              placeholder=""
              type="email"
              autoComplete="email"
              {...register("customerEmail", {
                setValueAs: (v) => normalizeEmail(v),
                validate: (v) => {
                  if (!v) return true;
                  return isValidEmail(v) || "Invalid email format";
                },
              })}
            />
            <FieldError locale={locale}
              message={errors?.customerEmail?.message as string | undefined}
            />
          </div>

          {/* Phone */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerPhone"
            >
              {spanish ? "Teléfono" : "Phone"}
            </Label>
            <Controller
              control={control}
              name="customerPhone"
              rules={{ validate: (value) => !value?.trim() || isValidPhone(value) || "Invalid phone number" }}
              render={({ field }) => (
                <InternationalPhoneInput
                  {...field}
                  locale={locale}
                  id="customerPhone"
                  className={customerFieldClassName}
                  autoComplete="tel"
                  disabled={disabled}
                  aria-invalid={Boolean(errors?.customerPhone)}
                />
              )}
            />
            <FieldError locale={locale}
              message={errors?.customerPhone?.message as string | undefined}
            />
          </div>

          {/* Street */}
          <div className="md:col-span-2">
            <Label
              className={customerLabelClassName}
              htmlFor="customerStreet"
            >
              {spanish ? "Dirección" : "Street Address"}
            </Label>
            <Controller
              control={control}
              name="customerStreet"
              render={({ field }) => (
                <AddressAutocomplete
                  {...field}
                  locale={locale}
                  value={field.value ?? ""}
                  id="customerStreet"
                  className={customerFieldClassName}
                  placeholder={spanish ? "Empieza a escribir una dirección" : "Start typing an address"}
                  contextKey={JSON.stringify(addressContext)}
                  onAddressSelect={applyAddress}
                  disabled={disabled}
                  aria-invalid={Boolean(errors?.customerStreet)}
                />
              )}
            />
            <FieldError locale={locale}
              message={errors?.customerStreet?.message as string | undefined}
            />
          </div>

          <div className="md:col-span-3">
            <Label className={customerLabelClassName} htmlFor="customerAddressLine2">
              {spanish ? "Apartamento, suite, unidad, etc. (opcional)" : "Apartment, suite, unit, etc. (optional)"}
            </Label>
            <Input
              id="customerAddressLine2"
              className={customerFieldClassName}
              placeholder={spanish ? "Ej.: apto. 4B, suite 200, edificio C" : "e.g. Apt 4B, Suite 200, Building C"}
              autoComplete="address-line2"
              maxLength={150}
              disabled={disabled}
              {...register("customerAddressLine2", {
                maxLength: { value: 150, message: "Address details must be 150 characters or fewer." },
              })}
            />
            <FieldError locale={locale} message={errors?.customerAddressLine2?.message as string | undefined} />
          </div>

          {/* City */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerCity"
            >
              {spanish ? "Ciudad" : "City"}
            </Label>
            <Input
              id="customerCity"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="address-level2"
              {...register("customerCity")}
            />
            <FieldError locale={locale}
              message={errors?.customerCity?.message as string | undefined}
            />
          </div>

          {/* State (SELECT) */}
          <StateCombobox
            locale={locale}
            control={control}
            name="customerState"
            placeholder={spanish ? "Selecciona el estado…" : "Select state…"}
            className="space-y-1.5"
            triggerClassName={customerFieldClassName}
            error={errors?.customerState?.message as string | undefined}
          />

          {/* Postal */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerPostalCode"
            >
              {spanish ? "Código postal" : "Postal Code"}
            </Label>
            <Input
              id="customerPostalCode"
              className={customerFieldClassName}
              autoComplete="postal-code"
              {...register("customerPostalCode", {
                setValueAs: (v) => normalizeUSZip(v),
                validate: (v) => {
                  const zip = normalizeUSZip(v);
                  if (!zip) return true;
                  return isValidUSZip(zip) || "Invalid ZIP (5 digits)";
                },
              })}
            />
            <FieldError locale={locale}
              message={
                errors?.customerPostalCode?.message as string | undefined
              }
            />
          </div>
        </div>
        {!disabled && saveState !== "idle" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="status" aria-live="polite">
            <span className={saveState === "error" || saveState === "invalid" ? "text-red-600" : saveState === "saved" ? "text-emerald-700" : "text-muted-foreground"}>
              {saveState === "pending" && (spanish ? "Cambios sin guardar" : "Unsaved changes")}
              {saveState === "saving" && (spanish ? "Guardando…" : "Saving…")}
              {saveState === "saved" && (spanish ? "Guardado" : "Saved")}
              {saveState === "invalid" && (spanish ? "Revisa los campos resaltados para guardar los cambios." : "Not saved. Check the highlighted fields.")}
              {saveState === "error" && (spanish ? "No se pudieron guardar estos cambios." : "Could not save these changes.")}
            </span>
            {saveState === "error" && onRetrySave && (
              <button type="button" className="underline underline-offset-2" onClick={onRetrySave}>{spanish ? "Reintentar" : "Try again"}</button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
