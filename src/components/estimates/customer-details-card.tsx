"use client";

import React from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstimateFormValues } from "./types";
import { StateCombobox } from "@/components/StateCombobox";
import { normalizeUSPhoneToE164, isValidUSPhone } from "@/lib/validators-phone";
import { normalizeEmail, isValidEmail } from "@/lib/validators-email";
import { normalizeUSZip, isValidUSZip } from "@/lib/validators-zip";

type Props = {
  register: UseFormRegister<EstimateFormValues>;
  control: Control<EstimateFormValues>;
  errors?: FieldErrors<EstimateFormValues>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

const customerFieldClassName =
  "border-slate-400 shadow-none hover:border-slate-500 focus-visible:border-slate-500 focus-visible:ring-slate-500/10";
const customerLabelClassName = "mb-1.5 block";

export function CustomerDetailsCard({ register, control, errors }: Props) {
  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle>Customer</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* First Name */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerFirstName"
            >
              First Name
            </Label>
            <Input
              id="customerFirstName"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="given-name"
              {...register("customerFirstName")}
            />
            <FieldError
              message={errors?.customerFirstName?.message as string | undefined}
            />
          </div>

          {/* Last Name */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerLastName"
            >
              Last Name
            </Label>
            <Input
              id="customerLastName"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="family-name"
              {...register("customerLastName")}
            />
            <FieldError
              message={errors?.customerLastName?.message as string | undefined}
            />
          </div>

          {/* Email */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerEmail"
            >
              Email
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
            <FieldError
              message={errors?.customerEmail?.message as string | undefined}
            />
          </div>

          {/* Phone */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerPhone"
            >
              Phone
            </Label>
            <Input
              id="customerPhone"
              className={customerFieldClassName}
              autoComplete="tel"
              {...register("customerPhone", {
                setValueAs: (v) => normalizeUSPhoneToE164(v),
                validate: (v) => {
                  const phone = normalizeUSPhoneToE164(v);
                  if (!phone) return true;
                  return isValidUSPhone(phone) || "Invalid US phone number";
                },
              })}
            />
            <FieldError
              message={errors?.customerPhone?.message as string | undefined}
            />
          </div>

          {/* Street */}
          <div className="md:col-span-2">
            <Label
              className={customerLabelClassName}
              htmlFor="customerStreet"
            >
              Street Address
            </Label>
            <Input
              id="customerStreet"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="address-line1"
              {...register("customerStreet")}
            />
            <FieldError
              message={errors?.customerStreet?.message as string | undefined}
            />
          </div>

          {/* City */}
          <div>
            <Label
              className={customerLabelClassName}
              htmlFor="customerCity"
            >
              City
            </Label>
            <Input
              id="customerCity"
              className={customerFieldClassName}
              placeholder=""
              autoComplete="address-level2"
              {...register("customerCity")}
            />
            <FieldError
              message={errors?.customerCity?.message as string | undefined}
            />
          </div>

          {/* State (SELECT) */}
          <StateCombobox
            control={control}
            name="customerState"
            placeholder="Select state…"
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
              Postal Code
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
            <FieldError
              message={
                errors?.customerPostalCode?.message as string | undefined
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
