"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MuntinAvailability, MuntinType } from "@/lib/types";

export type MuntinAvailabilitySettings = {
  muntinAvailability: MuntinAvailability;
  allowedMuntinTypeIds: number[];
};

const choices: { value: MuntinAvailability; label: string; description: string }[] = [
  { value: "NONE", label: "No muntin", description: "Full View only." },
  { value: "ALL", label: "All active types", description: "Includes types activated later." },
  { value: "SELECTED", label: "Selected types", description: "Allow only the types checked below." },
];

export function MuntinAvailabilityDialog({
  configName,
  availability = "ALL",
  allowedTypeIds = [],
  types,
  onSave,
}: {
  configName: string;
  availability?: MuntinAvailability;
  allowedTypeIds?: readonly number[];
  types: readonly MuntinType[];
  onSave: (settings: MuntinAvailabilitySettings) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MuntinAvailability>(availability);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const groupId = useId();
  const inFlight = useRef(false);
  const activeTypes = types.filter((type) => type.isActive);
  const activeIds = new Set(activeTypes.map((type) => type.id));
  const selectedActiveIds = selectedIds.filter((id) => activeIds.has(id));
  const savedActiveCount = allowedTypeIds.filter((id) => activeIds.has(id)).length;
  const summary = availability === "NONE"
    ? "No muntin"
    : availability === "SELECTED"
      ? `${savedActiveCount} selected ${savedActiveCount === 1 ? "type" : "types"}`
      : "All active types";

  function changeOpen(next: boolean) {
    if (inFlight.current) return;
    if (next) {
      setMode(availability);
      setSelectedIds(allowedTypeIds.filter((id) => activeIds.has(id)));
    }
    setOpen(next);
  }

  async function save() {
    if (inFlight.current || (mode === "SELECTED" && selectedActiveIds.length === 0)) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const saved = await onSave({
        muntinAvailability: mode,
        allowedMuntinTypeIds: mode === "SELECTED" ? selectedActiveIds : [],
      });
      if (saved) setOpen(false);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left text-xs"
          aria-label={`Manage muntin for config ${configName}: ${summary}`}>
          Muntin: {summary}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto" showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>Muntin · {configName}</DialogTitle>
          <DialogDescription>Choose the muntin types available for this series and configuration. Full View is always available.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Availability</legend>
          {choices.map((choice) => (
            <label key={choice.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${mode === choice.value ? "border-primary bg-muted/40" : ""}`}>
              <input type="radio" name={`muntin-availability-${groupId}`} value={choice.value} checked={mode === choice.value}
                onChange={() => setMode(choice.value)} className="mt-1 accent-primary" />
              <span><span className="block text-sm font-medium">{choice.label}</span>
                <span className="block text-xs text-muted-foreground">{choice.description}</span></span>
            </label>
          ))}
        </fieldset>
        {mode === "SELECTED" && (
          <fieldset disabled={saving} className="space-y-2" aria-describedby={selectedActiveIds.length === 0 ? `${groupId}-selection-help` : undefined}>
            <legend className="mb-2 text-sm font-medium">Active muntin types</legend>
            {activeTypes.length ? (
              <>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                  {activeTypes.map((type) => (
                    <label key={type.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-muted/40">
                      <input type="checkbox" checked={selectedActiveIds.includes(type.id)}
                        onChange={(event) => setSelectedIds((current) => event.target.checked
                          ? [...current, type.id]
                          : current.filter((id) => id !== type.id))} />
                      {type.name}
                    </label>
                  ))}
                </div>
                {selectedActiveIds.length === 0 && <p id={`${groupId}-selection-help`} role="status" className="text-xs text-muted-foreground">Select at least one type, or choose No muntin.</p>}
              </>
            ) : (
              <p id={`${groupId}-selection-help`} className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No active muntin types. <Link href="/settings/muntin-types" className="underline">Manage muntin types</Link> to activate one.
              </p>
            )}
          </fieldset>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="button" disabled={saving || (mode === "SELECTED" && selectedActiveIds.length === 0)} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
