"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Palette, Shapes } from "lucide-react";
import { toast } from "sonner";
import {
  updateSystemDesigns,
  type SystemDesignsManage,
} from "@/app/api/garage-designs.api";
import {
  neutralDesignColorModifier,
  validateDesignColorModifier,
  validateSystemDesignSettings,
  type DesignColorModifier,
  type EditableSystemDesigns,
} from "@/lib/garage-designs";
import { GarageDesignPreview } from "@/components/estimates/garage-design-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function editable(data: SystemDesignsManage): EditableSystemDesigns {
  const modifiers = new Map(
    (data.colorModifiers ?? []).map((item) => [
      item.designColorId,
      { ...item },
    ]),
  );
  for (const assignment of data.designs) {
    for (const colorId of assignment.colorIds) {
      if (!modifiers.has(colorId))
        modifiers.set(colorId, neutralDesignColorModifier(colorId));
    }
  }
  return {
    allowDesign: data.allowDesign,
    garageMaxSectionHeightIn: data.garageMaxSectionHeightIn ?? 24,
    defaultDesignId: data.defaultDesignId,
    defaultDesignColorId: data.defaultDesignColorId,
    designs: data.designs.map((item) => ({
      ...item,
      colorIds: [...item.colorIds],
    })),
    colorModifiers: [...modifiers.values()],
  };
}

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50";

