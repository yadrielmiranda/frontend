"use client";

import { useState, type FormEvent } from "react";
import { updateDoorDesign } from "@/app/api/door-designs.api";
import { FrenchDoorDesignThumbnail } from "@/components/piece-diagram/renderers/french-door/french-door-design-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DoorDesignCatalogEntry, DoorDesignKind } from "@/lib/door-designs";

const filters = [
  { value: "ALL", label: "All" },
  { value: "SINGLE", label: "Single door" },
  { value: "DOUBLE", label: "Double door" },
] as const;

function DoorDesignEditor({ initial, visible }: { initial: DoorDesignCatalogEntry; visible: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [code, setCode] = useState(initial.code);
  const [price, setPrice] = useState(initial.unitPrice ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = code.trim() !== saved.code || price !== (saved.unitPrice ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !dirty) return;
    setError("");
    setMessage("");
    if (!code.trim() || (price && !/^\d+(\.\d{1,2})?$/.test(price))) {
      setError("Enter a code and a nonnegative price with up to two decimal places.");
      return;
    }
    setBusy(true);
    try {
      const result = await updateDoorDesign(saved.id, {
        ...(code.trim() !== saved.code ? { code: code.trim() } : {}),
        ...(price !== (saved.unitPrice ?? "") ? { unitPrice: price || null } : {}),
      });
      setSaved(result);
      setCode(result.code);
      setPrice(result.unitPrice ?? "");
      setMessage("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the design.");
    } finally {
      setBusy(false);
    }
  }
  // Preserve draft fields while another door type is selected.
  if (!visible) return null;
  return <form onSubmit={save} className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4">
    <div className="h-24 w-20 shrink-0">
      <FrenchDoorDesignThumbnail artworkKey={saved.artworkKey} />
    </div>
    <div className="min-w-[9rem] flex-1">
      <h2 className="mb-2 font-semibold">{saved.kind === "SINGLE" ? "Single door" : "Double door"}</h2>
      <label htmlFor={`door-code-${saved.id}`} className="text-sm font-medium">Design code</label>
      <Input id={`door-code-${saved.id}`} maxLength={80} required disabled={busy} value={code}
        onChange={event => { setCode(event.target.value); setMessage(""); setError(""); }} />
    </div>
    <div className="w-40">
      <label htmlFor={`door-price-${saved.id}`} className="text-sm font-medium">Unit price (USD)</label>
      <Input id={`door-price-${saved.id}`} type="text" inputMode="decimal" placeholder="Price not set" disabled={busy} value={price}
        onChange={event => { setPrice(event.target.value); setMessage(""); setError(""); }} />
    </div>
    <Button type="submit" disabled={busy || !dirty}>{busy ? "Saving…" : "Save"}</Button>
    {(error || message) && <p className={`basis-full text-sm ${error ? "text-destructive" : "text-green-700"}`}
      role={error ? "alert" : "status"}>{error || message}</p>}
  </form>;
}

export function DoorDesignCatalog({ designs }: { designs: DoorDesignCatalogEntry[] }) {
  const [filter, setFilter] = useState<"ALL" | DoorDesignKind>("ALL");
  const matchesFilter = (design: DoorDesignCatalogEntry) => filter === "ALL" || design.kind === filter;

  return <div className="space-y-4">
    <div role="group" aria-label="Filter by door type" className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted p-1">
      {filters.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm">
          {label}
        </button>
      ))}
    </div>
    <div className="space-y-3">
      {designs.map(design => <DoorDesignEditor key={design.id} initial={design} visible={matchesFilter(design)} />)}
      {!designs.some(matchesFilter) && <p role="status" className="text-sm text-muted-foreground">
        {filter === "ALL" ? "No door designs in the catalog." : "No designs for this door type."}
      </p>}
    </div>
  </div>;
}
