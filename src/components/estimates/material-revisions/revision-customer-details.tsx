"use client";

import type { MaterialRevisionCustomer } from "@/app/api/material-revisions.api";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/us-states";

export const revisionCustomerFields: Array<{ key: keyof MaterialRevisionCustomer; label: string; maxLength: number; type?: "email" | "tel" }> = [
  { key: "name", label: "Estimate name", maxLength: 255 },
  { key: "firstName", label: "First name", maxLength: 100 },
  { key: "lastName", label: "Last name", maxLength: 100 },
  { key: "email", label: "Email", maxLength: 150, type: "email" },
  { key: "phone", label: "Phone", maxLength: 30, type: "tel" },
  { key: "street", label: "Street address", maxLength: 150 },
  { key: "addressLine2", label: "Apartment, suite, unit (optional)", maxLength: 150 },
  { key: "city", label: "City", maxLength: 100 },
  { key: "state", label: "State", maxLength: 2 },
  { key: "postalCode", label: "ZIP code", maxLength: 5 },
];

export function revisionCustomerChanges(before: MaterialRevisionCustomer, after: MaterialRevisionCustomer) {
  return revisionCustomerFields.filter(({ key }) => (before[key] ?? "") !== (after[key] ?? ""));
}

export function RevisionCustomerComparison({ before, after }: {
  before?: MaterialRevisionCustomer | null;
  after?: MaterialRevisionCustomer | null;
}) {
  if (!before || !after) return null;
  const changes = revisionCustomerChanges(before, after);
  if (!changes.length) return null;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <caption className="mb-3 text-left font-semibold">Customer and estimate changes</caption>
    <thead><tr className="border-b"><th className="p-2">Detail</th><th className="p-2">Current</th><th className="p-2">Revised</th></tr></thead>
    <tbody>{changes.map(({ key, label }) => <tr key={key} className="border-b align-top"><th scope="row" className="p-2 font-medium">{label}</th><td className="max-w-xs break-words p-2">{before[key] || "—"}</td><td className="max-w-xs break-words p-2">{after[key] || "—"}</td></tr>)}</tbody>
  </table></div>;
}

export function RevisionCustomerDetails({ value, disabled, dirty, onChange, onSave, onDiscard }: {
  value: MaterialRevisionCustomer;
  disabled: boolean;
  dirty: boolean;
  onChange: (value: MaterialRevisionCustomer) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return <form className="space-y-4 rounded-lg border p-4" onSubmit={event => { event.preventDefault(); if (!disabled && dirty) onSave(); }}>
    <h3 className="font-semibold">Customer details and estimate</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      {revisionCustomerFields.map(({ key, label, maxLength, type }) => <div key={key} className={key === "street" ? "sm:col-span-2" : ""}>
        {key === "street" && <div className="mb-4"><h4 className="font-semibold">Customer address</h4><p className="mt-1 text-sm text-muted-foreground">The installation address is managed separately.</p></div>}
        <label htmlFor={`revision-customer-${key}`} className="mb-1.5 block text-sm font-medium">{label}</label>
        {key === "street" ? <AddressAutocomplete id={`revision-customer-${key}`} value={value.street} maxLength={maxLength} disabled={disabled}
          contextKey={JSON.stringify([value.city, value.state, value.postalCode])}
          onChange={event => onChange({ ...value, street: event.target.value })}
          onAddressSelect={selected => onChange({ ...value, ...selected })} />
          : key === "state" ? <select id={`revision-customer-${key}`} value={value.state} disabled={disabled}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" onChange={event => onChange({ ...value, state: event.target.value })}>
            <option value="">Select state</option>{US_STATES.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
          </select>
          : <Input id={`revision-customer-${key}`} value={value[key] ?? ""} disabled={disabled} required={key === "name"} type={type ?? "text"} maxLength={maxLength}
            onChange={event => onChange({ ...value, [key]: event.target.value })} />}
      </div>)}
    </div>
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={disabled || !dirty}>Save customer changes</Button>
      {dirty && <Button type="button" variant="outline" disabled={disabled} onClick={onDiscard}>Discard unsaved changes</Button>}
    </div>
    <p className="text-sm text-muted-foreground">Changes are saved in this revision and apply only after approval.</p>
  </form>;
}
