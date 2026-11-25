"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { isApiError } from "@/app/api/_base";
import {
  confirmClientCanPickUp, checkClientDeliveryAddress, getClientDeliveryCoverage,
  type ClientDeliveryCoverage, type DeliveryProfileAddress, type DeliveryAddressCheck,
} from "@/app/api/client-delivery.api";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { AddressConfirmationPanel } from "@/components/address-confirmation-panel";
import { useAddressConfirmation, withoutLocation } from "@/lib/use-address-confirmation";
import { ClientDeliveryPrice } from "./client-delivery-price";
import type { InstallationAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/us-states";

const emptyAddress: DeliveryProfileAddress = {
  street: "", city: "", state: "FL", postalCode: "", addressLine2: null,
};

type AddressEditor = {
  initial: DeliveryProfileAddress | null;
  expectedProfileAddressKey?: string;
  confirmationError?: unknown;
};

function CoverageAddressForm({ initial, expectedProfileAddressKey, confirmationError, busy, saveVariant, cancelLabel, onCheck, onCancel }: AddressEditor & {
  busy: boolean;
  saveVariant: "green" | "default" | "outline";
  cancelLabel: string;
  onCheck: (address: DeliveryAddressCheck) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [address, setAddress] = useState<InstallationAddress>(initial ?? emptyAddress);
  const confirmation = useAddressConfirmation({ purpose: "DELIVERY", address, contextKey: id,
    disabled: busy, onAddressChange: setAddress });
  const lastError = useRef<unknown>(null);
  useEffect(() => {
    if (confirmationError && lastError.current !== confirmationError) {
      lastError.current = confirmationError;
      confirmation.handleFinalError(confirmationError);
    }
  }, [confirmation, confirmationError]);
  function edit(next: InstallationAddress) {
    confirmation.invalidate();
    setAddress(withoutLocation(next));
  }
  function change(field: keyof DeliveryProfileAddress, value: string) {
    edit({ ...address, [field]: value });
  }
  const needsConfirmation = !["idle", "validated"].includes(confirmation.state.kind);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy && !needsConfirmation) onCheck({
      street: address.street.trim(), addressLine2: address.addressLine2?.trim() || null,
      city: address.city.trim(), state: address.state, postalCode: address.postalCode.trim(),
      ...(address.confirmedLocation && { confirmedLocation: address.confirmedLocation }),
      ...(expectedProfileAddressKey && { expectedProfileAddressKey }),
    });
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-street`}>Street address</Label>
          <AddressAutocomplete id={`${id}-street`} required autoFocus={!confirmationError} maxLength={150} value={address.street}
            disabled={busy} onChange={event => change("street", event.target.value)}
            contextKey={[address.city, address.state, address.postalCode].join("|")}
            onAddressSelect={place => edit({ ...place, addressLine2: place.addressLine2 ?? address.addressLine2 })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-unit`}>Apartment, suite or unit (optional)</Label>
          <Input id={`${id}-unit`} autoComplete="address-line2" maxLength={150}
            value={address.addressLine2 ?? ""} onChange={event => change("addressLine2", event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-city`}>City</Label>
          <Input id={`${id}-city`} required maxLength={100} autoComplete="address-level2"
            value={address.city} onChange={event => change("city", event.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-state`}>State</Label>
            <select id={`${id}-state`} required autoComplete="address-level1" value={address.state}
              onChange={event => change("state", event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {US_STATES.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-zip`}>ZIP code</Label>
            <Input id={`${id}-zip`} required autoComplete="postal-code" inputMode="numeric"
              maxLength={10} pattern="[0-9]{5}(-[0-9]{4})?" title="Enter a ZIP code or ZIP+4" value={address.postalCode}
              onChange={event => change("postalCode", event.target.value)} />
          </div>
        </div>
        <AddressConfirmationPanel confirmation={confirmation} address={address} purpose="delivery"
          disabled={busy || confirmation.checking} onEdit={() => edit(address)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant={saveVariant} disabled={needsConfirmation}>{busy ? "Checking…" : "Save address & check delivery"}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        </div>
      </fieldset>
    </form>
  );
}

export function SavedAddressResult({ result }: { result: ClientDeliveryCoverage }) {
  return <div role="status" className="space-y-3">
    <h3 className="font-semibold">Address saved</h3>
    {result.available === false && <p>This address is outside our delivery area.</p>}
    <p>You can pick up your order at our <strong className="font-semibold">Miami warehouse</strong> when it’s ready. Pickup has no delivery fee.</p>
    <ClientDeliveryPrice available={result.available} estimatedPrice={result.estimatedPrice} />
  </div>;
}

type PanelProps = {
  coverage: ClientDeliveryCoverage;
  estimateId?: number;
  requiredForCheckout?: boolean;
  onAcknowledged?: (result: ClientDeliveryCoverage) => void;
  onChecked?: (result: ClientDeliveryCoverage) => void;
  onBusyChange?: (value: boolean) => void;
  onCancelAddress?: () => void;
  disabled?: boolean;
};

export function ClientDeliveryCoveragePanel({
  coverage, estimateId, requiredForCheckout = true, onAcknowledged, onChecked, onBusyChange, onCancelAddress, disabled = false,
}: PanelProps) {
  const titleId = useId();
  const [editor, setEditor] = useState<AddressEditor | null>(onCancelAddress ? { initial: null } : null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setWorking(true);
    onBusyChange?.(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      if (mounted.current && isApiError(cause) && cause.status === 409) {
        const current = await getClientDeliveryCoverage(estimateId).catch(() => null);
        if (mounted.current && current) {
          if (current.address) {
            setEditor(null);
            onChecked?.(current);
            return;
          }
          if (!current.canAddProfileAddress) {
            setEditor(null);
            if (estimateId) onAcknowledged?.(current);
            else onChecked?.(current);
            return;
          }
          if (estimateId && current.reviewComplete) onAcknowledged?.(current);
        }
      }
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not check delivery. Please try again.");
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setWorking(false);
        onBusyChange?.(false);
      }
    }
  }
  function check(address: DeliveryAddressCheck) {
    void run(async () => {
      let result: ClientDeliveryCoverage;
      try {
        result = await checkClientDeliveryAddress({ ...address, onlyIfMissing: true });
      } catch (cause) {
        if (!mounted.current) return;
        const data = isApiError(cause) && cause.status === 400 ? cause.data : null;
        if (data && typeof data === "object" && "code" in data && "address" in data &&
            ["ADDRESS_CONFIRMATION_REQUIRED", "DELIVERY_ADDRESS_CONFIRMATION_REQUIRED", "ADDRESS_LOCATION_CONFIRMATION_REQUIRED", "ADDRESS_VERIFICATION_FAILED"].includes(String(data.code))) {
          const entered = data.address as DeliveryProfileAddress | undefined;
          if (entered?.street && entered.city && entered.state && entered.postalCode) {
            setEditor({
              initial: entered, confirmationError: cause,
              expectedProfileAddressKey: "expectedProfileAddressKey" in data && typeof data.expectedProfileAddressKey === "string"
                ? data.expectedProfileAddressKey : undefined,
            });
            setEditorRevision(value => value + 1);
            return;
          }
        }
        throw cause;
      }
      if (!mounted.current) return;
      setEditor(null);
      onChecked?.(result);
    });
  }
  function confirmPickupAvailable() {
    if (!estimateId) return;
    void run(async () => {
      const result = await confirmClientCanPickUp(estimateId);
      if (!mounted.current) return;
      setEditor(null);
      onAcknowledged?.(result);
    });
  }
  const busy = working || disabled;
  const { address } = coverage;
  if (address) {
    if (coverage.estimatedPrice === undefined) return null;
    return <div className="rounded-md border p-4 text-sm"><SavedAddressResult result={coverage} /></div>;
  }
  if (!coverage.canAddProfileAddress) return null;
  const requiredForPayment = estimateId !== undefined && requiredForCheckout && coverage.applies && !coverage.reviewComplete;
  const addressForm = editor && (
    <CoverageAddressForm key={editorRevision} {...editor} busy={busy} onCheck={check}
      saveVariant={onCancelAddress ? "green" : requiredForPayment ? "default" : "outline"}
      cancelLabel={onCancelAddress ? "Cancel address" : "Cancel"}
      onCancel={onCancelAddress ?? (() => { setEditor(null); setError(""); })} />
  );
  if (onCancelAddress) {
    return <>
      {addressForm}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </>;
  }
  if (estimateId !== undefined && !requiredForPayment && !editor) {
    return <div className="space-y-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditor({ initial: null }); setError(""); }}>
        <MapPin aria-hidden="true" /> Add my address
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>;
  }
  const title = requiredForPayment ? "Add your address to check delivery availability" : "Do we deliver to your address?";
  const pickupButton = requiredForPayment && (
    <Button type="button" variant="outline"
      disabled={busy} onClick={confirmPickupAvailable}>I can pick up in Miami</Button>
  );
  return (
    <section id={estimateId ? `delivery-review-${estimateId}` : undefined} tabIndex={estimateId ? -1 : undefined}
      data-delivery-pending={requiredForPayment || undefined} aria-labelledby={titleId}
      className={requiredForPayment
        ? "scroll-mt-32 space-y-3 rounded-lg border border-l-4 border-amber-300 border-l-amber-600 bg-amber-50 p-4 text-sm text-slate-950 focus-visible:outline-2 focus-visible:outline-amber-700 sm:p-5"
        : "space-y-3 rounded-md border p-4 text-sm"}>
      <div className="space-y-1">
        {requiredForPayment && <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">
          <MapPin aria-hidden="true" className="size-4 shrink-0" /> Required before payment
        </p>}
        <h3 id={titleId} className={requiredForPayment ? "text-lg font-semibold leading-snug" : "font-semibold"}>{title}</h3>
        <p className={requiredForPayment ? "text-slate-700" : "text-muted-foreground"}>{requiredForPayment
          ? "Save your address to see whether we deliver there and how much it would cost. You can also confirm you can pick up in Miami."
          : "Save your address to see whether we deliver there and how much it would cost. You can also do this later."}</p>
      </div>
      {editor ? (
        <>
          {addressForm}
          {pickupButton}
        </>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant={requiredForPayment ? "default" : "outline"} disabled={busy}
            onClick={() => { setEditor({ initial: null }); setError(""); }}>
            {requiredForPayment ? "Enter my address" : "Add my address"}
          </Button>
          {pickupButton}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

type CheckoutProps = {
  estimateId: number;
  requiredForCheckout?: boolean;
  onAcknowledged: () => void;
  onProfileAddressSaved?: (address: DeliveryProfileAddress) => void;
};

export function ClientDeliveryReview(props: CheckoutProps) {
  return <CheckoutCoverage key={props.estimateId} {...props} />;
}

function CheckoutCoverage({ estimateId, requiredForCheckout = true, onAcknowledged, onProfileAddressSaved }: CheckoutProps) {
  const [coverage, setCoverage] = useState<ClientDeliveryCoverage | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const callback = useRef(onAcknowledged);
  const statusVersion = useRef(0);
  useEffect(() => { callback.current = onAcknowledged; }, [onAcknowledged]);
  useEffect(() => {
    let active = true;
    const version = statusVersion.current;
    getClientDeliveryCoverage(estimateId).then(current => {
      if (!active || version !== statusVersion.current) return;
      setError("");
      setCoverage(current);
      if (requiredForCheckout && current.reviewComplete) {
        callback.current();
      }
    }).catch(cause => {
      if (active && version === statusVersion.current) setError(cause instanceof Error ? cause.message : "Could not load delivery options.");
    });
    return () => { active = false; };
  }, [estimateId, attempt, requiredForCheckout]);
  if (error) return <div className="space-y-2"><p role="alert">{error}</p>
    <Button variant="outline" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try again</Button></div>;
  if (!coverage) return <span role="status" className="sr-only">Loading saved address…</span>;
  if (!coverage.canAddProfileAddress) {
    if (!showResult) return null;
    return <section aria-label="Delivery availability" className="space-y-2 rounded-md border p-4 text-sm">
      <SavedAddressResult result={coverage} />
      <Button type="button" size="sm" variant="outline" onClick={() => setShowResult(false)}>Done</Button>
    </section>;
  }
  return <div className="space-y-2">
    <ClientDeliveryCoveragePanel coverage={coverage} estimateId={estimateId} requiredForCheckout={requiredForCheckout}
      onChecked={result => {
        statusVersion.current++;
        if (result.address) onProfileAddressSaved?.(result.address);
        setCoverage(result);
        if (result.reviewComplete) {
          setShowResult(result.estimatedPrice !== undefined);
          if (requiredForCheckout) callback.current();
        }
      }}
      onAcknowledged={result => {
        statusVersion.current++;
        setCoverage(result);
        if (requiredForCheckout && result.reviewComplete) callback.current();
      }} />
  </div>;
}
