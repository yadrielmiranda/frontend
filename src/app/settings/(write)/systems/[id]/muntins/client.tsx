"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  applySystemMuntins, deleteSystemMuntinRule, updateSystemMuntinRule,
  type ApplySystemMuntinsData, type SystemMuntinRule, type SystemMuntinRuleSettings,
  type SystemMuntinTarget, type SystemMuntinsManage,
} from "@/app/api/system-muntins.api";
import type { MuntinPattern, MuntinType } from "@/lib/types";

type Availability = ApplySystemMuntinsData["availability"];
const targetKey = (target: SystemMuntinTarget) => `${target.configId}:${target.crystalId}`;
const combinationLabel = (count: number, qualifier = "") => `${count} ${qualifier ? `${qualifier} ` : ""}combination${count === 1 ? "" : "s"}`;
const allCombinationsLabel = (count: number, qualifier = "") => `${count === 1 ? "" : "all "}${combinationLabel(count, qualifier)}`;
const inputMode = (pattern: MuntinPattern) => pattern.inputMode ?? (pattern.requiresLites ? "GRID" : "NONE");
const requiresType = (pattern: MuntinPattern) => pattern.requiresType ?? inputMode(pattern) !== "NONE";

function TypeChoices({ types, selected, onChange, id }: {
  types: readonly MuntinType[];
  selected: readonly number[];
  onChange: (ids: number[]) => void;
  id: string;
}) {
  const active = types.filter((type) => type.isActive);
  return (
    <fieldset className="space-y-2" aria-describedby={`${id}-help`}>
      <legend className="text-sm font-medium">Allowed types</legend>
      {active.length ? (
        <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
          {active.map((type) => <label key={type.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-muted/40">
            <input type="checkbox" checked={selected.includes(type.id)} onChange={(event) => onChange(event.target.checked
              ? [...selected, type.id] : selected.filter((value) => value !== type.id))} />
            {type.name}
          </label>)}
        </div>
      ) : <p className="text-sm text-muted-foreground">No active types. <Link className="underline" href="/settings/muntin-types">Manage muntin types</Link> to activate one.</p>}
      <p id={`${id}-help`} className="text-xs text-muted-foreground">{selected.length ? `${selected.length} selected.` : "Select at least one active type."}</p>
    </fieldset>
  );
}

function AvailabilityChoices({ value, onChange, hasType, allowNone, name }: {
  value: Availability;
  onChange: (value: Availability) => void;
  hasType: boolean;
  allowNone?: boolean;
  name: string;
}) {
  const choices: { value: Availability; label: string; description: string }[] = [
    ...(allowNone ? [{ value: "NONE" as const, label: "Remove this pattern", description: "Only the selected combinations will change. Other patterns remain available." }] : []),
    { value: "ALL", label: hasType ? "All active types" : "Allow this pattern", description: hasType ? "Includes types activated later." : "This pattern does not require a type." },
    ...(hasType ? [{ value: "SELECTED" as const, label: "Selected types", description: "Only the active types checked below are allowed." }] : []),
  ];
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium">Availability</legend>
    {choices.map((choice) => <label key={choice.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${value === choice.value ? "border-primary bg-muted/40" : ""}`}>
      <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} className="mt-1 accent-primary" />
      <span><span className="block text-sm font-medium">{choice.label}</span><span className="block text-xs text-muted-foreground">{choice.description}</span></span>
    </label>)}
  </fieldset>;
}

export function SystemMuntinsClient({ initialData }: { initialData: SystemMuntinsManage }) {
  const router = useRouter();
  const id = useId();
  const [data, setData] = useState(initialData);
  const [patternId, setPatternId] = useState<number | null>(() => initialData.patterns.find((pattern) => pattern.isActive && inputMode(pattern) !== "NONE")?.id ?? null);
  const [configFilter, setConfigFilter] = useState("");
  const [glassFilter, setGlassFilter] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<Availability>("ALL");
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAvailability, setEditAvailability] = useState<SystemMuntinRuleSettings["availability"]>("ALL");
  const [editTypeIds, setEditTypeIds] = useState<number[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => { setData(initialData); }, [initialData]);
  const patterns = data.patterns.filter((pattern) => inputMode(pattern) !== "NONE");
  const pattern = patterns.find((item) => item.id === patternId);
  const hasType = pattern ? requiresType(pattern) : false;
  const activeTypeIds = new Set(data.types.filter((type) => type.isActive).map((type) => type.id));
  const chosenTypes = selectedTypeIds.filter((typeId) => activeTypeIds.has(typeId));
  const chosenEditTypes = editTypeIds.filter((typeId) => activeTypeIds.has(typeId));
  const rules = data.rules.filter((rule) => rule.patternId === patternId);
  const editing = data.rules.find((rule) => rule.id === editingId);
  const removing = data.rules.find((rule) => rule.id === removingId);
  const visibleConfigs = data.configs.filter((config) => config.conf.toLowerCase().includes(configFilter.trim().toLowerCase()));
  const visibleGlass = data.crystals.filter((crystal) => crystal.glass.toLowerCase().includes(glassFilter.trim().toLowerCase()));
  const targets = useMemo(() => data.configs.flatMap((config) => data.crystals.map((crystal) => ({ configId: config.id, crystalId: crystal.id }))), [data.configs, data.crystals]);
  const selectedTargets = targets.filter((target) => selection.has(targetKey(target)));
  const visibleTargets = visibleConfigs.flatMap((config) => visibleGlass.map((crystal) => ({ configId: config.id, crystalId: crystal.id })));
  const ruleByTarget = new Map(rules.flatMap((rule) => rule.targets.map((target) => [targetKey(target), rule] as const)));
  const inactiveSelected = selectedTargets.some((target) => !data.crystals.find((crystal) => crystal.id === target.crystalId)?.isActive);
  const invalidApply = !pattern || !selectedTargets.length || (availability !== "NONE" && (
    !pattern.isActive || inactiveSelected || (hasType && availability === "SELECTED" && !chosenTypes.length)
  ));
  const targetLabel = (target: SystemMuntinTarget) => `${data.configs.find((config) => config.id === target.configId)?.conf ?? `Config ${target.configId}`} × ${data.crystals.find((crystal) => crystal.id === target.crystalId)?.glass ?? `Glass ${target.crystalId}`}`;
  const typeNames = (rule: SystemMuntinRule) => rule.allowedTypeIds.map((typeId) => {
    const type = data.types.find((item) => item.id === typeId);
    return type ? `${type.name}${type.isActive ? "" : " (inactive)"}` : `Type ${typeId}`;
  }).join(", ");
  const ruleSummary = (rule: SystemMuntinRule) => !hasType ? "Allowed" : rule.availability === "ALL" ? "All active types" : `${rule.allowedTypeIds.length} selected ${rule.allowedTypeIds.length === 1 ? "type" : "types"}`;

  function checkedState(items: readonly SystemMuntinTarget[]): boolean | "indeterminate" {
    const count = items.filter((target) => selection.has(targetKey(target))).length;
    return count === 0 ? false : count === items.length ? true : "indeterminate";
  }

  function selectTargets(items: readonly SystemMuntinTarget[], checked: boolean) {
    setSelection((current) => {
      const next = new Set(current);
      items.forEach((target) => checked ? next.add(targetKey(target)) : next.delete(targetKey(target)));
      return next;
    });
  }

  async function mutate(action: () => Promise<SystemMuntinsManage>, message: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const updated = await action();
      setData(updated);
      setSelection(new Set());
      setEditingId(null);
      setRemovingId(null);
      toast.success(message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update muntin rules.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function applySelection() {
    if (invalidApply || !pattern) return;
    void mutate(() => applySystemMuntins(data.system.id, {
      patternId: pattern.id,
      targets: selectedTargets,
      availability: hasType || availability === "NONE" ? availability : "ALL",
      allowedTypeIds: hasType && availability === "SELECTED" ? chosenTypes : [],
    }), availability === "NONE" ? "Pattern removed from the selected combinations." : "Muntin rule applied to the selected combinations.");
  }

  function openEditor(rule: SystemMuntinRule) {
    setEditAvailability(hasType ? rule.availability : "ALL");
    setEditTypeIds(rule.allowedTypeIds.filter((typeId) => activeTypeIds.has(typeId)));
    setEditingId(rule.id);
  }

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <strong>Full View is always available.</strong> New configuration and glass combinations allow Full View only until a pattern is assigned here.
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assign a pattern</CardTitle>
          <CardDescription>Select exact configuration and glass combinations. Applying a rule changes only those combinations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <fieldset disabled={pending} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium">Pattern
                <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm font-normal" value={patternId ?? ""} onChange={(event) => {
                  setPatternId(event.target.value ? Number(event.target.value) : null);
                  setSelection(new Set()); setAvailability("ALL"); setSelectedTypeIds([]);
                }}>
                  <option value="" disabled>Select a pattern</option>
                  {patterns.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (inactive)"}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">Filter configurations<Input value={configFilter} onChange={(event) => setConfigFilter(event.target.value)} placeholder="Configuration name" /></label>
              <label className="space-y-1.5 text-sm font-medium">Filter glass<Input value={glassFilter} onChange={(event) => setGlassFilter(event.target.value)} placeholder="Glass name" /></label>
            </div>
            {!patterns.length && <p className="text-sm text-muted-foreground">No additional patterns. <Link className="underline" href="/settings/muntin-patterns">Manage muntin patterns</Link> to add one.</p>}
            {pattern && <>
              {!pattern.isActive && <p role="status" className="text-sm text-amber-700">This pattern is inactive. You can remove its existing assignments.</p>}
              {!data.configs.length || !data.crystals.length ? <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">Link configurations and glass to this system before assigning muntins.</p> : <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={checkedState(visibleTargets)} disabled={!visibleTargets.length || pending} onCheckedChange={(checked) => selectTargets(visibleTargets, checked === true)} />Select all shown</label>
                  <div className="flex items-center gap-3"><span role="status" className="text-sm">{selectedTargets.length} selected</span><Button type="button" variant="ghost" size="sm" disabled={!selectedTargets.length} onClick={() => setSelection(new Set())}>Clear selection</Button></div>
                </div>
                <div className="max-h-[32rem] overflow-auto rounded-md border" tabIndex={0} aria-label="Configuration and glass availability">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">{pattern.name} availability by configuration and glass. Check cells to change only those combinations.</caption>
                    <thead className="sticky top-0 z-20 bg-muted"><tr>
                      <th scope="col" className="sticky left-0 z-30 min-w-40 border-b bg-muted p-3 text-left">Configuration / Glass</th>
                      {visibleGlass.map((crystal) => <th key={crystal.id} scope="col" className="min-w-48 border-b border-l p-3 text-left align-top">
                        <label className="flex items-start gap-2"><Checkbox className="mt-0.5" checked={checkedState(visibleConfigs.map((config) => ({ configId: config.id, crystalId: crystal.id })))} disabled={!visibleConfigs.length || pending} onCheckedChange={(checked) => selectTargets(visibleConfigs.map((config) => ({ configId: config.id, crystalId: crystal.id })), checked === true)} aria-label={`Select shown configurations for ${crystal.glass}`} /><span>{crystal.glass}{!crystal.isActive && <span className="block text-xs font-normal text-muted-foreground">Inactive</span>}</span></label>
                      </th>)}
                    </tr></thead>
                    <tbody>{visibleConfigs.map((config) => <tr key={config.id}>
                      <th scope="row" className="sticky left-0 z-10 border-b bg-background p-3 text-left align-top font-medium"><label className="flex items-start gap-2"><Checkbox className="mt-0.5" checked={checkedState(visibleGlass.map((crystal) => ({ configId: config.id, crystalId: crystal.id })))} disabled={!visibleGlass.length || pending} onCheckedChange={(checked) => selectTargets(visibleGlass.map((crystal) => ({ configId: config.id, crystalId: crystal.id })), checked === true)} aria-label={`Select shown glass for ${config.conf}`} />{config.conf}</label></th>
                      {visibleGlass.map((crystal) => {
                        const target = { configId: config.id, crystalId: crystal.id };
                        const key = targetKey(target);
                        const rule = ruleByTarget.get(key);
                        return <td key={crystal.id} className={`border-b border-l align-top ${selection.has(key) ? "bg-primary/5" : ""}`}>
                          <label className="flex min-h-24 cursor-pointer items-start gap-3 p-3">
                            <Checkbox className="mt-0.5" checked={selection.has(key)} disabled={pending} onCheckedChange={(checked) => selectTargets([target], checked === true)} aria-label={`${config.conf} × ${crystal.glass}`} />
                            <span className="space-y-1"><span className={`block text-sm ${rule ? "font-medium" : "text-muted-foreground"}`}>{rule ? ruleSummary(rule) : "Not allowed"}</span>
                              {rule && <span className="block text-xs text-muted-foreground">{rule.targets.length > 1 ? `Shared across ${combinationLabel(rule.targets.length)}` : "1 combination"}</span>}
                            </span>
                          </label>
                        </td>;
                      })}
                    </tr>)}</tbody>
                  </table>
                  {(!visibleConfigs.length || !visibleGlass.length) && <p className="p-5 text-sm text-muted-foreground">No combinations match these filters.</p>}
                </div>
              </>}
              <div className="grid gap-5 lg:grid-cols-2">
                <AvailabilityChoices name={`${id}-apply-mode`} value={availability} onChange={setAvailability} hasType={hasType} allowNone />
                {hasType && availability === "SELECTED" && <TypeChoices types={data.types} selected={chosenTypes} onChange={setSelectedTypeIds} id={`${id}-apply-types`} />}
              </div>
              {selectedTargets.length > 0 && <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer font-medium">Review {combinationLabel(selectedTargets.length, "selected")} (including any hidden by filters)</summary><ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5">{selectedTargets.map((target) => <li key={targetKey(target)}>{targetLabel(target)}</li>)}</ul></details>}
              {inactiveSelected && availability !== "NONE" && <p role="status" className="text-sm text-amber-700">Inactive glass can only have assignments removed. Clear those combinations to allow a pattern.</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="max-w-xl text-xs text-muted-foreground">{availability === "NONE" ? "Removes this pattern only. Full View and other pattern rules remain available." : "Selected combinations share this rule. Combinations outside your selection keep their existing rules."}</p>
                <Button type="button" disabled={pending || invalidApply} onClick={applySelection}>{pending ? "Saving…" : availability === "NONE" ? `Remove from ${combinationLabel(selectedTargets.length)}` : `Apply to ${combinationLabel(selectedTargets.length)}`}</Button>
              </div>
            </>}
          </fieldset>
        </CardContent>
      </Card>

      {pattern && <Card>
        <CardHeader><CardTitle>Shared rules · {pattern.name}</CardTitle><CardDescription>Editing a shared rule updates every linked combination. To change only some, select them in the table and apply a new setting.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!rules.length && <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">No combinations currently allow this pattern.</p>}
          {rules.map((rule) => <div key={rule.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{ruleSummary(rule)}</span><Badge variant="secondary">{combinationLabel(rule.targets.length)}</Badge></div>
                {hasType && <p className="text-sm text-muted-foreground">{rule.availability === "ALL" ? "Includes types activated later." : typeNames(rule) || "No types selected."}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => { setSelection(new Set(rule.targets.map(targetKey))); setConfigFilter(""); setGlassFilter(""); }}>Select combinations</Button>
                {hasType && <Button type="button" variant="outline" size="sm" disabled={pending || !pattern.isActive} onClick={() => openEditor(rule)}>Edit shared rule</Button>}
                <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => setRemovingId(rule.id)}>Remove rule</Button>
              </div>
            </div>
            <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">View {allCombinationsLabel(rule.targets.length, "linked")}</summary><ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5">{rule.targets.map((target) => <li key={targetKey(target)}>{targetLabel(target)}</li>)}</ul></details>
          </div>)}
        </CardContent>
      </Card>}

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !inFlight.current) setEditingId(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto" showCloseButton={!pending}>
          <DialogHeader><DialogTitle>Edit shared rule · {pattern?.name}</DialogTitle><DialogDescription>This changes {allCombinationsLabel(editing?.targets.length ?? 0, "linked")}. To change only some, cancel and use the selection table.</DialogDescription></DialogHeader>
          {editing && <>
            <details className="text-sm"><summary className="cursor-pointer font-medium">Review affected combinations</summary><ul className="mt-2 max-h-36 list-disc overflow-y-auto pl-5">{editing.targets.map((target) => <li key={targetKey(target)}>{targetLabel(target)}</li>)}</ul></details>
            <fieldset disabled={pending} className="space-y-4">
              <AvailabilityChoices name={`${id}-edit-mode`} value={editAvailability} onChange={(value) => { if (value !== "NONE") setEditAvailability(value); }} hasType={hasType} />
              {hasType && editAvailability === "SELECTED" && <TypeChoices types={data.types} selected={chosenEditTypes} onChange={setEditTypeIds} id={`${id}-edit-types`} />}
              {editing.allowedTypeIds.some((typeId) => !activeTypeIds.has(typeId)) && <p className="text-xs text-muted-foreground">This rule contains inactive types. Saving replaces them with the active types selected here.</p>}
            </fieldset>
            <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setEditingId(null)}>Cancel</Button><Button type="button" disabled={pending || (editAvailability === "SELECTED" && !chosenEditTypes.length)} onClick={() => void mutate(() => updateSystemMuntinRule(data.system.id, editing.id, { availability: editAvailability, allowedTypeIds: editAvailability === "SELECTED" ? chosenEditTypes : [] }), "Shared rule updated for all linked combinations.")}>{pending ? "Saving…" : `Save for ${allCombinationsLabel(editing.targets.length)}`}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!removing} onOpenChange={(open) => { if (!open && !inFlight.current) setRemovingId(null); }}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader><DialogTitle>Remove shared rule?</DialogTitle><DialogDescription>Remove {pattern?.name} from {allCombinationsLabel(removing?.targets.length ?? 0, "linked")}. Full View and other patterns remain available.</DialogDescription></DialogHeader>
          {removing && <><ul className="max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm">{removing.targets.map((target) => <li key={targetKey(target)}>{targetLabel(target)}</li>)}</ul><DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setRemovingId(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={pending} onClick={() => void mutate(() => deleteSystemMuntinRule(data.system.id, removing.id), "Shared rule removed.")}>{pending ? "Removing…" : `Remove from ${combinationLabel(removing.targets.length)}`}</Button></DialogFooter></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
