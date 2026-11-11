"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WarehousePoInventory } from "@/app/api/warehouse.api";
import { customerDeliveryPoOptions, type CustomerDeliveryRun } from "@/app/api/customer-delivery-runs.api";
import { errorMessage, Pagination } from "../warehouse-shared";
import { UnitOrigin, poDisplayName } from "../unit-origin";

const PAGE_SIZE = 10;
const MAX_POS = 50;
type SelectedPo = {
  poNumber: string;
  poName?: string;
  source: "ORDER" | "EXTERNAL";
  orderNumber: string;
};
type Selection = { context: string; items: Record<string, SelectedPo> };
type InventoryState = {
  key: string;
  loading: boolean;
  data?: WarehousePoInventory;
  error?: string;
};

export function CustomerDeliveryPoPicker({
  run,
  technician,
  disabled,
  onAdd,
}: {
  run: CustomerDeliveryRun;
  technician: boolean;
  disabled: boolean;
  onAdd: (keys: string[]) => Promise<boolean>;
}) {
  const context = `${run.id}:${technician ? "technician" : "warehouse"}`;
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    context,
    search: "",
    page: 1,
    revision: 0,
  });
  const activeQuery =
    query.context === context
      ? query
      : { context, search: "", page: 1, revision: 0 };
  const { search, page, revision } = activeQuery;
  const queryKey = JSON.stringify([context, search, page, revision]);
  const [inventory, setInventory] = useState<InventoryState>({
    key: queryKey,
    loading: true,
  });
  const [selection, setSelection] = useState<Selection>({ context, items: {} });
  const [adding, setAdding] = useState(false),
    [addError, setAddError] = useState("");
  const serial = useRef(0),
    addLock = useRef(false),
    mounted = useRef(true),
    liveContext = useRef(context);
  liveContext.current = context;
  const included = new Set(run.orders.map((order) => order.key));
  const selected = Object.fromEntries(
    Object.entries(selection.context === context ? selection.items : {}).filter(
      ([key]) => !included.has(key),
    ),
  );
  const selectedKeys = Object.keys(selected);
  const remaining = Math.max(0, MAX_POS - included.size);
  const overLimit = selectedKeys.length > remaining;
  const controlsDisabled = disabled || adding || run.status !== "ACTIVE";
  const loading = inventory.key !== queryKey || inventory.loading;
  const data = inventory.key === queryKey ? inventory.data : undefined;
  const loadError = inventory.key === queryKey ? inventory.error : undefined;
  const groups = (data?.items ?? []).flatMap((group) => {
    if (
      !/^(?:order|external):[1-9]\d*$/.test(group.key) ||
      !group.poNumber?.trim()
    )
      return [];
    const available = group.units.filter((unit) => unit.onHand > 0);
    const parts = available.reduce((total, unit) => total + unit.onHand, 0);
    const locations = new Map<number | null, { name: string; quantity: number }>();
    for (const unit of available) {
      for (const store of unit.stores.filter((location) => location.onHand > 0)) {
        const current = locations.get(store.id);
        locations.set(store.id, { name: store.name, quantity: (current?.quantity ?? 0) + store.onHand });
      }
      if (unit.unassigned > 0) {
        locations.set(null, { name: "Unassigned", quantity: (locations.get(null)?.quantity ?? 0) + unit.unassigned });
      }
    }
    return parts > 0 ? [{ group, pieces: available.length, parts,
      locations: [...locations.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }] : [];
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      serial.current++;
    };
  }, []);

  useEffect(() => {
    setSearchInput("");
    setSelection({ context, items: {} });
    setAddError("");
    setQuery({ context, search: "", page: 1, revision: 0 });
  }, [context]);

  useEffect(() => {
    const request = ++serial.current;
    let canceled = false;
    setInventory({ key: queryKey, loading: true });
    void customerDeliveryPoOptions(run.id, {
      page,
      pageSize: PAGE_SIZE,
      search,
    })
      .then((result) => {
        if (
          canceled ||
          request !== serial.current ||
          liveContext.current !== context
        )
          return;
        setInventory({ key: queryKey, loading: false, data: result });
      })
      .catch((error) => {
        if (
          canceled ||
          request !== serial.current ||
          liveContext.current !== context
        )
          return;
        setInventory({
          key: queryKey,
          loading: false,
          error: errorMessage(error),
        });
      });
    return () => {
      canceled = true;
    };
  }, [context, run.id, page, queryKey, search]);

  function searchPos(event: FormEvent) {
    event.preventDefault();
    if (controlsDisabled) return;
    setAddError("");
    setQuery({
      context,
      search: searchInput.trim(),
      page: 1,
      revision: revision + 1,
    });
  }
  function toggle(key: string, value: SelectedPo, checked: boolean) {
    if (controlsDisabled || loading || included.has(key)) return;
    setSelection((previous) => {
      const items = Object.fromEntries(
        Object.entries(
          previous.context === context ? previous.items : {},
        ).filter(([poKey]) => !included.has(poKey)),
      );
      if (!checked) delete items[key];
      else if (Object.keys(items).length < remaining) items[key] = value;
      return { context, items };
    });
    setAddError("");
  }
  async function addSelected() {
    if (
      controlsDisabled ||
      addLock.current ||
      !selectedKeys.length ||
      overLimit
    )
      return;
    const submittedContext = context;
    addLock.current = true;
    setAdding(true);
    setAddError("");
    try {
      const added = await onAdd(selectedKeys);
      if (!mounted.current || liveContext.current !== submittedContext) return;
      if (added) setSelection({ context, items: {} });
    } catch (error) {
      if (mounted.current && liveContext.current === submittedContext)
        setAddError(errorMessage(error));
    } finally {
      addLock.current = false;
      if (mounted.current) setAdding(false);
    }
  }

  return (
    <section className="space-y-3" aria-label="Choose delivery POs">
      <form onSubmit={searchPos} className="space-y-2">
        <Label htmlFor={`delivery-po-search-${run.id}`}>
          Search by PO or customer
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`delivery-po-search-${run.id}`}
            placeholder="PO number or customer name"
            maxLength={150}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            disabled={controlsDisabled}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={controlsDisabled}>
              <Search className="mr-2 size-4" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled || loading}
              onClick={() =>
                setQuery({ ...activeQuery, revision: revision + 1 })
              }
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </form>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {loadError} Use Refresh to try again.
        </p>
      )}
      {addError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {addError}
        </p>
      )}
      {loading && (
        <p role="status" className="py-3 text-sm text-slate-600">
          Loading available POs…
        </p>
      )}
      {!loading && !loadError && !groups.length && (
        <p className="rounded-xl border border-dashed bg-white p-4 text-sm text-slate-600">
          {search
            ? "No available POs match this search."
            : "No POs with available parts on this page."}
        </p>
      )}
      <div className="grid gap-2" aria-busy={loading}>
        {groups.map(({ group, pieces, parts, locations }) => {
          const added = included.has(group.key),
            checked = added || Boolean(selected[group.key]);
          const atLimit = !checked && selectedKeys.length >= remaining;
          const origin =
            group.source === "EXTERNAL"
              ? "External PO"
              : `Order ${group.orderNumber || group.orderId}`;
          return (
            <label
              key={group.key}
              className={`flex items-start gap-3 rounded-xl border p-3 ${added ? "border-slate-200 bg-slate-50" : checked ? "border-slate-400 bg-slate-50" : "bg-white"}`}
            >
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0"
                aria-label={`Select PO ${group.poNumber} (${origin})`}
                checked={checked}
                disabled={controlsDisabled || loading || added || atLimit}
                onChange={(event) =>
                  toggle(
                    group.key,
                    {
                      poNumber: group.poNumber,
                      poName: poDisplayName(group),
                      source: group.source,
                      orderNumber: group.orderNumber,
                    },
                    event.target.checked,
                  )
                }
              />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">PO {group.poNumber}</span>
                  {added && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                      <Check className="size-3" />
                      Added
                    </span>
                  )}
                </span>
                <span className="block text-xs text-slate-600">
                  <UnitOrigin unit={group} showName={false} />
                </span>
                {group.customer && (
                  <span className="block break-words text-sm font-medium">
                    {group.customer}
                  </span>
                )}
                {group.project && group.project !== group.customer && (
                  <span className="block break-words text-sm text-slate-600">
                    {group.project}
                  </span>
                )}
                <span className="block text-sm text-slate-600">
                  {pieces} {pieces === 1 ? "piece" : "pieces"} · {parts}{" "}
                  physical {parts === 1 ? "part" : "parts"} available
                </span>
                <span className="block break-words text-xs text-slate-500">
                  {locations.map((location) => `${location.name}: ${location.quantity}`).join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {data && (
        <Pagination
          page={page}
          total={data.total}
          pageSize={PAGE_SIZE}
          onPage={(next) => {
            if (!controlsDisabled && !loading)
              setQuery({ ...activeQuery, page: next });
          }}
          disabled={controlsDisabled || loading}
          label="POs"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p role="status" className="text-sm text-slate-600">
          {selectedKeys.length} {selectedKeys.length === 1 ? "PO" : "POs"}{" "}
          selected{selectedKeys.length > 0 ? " across pages" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedKeys.length > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => {
                setSelection({ context, items: {} });
                setAddError("");
              }}
            >
              Clear selection
            </Button>
          )}
          <Button
            type="button"
            disabled={controlsDisabled || !selectedKeys.length || overLimit}
            onClick={addSelected}
          >
            <Plus className="mr-2 size-4" />
            {adding ? "Adding POs…" : "Add selected POs"}
          </Button>
        </div>
      </div>
      {remaining === 0 && (
        <p className="text-sm text-amber-800">
          This delivery already includes the maximum of 50 POs.
        </p>
      )}
      {remaining > 0 && (selectedKeys.length >= remaining || overLimit) && (
        <p className="text-sm text-amber-800">
          {overLimit
            ? `Only ${remaining} more POs can be added. Clear your selection and choose fewer POs.`
            : "The selection has reached the 50 PO limit for this delivery."}
        </p>
      )}
    </section>
  );
}
