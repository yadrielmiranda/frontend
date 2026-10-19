"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createEnergyRating, updateEnergyRating } from "@/app/api/energy-ratings.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EnergyCatalogOptions, EnergyOption, EnergyRating, EnergyRatingInput } from "@/lib/energy-ratings";

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50";
const textOrNull = (value: FormDataEntryValue | null) => typeof value === "string" && value.trim() ? value.trim() : null;

function Choice({ label, name, value, options, onChange, disabled = false, optional = false }: {
  label: string;
  name: string;
  value: string;
  options: EnergyOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  optional?: boolean;
}) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span>
    <select name={name} className={selectClass} value={value} onChange={(event) => onChange(event.target.value)} required={!optional} disabled={disabled}>
      <option value="">{optional ? "All configurations" : "Select..."}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  </label>;
}

export function EnergyRatingForm({ options, rating, onClose, onSaved }: {
  options: EnergyCatalogOptions;
  rating?: EnergyRating;
  onClose: () => void;
  onSaved: (rating: EnergyRating) => void;
}) {
  const [systemId, setSystemId] = useState(String(rating?.idSystem ?? ""));
  const [selection, setSelection] = useState({
    idCrystal: String(rating?.idCrystal ?? ""),
    idTint: String(rating?.idTint ?? ""),
    idCoating: String(rating?.idCoating ?? ""),
    idPrivacy: String(rating?.idPrivacy ?? ""),
    idConfig: String(rating?.idConfig ?? ""),
  });
  const [allConfigs, setAllConfigs] = useState(rating?.appliesToAllConfigs ?? false);
  const [unavailable, setUnavailable] = useState(Boolean(rating && rating.uFactor == null));
  const [isActive, setIsActive] = useState(rating?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedSystem = options.systems.find((system) => String(system.id) === systemId);
  const sameOriginalSystem = rating && String(rating.idSystem) === systemId;
  const keepExisting = (values: EnergyOption[], existing?: EnergyOption | null) =>
    existing && !values.some((value) => value.id === existing.id) ? [...values, existing] : values;
  const systemChoices = keepExisting(options.systems.map((system) => ({
    id: system.id, name: `${system.brand.name} · ${system.product.name} · ${system.name}`,
  })), rating ? { id: rating.system.id, name: `${rating.system.brand.name} · ${rating.system.product.name} · ${rating.system.name}` } : null);
  const choices = {
    idCrystal: keepExisting(selectedSystem?.crystals ?? [], sameOriginalSystem ? rating.crystal : null),
    idTint: keepExisting(selectedSystem?.tints ?? [], sameOriginalSystem ? rating.tint : null),
    idCoating: keepExisting(selectedSystem?.coatings ?? [], sameOriginalSystem ? rating.coating : null),
    idPrivacy: keepExisting(selectedSystem?.privacies ?? [], sameOriginalSystem ? rating.privacy : null),
    idConfig: keepExisting(selectedSystem?.configs ?? [], sameOriginalSystem ? rating.config : null),
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!selection.idConfig && !allConfigs) {
      setError("Confirm that these values apply to all configurations, or select a specific configuration.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const values = ["uFactor", "shgc", "vlt"].map((key) => unavailable ? null : textOrNull(form.get(key)));
    if (!unavailable && (values.some((value) => value === null || !Number.isFinite(Number(value))) || Number(values[0]) <= 0 || Number(values[1]) < 0 || Number(values[1]) > 1 || Number(values[2]) < 0 || Number(values[2]) > 1)) {
      setError("Enter a positive U-factor and SHGC / VLT values from 0 to 1, or select Data unavailable.");
      return;
    }
    const payload: EnergyRatingInput = {
      idSystem: Number(systemId), idCrystal: Number(selection.idCrystal), idTint: Number(selection.idTint),
      idCoating: Number(selection.idCoating), idPrivacy: Number(selection.idPrivacy),
      idConfig: selection.idConfig ? Number(selection.idConfig) : null,
      appliesToAllConfigs: !selection.idConfig && allConfigs,
      uFactor: values[0], shgc: values[1], vlt: values[2], isActive,
    };
    setSaving(true);
    try {
      const saved = rating ? await updateEnergyRating(rating.id, payload) : await createEnergyRating(payload);
      toast.success("Energy rating saved");
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save energy rating");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!saving}>
      <DialogHeader><DialogTitle>{rating ? "Edit Energy Rating" : "New Energy Rating"}</DialogTitle><DialogDescription>Select the combination and enter its U-factor, SHGC and VLT values. Existing estimate values are preserved.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={saving} className="space-y-4">
          <Choice label="Brand / Product / System" name="idSystem" value={systemId} options={systemChoices} onChange={(value) => {
            setSystemId(value); setSelection({ idCrystal: "", idTint: "", idCoating: "", idPrivacy: "", idConfig: "" }); setAllConfigs(false);
          }} />
          <div className="grid gap-4 sm:grid-cols-2">
            {([ ["idCrystal", "Glass"], ["idTint", "Tint"], ["idCoating", "Coating"], ["idPrivacy", "Privacy"] ] as const).map(([key, label]) => <Choice key={key} label={label} name={key} value={selection[key]} options={choices[key]} disabled={!systemId} onChange={(value) => setSelection((current) => ({ ...current, [key]: value }))} />)}
          </div>
          <Choice label="Configuration" name="idConfig" value={selection.idConfig} options={choices.idConfig} disabled={!systemId} optional onChange={(value) => { setSelection((current) => ({ ...current, idConfig: value })); setAllConfigs(false); }} />
          {!selection.idConfig && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={allConfigs} onChange={(event) => setAllConfigs(event.target.checked)} className="mt-1" />I have verified that these values apply to all configurations of the selected system.</label>}
          <div className="rounded-lg border bg-slate-50 p-4">
            <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={unavailable} onChange={(event) => setUnavailable(event.target.checked)} />Data unavailable for this combination</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {([ ["uFactor", "U-factor"], ["shgc", "SHGC"], ["vlt", "VLT"] ] as const).map(([key, label]) => <label key={key} className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><Input name={key} type="number" step="any" min={key === "uFactor" ? "0.000001" : "0"} max={key === "uFactor" ? "9999.999999" : "1"} required={!unavailable} disabled={unavailable} defaultValue={rating?.[key] ?? ""} /></label>)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />Active for matching new or explicitly updated pieces</label>
        </fieldset>
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Energy Rating"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