export function SystemDesignsClient({ data }: { data: SystemDesignsManage }) {
  const [settings, setSettings] = useState(() => editable(data));
  const [saved, setSaved] = useState(() => JSON.stringify(editable(data)));
  const [busy, setBusy] = useState(false);
  const error = validateSystemDesignSettings(
    settings,
    data.designCatalog,
    data.colorCatalog,
  );
  const isDirty = JSON.stringify(settings) !== saved;
  const assignedIds = new Set(settings.designs.map((item) => item.designId));
  const patterns = useMemo(
    () =>
      [...data.designCatalog].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [data.designCatalog],
  );
  const colors = useMemo(
    () =>
      [...data.colorCatalog].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [data.colorCatalog],
  );
  const defaultAssignment = settings.designs.find(
    (item) => item.designId === settings.defaultDesignId,
  );
  const defaultPatterns = patterns.filter(
    (pattern) =>
      assignedIds.has(pattern.id) &&
      (pattern.isActive || pattern.id === settings.defaultDesignId),
  );
  const defaultColors = colors.filter(
    (color) =>
      defaultAssignment?.colorIds.includes(color.id) &&
      (color.isActive || color.id === settings.defaultDesignColorId),
  );
  const assignedColorIds = new Set(
    settings.designs.flatMap((item) => item.colorIds),
  );
  const modifierColors = colors.filter((color) =>
    assignedColorIds.has(color.id),
  );

  function updateModifier(
    colorId: number,
    update: (modifier: DesignColorModifier) => DesignColorModifier,
  ) {
    setSettings((current) => {
      const currentModifier =
        current.colorModifiers?.find(
          (item) => item.designColorId === colorId,
        ) ?? neutralDesignColorModifier(colorId);
      const modified = update(currentModifier);
      return {
        ...current,
        colorModifiers: current.colorModifiers?.some(
          (item) => item.designColorId === colorId,
        )
          ? current.colorModifiers.map((item) =>
              item.designColorId === colorId ? modified : item,
            )
          : [...(current.colorModifiers ?? []), modified],
      };
    });
  }

  function toggleModifier(colorId: number, enabled: boolean) {
    updateModifier(colorId, (current) => {
      const lastSaved =
        (JSON.parse(saved) as EditableSystemDesigns).colorModifiers?.find(
          (item) => item.designColorId === colorId,
        ) ?? neutralDesignColorModifier(colorId);
      return {
        ...(!enabled && validateDesignColorModifier(current)
          ? lastSaved
          : current),
        modifierEnabled: enabled,
      };
    });
  }

  function retainModifiers(next: EditableSystemDesigns): EditableSystemDesigns {
    const usedIds = new Set(next.designs.flatMap((item) => item.colorIds));
    const savedModifiers =
      (JSON.parse(saved) as EditableSystemDesigns).colorModifiers ?? [];
    return {
      ...next,
      colorModifiers: next.colorModifiers?.map((modifier) => {
        if (
          usedIds.has(modifier.designColorId) ||
          !validateDesignColorModifier(modifier)
        )
          return modifier;
        return (
          savedModifiers.find(
            (item) => item.designColorId === modifier.designColorId,
          ) ?? neutralDesignColorModifier(modifier.designColorId)
        );
      }),
    };
  }

  function togglePattern(designId: number, checked: boolean) {
    setSettings((current) =>
      retainModifiers({
        ...current,
        designs: checked
          ? [
              ...current.designs,
              {
                designId,
                colorIds: [],
                sortOrder:
                  current.designs.reduce(
                    (max, item) => Math.max(max, item.sortOrder),
                    -1,
                  ) + 1,
              },
            ]
          : current.designs.filter((item) => item.designId !== designId),
        ...(!checked && current.defaultDesignId === designId
          ? { defaultDesignId: null, defaultDesignColorId: null }
          : {}),
      }),
    );
  }

  function toggleColor(designId: number, colorId: number, checked: boolean) {
    setSettings((current) =>
      retainModifiers({
        ...current,
        designs: current.designs.map((item) =>
          item.designId !== designId
            ? item
            : {
                ...item,
                colorIds: checked
                  ? [...item.colorIds, colorId]
                  : item.colorIds.filter((id) => id !== colorId),
              },
        ),
        colorModifiers:
          checked &&
          !current.colorModifiers?.some(
            (item) => item.designColorId === colorId,
          )
            ? [
                ...(current.colorModifiers ?? []),
                neutralDesignColorModifier(colorId),
              ]
            : current.colorModifiers,
        ...(!checked &&
        current.defaultDesignId === designId &&
        current.defaultDesignColorId === colorId
          ? { defaultDesignColorId: null }
          : {}),
      }),
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (error) {
      toast.error(error);
      return;
    }
    setBusy(true);
    try {
      const result = await updateSystemDesigns(data.system.id, {
        ...settings,
        colorModifiers: settings.colorModifiers?.map((item) => ({
          ...item,
          basePriceMultiplier: item.basePriceMultiplier.trim(),
          basePriceDeduction: item.basePriceDeduction.trim(),
        })),
      });
      const next = editable(result);
      setSettings(next);
      setSaved(JSON.stringify(next));
      toast.success("Design settings saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save design settings.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
        <section className="space-y-2 rounded-xl border bg-white p-5">
          <Label htmlFor="garageMaxSectionHeightIn">
            Maximum section height (inches)
          </Label>
          <Input
            id="garageMaxSectionHeightIn"
            type="number"
            min={1}
            max={240}
            step={0.01}
            className="max-w-xs"
            aria-describedby="garageSectionHeightHelp"
            value={
              settings.garageMaxSectionHeightIn === 0
                ? ""
                : (settings.garageMaxSectionHeightIn ?? 24)
            }
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                garageMaxSectionHeightIn: Number(event.target.value),
              }))
            }
          />
          <p
            id="garageSectionHeightHelp"
            className="text-sm text-muted-foreground"
          >
            The diagram divides the door height into equal sections no taller
            than this value. Applies with or without a design.
          </p>
        </section>
        <section className="space-y-5 rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="allowDesign" className="text-base font-semibold">
                Allow designs
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Show “Add design” when this system is selected in an estimate.
              </p>
            </div>
            <Switch
              id="allowDesign"
              checked={settings.allowDesign}
              onCheckedChange={(allowDesign) =>
                setSettings((current) => ({ ...current, allowDesign }))
              }
            />
          </div>
          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultDesignId">Default design</Label>
              <select
                id="defaultDesignId"
                className={selectClass}
                value={settings.defaultDesignId ?? ""}
                onChange={(event) => {
                  const defaultDesignId = event.target.value
                    ? Number(event.target.value)
                    : null;
                  setSettings((current) => {
                    const assignment = current.designs.find(
                      (item) => item.designId === defaultDesignId,
                    );
                    const keepColor =
                      current.defaultDesignColorId !== null &&
                      assignment?.colorIds.includes(
                        current.defaultDesignColorId,
                      ) &&
                      colors.some(
                        (color) =>
                          color.id === current.defaultDesignColorId &&
                          color.isActive,
                      );
                    return {
                      ...current,
                      defaultDesignId,
                      defaultDesignColorId: keepColor
                        ? current.defaultDesignColorId
                        : null,
                    };
                  });
                }}
              >
                <option value="">Choose a default design</option>
                {defaultPatterns.map((pattern) => (
                  <option
                    key={pattern.id}
                    value={pattern.id}
                    disabled={!pattern.isActive}
                  >
                    {pattern.name}
                    {!pattern.isActive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDesignColorId">Default color</Label>
              <select
                id="defaultDesignColorId"
                className={selectClass}
                disabled={settings.defaultDesignId === null}
                value={settings.defaultDesignColorId ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultDesignColorId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              >
                <option value="">Choose a default color</option>
                {defaultColors.map((color) => (
                  <option
                    key={color.id}
                    value={color.id}
                    disabled={!color.isActive}
                  >
                    {color.name}
                    {!color.isActive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Defaults apply when “Add design” is turned on. Existing pieces keep
            their saved selection.
          </p>
        </section>

        <section
          className="space-y-4"
          aria-labelledby="designColorModifiersTitle"
        >
          <div>
            <h2
              id="designColorModifiersTitle"
              className="text-lg font-semibold"
            >
              Design Color Modifiers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure one modifier per color for every design in this series.
            </p>
          </div>
          <div className="rounded-md border bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
            When a piece has a design, its color modifier replaces the Frame
            Color modifier and applies:{" "}
            <span className="font-medium">
              original base price × Base Multiplier − Amount to Subtract
            </span>
            . Turning it off keeps its values and uses the original base price.
            Pieces without a design use their Frame Color modifier.
          </div>
          <div className="rounded-md border bg-white">
            <Table aria-label="Design Color Modifiers">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Design Color</TableHead>
                  <TableHead className="w-36">Modifier</TableHead>
                  <TableHead className="min-w-48">Base Multiplier</TableHead>
                  <TableHead className="min-w-48">Amount to Subtract</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modifierColors.map((color) => {
                  const modifier =
                    settings.colorModifiers?.find(
                      (item) => item.designColorId === color.id,
                    ) ?? neutralDesignColorModifier(color.id);
                  return (
                    <TableRow key={color.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            className="h-7 w-7 shrink-0 rounded border shadow-sm"
                            style={{ backgroundColor: color.hexCode }}
                            aria-hidden="true"
                          />
                          <div>
                            <div className="font-medium">{color.name}</div>
                            {!color.isActive && (
                              <div className="text-xs text-amber-700">
                                Inactive
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`design-color-modifier-${color.id}`}
                            aria-label={`Apply design modifier to ${color.name}`}
                            checked={modifier.modifierEnabled}
                            disabled={busy}
                            onCheckedChange={(checked) =>
                              toggleModifier(color.id, checked)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {modifier.modifierEnabled ? "Enabled" : "Off"}
                          </span>
                        </div>
                      </TableCell>
                      {(
                        [
                          ["basePriceMultiplier", "Base Multiplier"],
                          ["basePriceDeduction", "Amount to Subtract"],
                        ] as const
                      ).map(([field, label]) => (
                        <TableCell key={field}>
                          <Input
                            id={`design-color-${color.id}-${field}`}
                            type="text"
                            inputMode="decimal"
                            aria-label={`${color.name} ${label}`}
                            value={modifier[field]}
                            disabled={busy || !modifier.modifierEnabled}
                            onChange={(event) =>
                              updateModifier(color.id, (current) => ({
                                ...current,
                                [field]: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {modifierColors.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Select designs and their allowed colors above to configure
                      their modifiers.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Available designs and colors
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select each design, then choose its allowed colors.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/settings/garage-designs">
                <Palette /> Manage catalogs
              </Link>
            </Button>
          </div>
          {patterns.filter(
            (pattern) => pattern.isActive || assignedIds.has(pattern.id),
          ).length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Shapes className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="font-medium">No active designs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create designs and colors in the catalogs, then link them to
                this system.
              </p>
            </div>
          ) : (
            patterns
              .filter(
                (pattern) => pattern.isActive || assignedIds.has(pattern.id),
              )
              .map((pattern) => {
                const assignment = settings.designs.find(
                  (item) => item.designId === pattern.id,
                );
                const selected = Boolean(assignment);
                return (
                  <div
                    key={pattern.id}
                    className={`rounded-xl border bg-white p-4 ${selected ? "border-blue-300" : "border-slate-200"}`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        id={`design-${pattern.id}`}
                        type="checkbox"
                        className="size-4 accent-blue-600"
                        checked={selected}
                        disabled={!pattern.isActive && !selected}
                        onChange={(event) =>
                          togglePattern(pattern.id, event.target.checked)
                        }
                      />
                      <GarageDesignPreview
                        template={pattern.template}
                        imageUrl={pattern.imageUrl}
                        color={
                          colors.find(
                            (color) =>
                              color.id === settings.defaultDesignColorId,
                          )?.hexCode
                        }
                        name={pattern.name}
                        className="h-16 w-20 rounded border object-contain"
                      />
                      <label
                        htmlFor={`design-${pattern.id}`}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="block font-semibold">
                          {pattern.name}
                        </span>
                        {!pattern.isActive && (
                          <span className="text-sm text-muted-foreground">
                            Inactive · unavailable for new selections
                          </span>
                        )}
                      </label>
                      {assignment && (
                        <div className="w-20 space-y-1">
                          <Label
                            htmlFor={`order-${pattern.id}`}
                            className="text-xs"
                          >
                            Order
                          </Label>
                          <Input
                            id={`order-${pattern.id}`}
                            type="number"
                            min={0}
                            step={1}
                            value={assignment.sortOrder}
                            onChange={(event) =>
                              setSettings((current) => ({
                                ...current,
                                designs: current.designs.map((item) =>
                                  item.designId === pattern.id
                                    ? {
                                        ...item,
                                        sortOrder:
                                          event.target.value === ""
                                            ? 0
                                            : Number(event.target.value),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                    {assignment && (
                      <fieldset className="mt-4 border-t pt-3">
                        <legend className="px-1 text-sm font-medium">
                          Allowed colors for {pattern.name}
                        </legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {colors
                            .filter(
                              (color) =>
                                color.isActive ||
                                assignment.colorIds.includes(color.id),
                            )
                            .map((color) => {
                              const checked = assignment.colorIds.includes(
                                color.id,
                              );
                              return (
                                <label
                                  key={color.id}
                                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-blue-300 bg-blue-50" : "bg-white"}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-blue-600"
                                    checked={checked}
                                    aria-label={`Allow ${color.name} for ${pattern.name}`}
                                    disabled={!color.isActive && !checked}
                                    onChange={(event) =>
                                      toggleColor(
                                        pattern.id,
                                        color.id,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  <span
                                    aria-hidden="true"
                                    className="size-4 rounded-sm border"
                                    style={{ backgroundColor: color.hexCode }}
                                  />
                                  {color.name}
                                  {!color.isActive ? " (inactive)" : ""}
                                </label>
                              );
                            })}
                          {colors.filter(
                            (color) =>
                              color.isActive ||
                              assignment.colorIds.includes(color.id),
                          ).length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Create an active color in the catalogs first.
                            </p>
                          )}
                        </div>
                      </fieldset>
                    )}
                  </div>
                );
              })
          )}
        </section>
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/95 p-4 shadow-sm">
        <div
          aria-live="polite"
          className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error ?? (isDirty ? "Unsaved changes" : "All changes saved")}
        </div>
        <Button type="submit" disabled={busy || !isDirty || Boolean(error)}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Saving..." : "Save Design Settings"}
        </Button>
      </div>
    </form>
  );
}
