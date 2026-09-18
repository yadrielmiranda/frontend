"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveInstallationCoverage,
  type InstallationCoverage,
  type InstallationCoverageChargeType,
} from "@/app/api/installation-coverage.api";
import { US_STATES } from "@/lib/us-states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Draft = {
  originStreet: string;
  originCity: string;
  originState: string;
  originPostalCode: string;
  maxDistanceMiles: string;
  includedMiles: string;
  hoursPerDay: string;
  ranges: {
    upToMiles: string;
    chargeType: InstallationCoverageChargeType;
    value: string;
    dailyCharge: string;
  }[];
};
type CompanyAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

const displayNumber = (value: string) => String(Number(value));
const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50";

function toDraft(coverage: InstallationCoverage | null): Draft {
  return {
    originStreet: coverage?.originStreet ?? "",
    originCity: coverage?.originCity ?? "",
    originState: coverage?.originState ?? "",
    originPostalCode: coverage?.originPostalCode ?? "",
    maxDistanceMiles: coverage ? displayNumber(coverage.maxDistanceMiles) : "",
    includedMiles: coverage ? displayNumber(coverage.includedMiles) : "",
    hoursPerDay: displayNumber(coverage?.hoursPerDay ?? "8"),
    ranges:
      coverage?.ranges.map((range) => ({
        upToMiles: displayNumber(range.upToMiles),
        chargeType: range.chargeType,
        value: displayNumber(range.value),
        dailyCharge: displayNumber(range.dailyCharge ?? "0"),
      })) ?? [],
  };
}

function validAmount(value: string, maximum: number) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= maximum;
}

function validateDraft(draft: Draft): string | null {
  if (
    !draft.originStreet.trim() ||
    !draft.originCity.trim() ||
    !draft.originState ||
    !draft.originPostalCode.trim()
  ) {
    return "Complete the departure address.";
  }
  if (!/^\d{5}(?:-\d{4})?$/.test(draft.originPostalCode.trim()))
    return "Enter a valid ZIP code.";
  if (
    !validAmount(draft.maxDistanceMiles, 99999999.99) ||
    Number(draft.maxDistanceMiles) <= 0
  ) {
    return "Maximum distance must be greater than zero, with up to two decimal places.";
  }
  if (!validAmount(draft.includedMiles, 99999999.99))
    return "Enter the included miles, using zero or a positive number with up to two decimal places.";
  if (Number(draft.includedMiles) > Number(draft.maxDistanceMiles))
    return "Included miles cannot exceed the maximum distance.";
  if (!validAmount(draft.hoursPerDay, 24) || Number(draft.hoursPerDay) <= 0) {
    return "Hours per installation day must be greater than zero and no more than 24, with up to two decimal places.";
  }
  let lower = Number(draft.includedMiles);
  for (const [index, range] of draft.ranges.entries()) {
    const upper = Number(range.upToMiles);
    if (
      !validAmount(range.upToMiles, 99999999.99) ||
      upper <= lower ||
      upper > Number(draft.maxDistanceMiles)
    ) {
      return `Range ${index + 1} must end after the previous range and within the maximum distance.`;
    }
    if (!validAmount(range.value, 9999999999.99))
      return `Enter a valid charge for range ${index + 1}, with up to two decimal places.`;
    if (!validAmount(range.dailyCharge, 9999999999.99))
      return `Enter a valid daily charge for range ${index + 1}, using zero or a positive amount with up to two decimal places.`;
    lower = upper;
  }
  if (lower !== Number(draft.maxDistanceMiles)) {
    return "The ranges must cover the entire distance after the included miles, up to the maximum distance.";
  }
  return null;
}

