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

export function CustomerDetailsCard({ register, control, errors }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* First Name */}
          <div>
            <Label htmlFor="customerFirstName">First Name</Label>
            <Input
              id="customerFirstName"
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
            <Label htmlFor="customerLastName">Last Name</Label>
            <Input
              id="customerLastName"
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
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
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
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
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
            <Label htmlFor="customerStreet">Street Address</Label>
            <Input
              id="customerStreet"
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
            <Label htmlFor="customerCity">City</Label>
            <Input
              id="customerCity"
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
            error={errors?.customerState?.message as string | undefined}
          />

          {/* Postal */}
          <div>
            <Label htmlFor="customerPostalCode">Postal Code</Label>
            <Input
              id="customerPostalCode"
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
