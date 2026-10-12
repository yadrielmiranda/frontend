"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { materialSaleCustomers, type MaterialSaleCustomer, type MaterialSaleCustomerInput } from "@/app/api/materials.api";
import { useAuth } from "@/contexts/AuthContext";
import { errorText, MaterialField, MaterialNotice, materialInputClass } from "./materials-shared";

export type MaterialSaleCustomerSelection = {
  mode: "registered" | "unregistered";
  customer: MaterialSaleCustomer | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export function emptyMaterialSaleCustomer(): MaterialSaleCustomerSelection {
  return { mode: "unregistered", customer: null, customerName: "", customerEmail: "", customerPhone: "" };
}

export function materialSaleCustomerInput(value: MaterialSaleCustomerSelection): MaterialSaleCustomerInput | null {
  if (value.mode === "registered") {
    return value.customer && Number.isInteger(value.customer.id) && value.customer.id > 0
      ? { customerUserId: value.customer.id }
      : null;
  }
  const customerName = value.customerName.trim();
  return customerName ? {
    customerName,
    customerEmail: value.customerEmail.trim() || undefined,
    customerPhone: value.customerPhone.trim() || undefined,
  } : null;
}

type Lookup = { sequence: number; query: string; results: MaterialSaleCustomer[]; searching: boolean; searched: boolean; error: string };
const emptyLookup = (sequence: number, query = ""): Lookup => ({ sequence, query, results: [], searching: false, searched: false, error: "" });
const accountIdentity = (account: { id: number; role?: { name?: string } } | null) => account ? `${account.id}:${account.role?.name ?? ""}` : "";

export function MaterialSaleCustomerFields({ value, onChange, disabled = false }: {
  value: MaterialSaleCustomerSelection;
  onChange: (value: MaterialSaleCustomerSelection) => void;
  disabled?: boolean;
}) {
  const { user, revalidate } = useAuth();
  const accountKey = accountIdentity(user);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const context = useRef({ accountKey, mode: value.mode, disabled });
  const latest = useRef({ value, onChange, disabled, accountKey });
  latest.current = { value, onChange, disabled, accountKey };
  if (context.current.accountKey !== accountKey || context.current.mode !== value.mode || context.current.disabled !== disabled) {
    sequence.current++;
    context.current = { accountKey, mode: value.mode, disabled };
  }
  const [lookup, setLookup] = useState<Lookup>(() => emptyLookup(sequence.current));
  const currentLookup = lookup.sequence === sequence.current ? lookup : emptyLookup(sequence.current);
  const renderedSequence = sequence.current;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function editable(request = renderedSequence) {
    return mounted.current && !latest.current.disabled && request === sequence.current && latest.current.accountKey === accountKey;
  }
  function resetLookup(query = "") {
    const request = ++sequence.current;
    setLookup(emptyLookup(request, query));
  }
  function clearCustomer(query = "") {
    if (!editable()) return;
    resetLookup(query);
    latest.current.onChange({ ...latest.current.value, customer: null });
  }
  async function findCustomers() {
    const query = currentLookup.query.trim();
    if (!editable() || value.mode !== "registered" || !accountKey || query.length < 2) return;
    const request = ++sequence.current;
    setLookup({ ...emptyLookup(request, query), searching: true });
    try {
      const account = await revalidate();
      if (!editable(request) || accountIdentity(account) !== accountKey) return;
      const results = await materialSaleCustomers(query);
      if (!editable(request)) return;
      const verified = await revalidate();
      if (!editable(request) || accountIdentity(verified) !== accountKey) return;
      setLookup({ ...emptyLookup(request, query), results, searched: true });
    } catch (error) {
      if (editable(request)) setLookup({ ...emptyLookup(request, query), error: errorText(error) });
    } finally {
      if (editable(request)) setLookup(current => ({ ...current, searching: false }));
    }
  }
  function updateManual(key: "customerName" | "customerEmail" | "customerPhone", next: string) {
    if (!editable() || latest.current.value.mode !== "unregistered") return;
    latest.current.onChange({ ...latest.current.value, [key]: next });
  }

  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <MaterialField label="Customer type"><select className={materialInputClass} value={value.mode} onChange={event => {
      if (!editable()) return;
      resetLookup();
      latest.current.onChange({ ...latest.current.value, mode: event.target.value === "registered" ? "registered" : "unregistered", customer: null });
    }}><option value="unregistered">Unregistered customer</option><option value="registered">Registered customer</option></select></MaterialField>
    {value.mode === "registered" ? <div className="space-y-3">
      {value.customer ? <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-slate-50 p-4 text-sm">
        <div className="min-w-0"><p className="font-semibold">{value.customer.name}</p>{value.customer.email && <p className="break-all text-muted-foreground">{value.customer.email}</p>}{value.customer.phone && <p className="text-muted-foreground">{value.customer.phone}</p>}<p className="mt-2 text-xs text-muted-foreground">This sale will appear in the customer's material orders after confirmation.</p></div>
        <Button type="button" size="sm" variant="outline" onClick={() => clearCustomer()}>Change customer</Button>
      </div> : <>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1"><MaterialField label="Find registered customer" hint="Search by name or email. Enter at least 2 characters."><Input maxLength={200} autoComplete="off" value={currentLookup.query} placeholder="Customer name or email" onChange={event => clearCustomer(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void findCustomers(); } }} /></MaterialField></div>
          <Button type="button" variant="outline" disabled={disabled || currentLookup.searching || currentLookup.query.trim().length < 2} onClick={() => void findCustomers()}>{currentLookup.searching ? "Searching…" : "Search customers"}</Button>
        </div>
        <MaterialNotice error={currentLookup.error} />
        {currentLookup.searching && <p role="status" className="text-sm text-muted-foreground">Searching customers…</p>}
        {currentLookup.results.length > 0 && <ul aria-label="Matching customers" className="max-h-64 divide-y overflow-y-auto rounded-lg border">{currentLookup.results.map(candidate => <li key={candidate.id}><button type="button" className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px]" onClick={() => {
          if (!editable() || latest.current.value.mode !== "registered") return;
          resetLookup();
          latest.current.onChange({ ...latest.current.value, customer: candidate });
        }}><span className="font-medium">{candidate.name}</span><span className="break-all text-muted-foreground">{candidate.email || "No email on this account"}{candidate.phone ? ` · ${candidate.phone}` : ""}</span></button></li>)}</ul>}
        {currentLookup.searched && !currentLookup.results.length && <p className="text-sm text-muted-foreground">No matching customers. Try another name or email, or choose Unregistered customer.</p>}
      </>}
    </div> : <div className="grid gap-4 sm:grid-cols-2">
      <MaterialField label="Customer name"><Input required maxLength={200} value={value.customerName} onChange={event => updateManual("customerName", event.target.value)} /></MaterialField>
      <MaterialField label="Customer email (optional)"><Input type="email" maxLength={200} value={value.customerEmail} onChange={event => updateManual("customerEmail", event.target.value)} /></MaterialField>
      <MaterialField label="Customer phone (optional)"><Input maxLength={40} value={value.customerPhone} onChange={event => updateManual("customerPhone", event.target.value)} /></MaterialField>
    </div>}
    <p className="text-xs text-muted-foreground">{value.mode === "registered" ? "The selected account supplies the customer's contact details. " : "No account is required. "}When payment is complete, the customer receives an order email with access to the invoice if an email is available. Without an email, use Print invoice on the sale.</p>
  </fieldset>;
}