export function InstallationCoverageClient({
  initialCoverage,
  companyAddress,
}: {
  initialCoverage: InstallationCoverage | null;
  companyAddress: CompanyAddress | null;
}) {
  const [saved, setSaved] = useState(initialCoverage);
  const [draft, setDraft] = useState(() => toDraft(initialCoverage));
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

  function changeRange(index: number, patch: Partial<Draft["ranges"][number]>) {
    change({
      ranges: draft.ranges.map((range, position) =>
        position === index ? { ...range, ...patch } : range,
      ),
    });
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
      const result = await saveInstallationCoverage({
        revision: saved?.revision ?? 0,
        originStreet: draft.originStreet.trim(),
        originCity: draft.originCity.trim(),
        originState: draft.originState,
        originPostalCode: draft.originPostalCode.trim(),
        maxDistanceMiles: Number(draft.maxDistanceMiles),
        includedMiles: Number(draft.includedMiles),
        hoursPerDay: Number(draft.hoursPerDay),
        ranges: draft.ranges.map((range) => ({
          upToMiles: Number(range.upToMiles),
          chargeType: range.chargeType,
          value: Number(range.value),
          dailyCharge: Number(range.dailyCharge),
        })),
      });
      setSaved(result);
      setDraft(toDraft(result));
      toast.success("Installation coverage saved.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save installation coverage.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Installation coverage"
        description="Set the departure address, coverage distance, and charges for each distance range."
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
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 sm:flex-row">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" /> Departure address
              </CardTitle>
              {companyAddress && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    change({
                      originStreet: companyAddress.street,
                      originCity: companyAddress.city,
                      originState: US_STATES.some(
                        (state) =>
                          state.value ===
                          companyAddress.state.trim().toUpperCase(),
                      )
                        ? companyAddress.state.trim().toUpperCase()
                        : "",
                      originPostalCode: companyAddress.postalCode,
                    })
                  }
                >
                  <Building2 className="mr-2 h-4 w-4" /> Use company address
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="coverage-street">Street address</Label>
                <Input
                  id="coverage-street"
                  autoComplete="street-address"
                  maxLength={150}
                  value={draft.originStreet}
                  onChange={(event) =>
                    change({ originStreet: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="coverage-city">City</Label>
                <Input
                  id="coverage-city"
                  autoComplete="address-level2"
                  maxLength={100}
                  value={draft.originCity}
                  onChange={(event) =>
                    change({ originCity: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverage-state">State</Label>
                <select
                  id="coverage-state"
                  autoComplete="address-level1"
                  className={selectClass}
                  value={draft.originState}
                  onChange={(event) =>
                    change({ originState: event.target.value })
                  }
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
                <Label htmlFor="coverage-zip">ZIP code</Label>
                <Input
                  id="coverage-zip"
                  autoComplete="postal-code"
                  maxLength={10}
                  value={draft.originPostalCode}
                  onChange={(event) =>
                    change({ originPostalCode: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coverage distance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distances are one-way road miles from the departure address.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coverage-maximum">
                  Maximum distance (miles)
                </Label>
                <Input
                  id="coverage-maximum"
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  value={draft.maxDistanceMiles}
                  onChange={(event) =>
                    change({ maxDistanceMiles: event.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The outer limit of your installation area.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverage-included">
                  Included miles (no surcharge)
                </Label>
                <Input
                  id="coverage-included"
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={draft.includedMiles}
                  onChange={(event) =>
                    change({ includedMiles: event.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Set the same value as the maximum distance if the entire area
                  has no surcharge.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation workday</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="coverage-hours-per-day">
                  Hours per installation day
                </Label>
                <Input
                  id="coverage-hours-per-day"
                  type="number"
                  min="0.01"
                  max="24"
                  step="0.01"
                  value={draft.hoursPerDay}
                  onChange={(event) =>
                    change({ hoursPerDay: event.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Effective working hours per day for the installation team.
                  Applies to all distance ranges.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3 sm:flex-row">
              <div className="space-y-2">
                <CardTitle>Distance ranges</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Each range starts where the previous one ends. Only the
                  matching range applies.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.ranges.length >= 30}
                onClick={() =>
                  change({
                    ranges: [
                      ...draft.ranges,
                      {
                        upToMiles: "",
                        chargeType: "FIXED",
                        value: "",
                        dailyCharge: "0",
                      },
                    ],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add range
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                <span className="font-medium text-emerald-900">
                  0 – {draft.includedMiles || "—"} miles
                </span>
                <span className="text-emerald-800">No surcharge</span>
              </div>
              {draft.ranges.map((range, index) => (
                <div
                  key={index}
                  role="group"
                  aria-label={`Range ${index + 1}`}
                  className="grid min-w-0 gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(100px,1fr)_120px_170px_130px_170px_40px] xl:items-end"
                >
                  <div className="pb-1 text-sm sm:col-span-2 xl:col-span-1">
                    <p className="font-semibold text-slate-900">
                      Range {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Over{" "}
                      {(index === 0
                        ? draft.includedMiles
                        : draft.ranges[index - 1].upToMiles) || "—"}{" "}
                      miles
                    </p>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`coverage-to-${index}`}>
                      Up to (miles)
                    </Label>
                    <Input
                      id={`coverage-to-${index}`}
                      type="number"
                      min="0.01"
                      max="99999999.99"
                      step="0.01"
                      value={range.upToMiles}
                      onChange={(event) =>
                        changeRange(index, { upToMiles: event.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`coverage-type-${index}`}>
                      One-time charge type
                    </Label>
                    <select
                      id={`coverage-type-${index}`}
                      className={selectClass}
                      value={range.chargeType}
                      onChange={(event) =>
                        changeRange(index, {
                          chargeType: event.target
                            .value as InstallationCoverageChargeType,
                        })
                      }
                    >
                      <option value="FIXED">Fixed amount ($)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`coverage-value-${index}`}>
                      {range.chargeType === "FIXED"
                        ? "Amount ($)"
                        : "Percentage (%)"}
                    </Label>
                    <Input
                      id={`coverage-value-${index}`}
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      value={range.value}
                      onChange={(event) =>
                        changeRange(index, { value: event.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`coverage-daily-${index}`}>
                      Daily charge ($/day)
                    </Label>
                    <Input
                      id={`coverage-daily-${index}`}
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      value={range.dailyCharge}
                      onChange={(event) =>
                        changeRange(index, { dailyCharge: event.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove range ${index + 1}`}
                    onClick={() =>
                      change({
                        ranges: draft.ranges.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {draft.ranges.length === 0 && (
                <p className="py-3 text-sm text-muted-foreground">
                  Add ranges for any distance beyond the included miles.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <span>Beyond {draft.maxDistanceMiles || "—"} miles</span>
                <span>Outside coverage</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {dirty
                ? "Unsaved changes"
                : saved
                  ? "All changes saved"
                  : "No coverage configured yet"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty}
                onClick={() => {
                  setDraft(toDraft(saved));
                  setError(null);
                }}
              >
                Discard changes
              </Button>
              <Button
                type="submit"
                disabled={!dirty || busy}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {busy ? "Saving…" : "Save coverage"}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
