"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, MapPin, Save, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import {
  saveWarehouseDeliverySettings,
  type WarehouseAddress,
  type WarehouseDeliveryState,
} from "@/app/api/warehouse-delivery.api";
import { US_STATES } from "@/lib/us-states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Draft = WarehouseAddress & {
  maxDeliveryMiles: string;
  basePrice: string;
  includedMiles: string;
  additionalMilePrice: string;
};

const displayNumber = (value: string | null | undefined) =>
  value == null ? "" : String(Number(value));
const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50";

function toDraft(settings: WarehouseDeliveryState): Draft {
  const configuration = settings.configuration;
  return {
    street: configuration?.street ?? "",
    city: configuration?.city ?? "",
    state: configuration?.state ?? "",
    postalCode: configuration?.postalCode ?? "",
    maxDeliveryMiles: displayNumber(configuration?.maxDeliveryMiles),
    basePrice: displayNumber(settings.pricing.basePrice),
    includedMiles: displayNumber(settings.pricing.includedMiles),
    additionalMilePrice: displayNumber(settings.pricing.additionalMilePrice),
  };
}

function validateDraft(draft: Draft): string | null {
  if (
    !draft.street.trim() ||
    !draft.city.trim() ||
    !draft.state ||
    !draft.postalCode.trim()
  )
    return "Complete the warehouse address.";
  if (!US_STATES.some((state) => state.value === draft.state))
    return "Select a valid state.";
  if (!/^\d{5}(?:-\d{4})?$/.test(draft.postalCode.trim()))
    return "Enter a valid ZIP code.";
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(draft.maxDeliveryMiles) ||
    Number(draft.maxDeliveryMiles) <= 0 ||
    Number(draft.maxDeliveryMiles) > 99999999.99
  )
    return "Maximum delivery distance must be greater than zero, with up to two decimal places.";
  const validRate = (value: string) =>
    /^\d+(?:\.\d{1,4})?$/.test(value) && Number(value) <= 999999.9999;
  if (!validRate(draft.basePrice) || Number(draft.basePrice) <= 0)
    return "Base delivery price must be greater than zero, with up to four decimal places.";
  if (!validRate(draft.includedMiles))
    return "Included miles must be zero or a positive number, with up to four decimal places.";
  if (!validRate(draft.additionalMilePrice))
    return "Additional mile price must be zero or a positive number, with up to four decimal places.";
  if (Number(draft.includedMiles) > Number(draft.maxDeliveryMiles))
    return "Included miles cannot exceed the maximum delivery distance.";
  return null;
}

export function WarehouseDeliveryClient({
  initialSettings,
  companyAddress,
}: {
  initialSettings: WarehouseDeliveryState;
  companyAddress: WarehouseAddress | null;
}) {
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(() => toDraft(initialSettings));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(saved));

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function change(patch: Partial<Draft>) {
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  }

  function useCompanyAddress() {
    if (!companyAddress) return;
    const state = US_STATES.find(
      (item) =>
        item.value === companyAddress.state.trim().toUpperCase() ||
        item.label.toLowerCase() === companyAddress.state.trim().toLowerCase(),
    );
    change({ ...companyAddress, state: state?.value ?? "" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await saveWarehouseDeliverySettings({
        revision: saved.configuration?.revision ?? 0,
        street: draft.street.trim(),
        city: draft.city.trim(),
        state: draft.state,
        postalCode: draft.postalCode.trim(),
        maxDeliveryMiles: Number(draft.maxDeliveryMiles),
        basePrice: Number(draft.basePrice),
        includedMiles: Number(draft.includedMiles),
        additionalMilePrice: Number(draft.additionalMilePrice),
      });
      setSaved(result);
      setDraft(toDraft(result));
      toast.success("Warehouse & Delivery settings saved.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save Warehouse & Delivery settings.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Warehouse & Delivery"
        description="Set the pickup location, delivery distance, and delivery pricing."
      />
      <form onSubmit={save} noValidate>
        {error && (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 outline-none"
          >
            {error}
          </div>
        )}
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3 sm:flex-row">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-red-600" /> Warehouse
                  address
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customers pick up here. Deliveries depart from this address.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!companyAddress}
                title={
                  !companyAddress
                    ? "Complete the company address in Company settings first."
                    : undefined
                }
                onClick={useCompanyAddress}
              >
                <Building2 className="mr-2 h-4 w-4" /> Use company address
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="warehouse-street">Street address</Label>
                <Input
                  id="warehouse-street"
                  autoComplete="street-address"
                  maxLength={150}
                  value={draft.street}
                  onChange={(event) => change({ street: event.target.value })}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="warehouse-city">City</Label>
                <Input
                  id="warehouse-city"
                  autoComplete="address-level2"
                  maxLength={100}
                  value={draft.city}
                  onChange={(event) => change({ city: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-state">State</Label>
                <select
                  id="warehouse-state"
                  autoComplete="address-level1"
                  className={selectClass}
                  value={draft.state}
                  onChange={(event) => change({ state: event.target.value })}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-zip">ZIP code</Label>
                <Input
                  id="warehouse-zip"
                  autoComplete="postal-code"
                  maxLength={10}
                  value={draft.postalCode}
                  onChange={(event) =>
                    change({ postalCode: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" /> Delivery coverage
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                One-way road miles from the warehouse.
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label htmlFor="warehouse-maximum">
                  Maximum delivery distance (miles)
                </Label>
                <Input
                  id="warehouse-maximum"
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  value={draft.maxDeliveryMiles}
                  onChange={(event) =>
                    change({ maxDeliveryMiles: event.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Delivery is available up to this distance, including the
                  limit.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-red-600" /> Delivery pricing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The base price covers the included miles. Additional miles are
                charged at the rate below.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="warehouse-base">Base delivery price ($)</Label>
                <Input
                  id="warehouse-base"
                  type="number"
                  min="0.0001"
                  max="999999.9999"
                  step="0.0001"
                  value={draft.basePrice}
                  onChange={(event) =>
                    change({ basePrice: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-included">Included miles</Label>
                <Input
                  id="warehouse-included"
                  type="number"
                  min="0"
                  max="999999.9999"
                  step="0.0001"
                  value={draft.includedMiles}
                  onChange={(event) =>
                    change({ includedMiles: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-additional">
                  Additional mile price ($/mile)
                </Label>
                <Input
                  id="warehouse-additional"
                  type="number"
                  min="0"
                  max="999999.9999"
                  step="0.0001"
                  value={draft.additionalMilePrice}
                  onChange={(event) =>
                    change({ additionalMilePrice: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              {dirty
                ? "You have unsaved changes."
                : saved.configuration
                  ? "All changes saved."
                  : "Set the warehouse address and maximum distance to enable new delivery calculations."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || busy}
                onClick={() => {
                  setDraft(toDraft(saved));
                  setError(null);
                }}
              >
                Discard changes
              </Button>
              <Button type="submit" disabled={!dirty || busy}>
                <Save className="mr-2 h-4 w-4" />
                {busy ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
