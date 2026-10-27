"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, XCircle } from "lucide-react";

import {
  updateSystemFrameColors,
  type SystemFrameColorsManage,
  type UpdateSystemFrameColorsData,
} from "@/app/api/systems.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  neutralFrameColorModifier,
  validateFrameColorModifier,
  type FrameColorModifierValues,
} from "./frame-color-modifier";

type EditableRow = FrameColorModifierValues & {
  id: number;
  color: string;
  hexCode: string;
  isActive: boolean;
  isAssociated: boolean;
  sortOrder: string;
  isDefault: boolean;
};

function toEditableRows(data: SystemFrameColorsManage): EditableRow[] {
  const associations =
    data.selectedFrameColors ??
    data.selectedFrameColorIds.map((idFrameColor, sortOrder) => ({
      idFrameColor,
      sortOrder,
      isDefault: sortOrder === 0,
      ...neutralFrameColorModifier(),
    }));
  const byId = new Map(
    associations.map((association) => [association.idFrameColor, association]),
  );
  return data.frameColorsCatalog
    .map((color) => {
      const association = byId.get(color.id);
      return {
        id: color.id,
        color: color.color,
        hexCode: color.hexCode,
        isActive: color.isActive,
        isAssociated: Boolean(association),
        sortOrder: association ? String(association.sortOrder) : "",
        isDefault: association?.isDefault === true,
        modifierEnabled: association?.modifierEnabled === true,
        basePriceMultiplier: association?.basePriceMultiplier ?? "1",
        basePriceDeduction: association?.basePriceDeduction ?? "0",
      };
    })
    .sort(
      (left, right) =>
        Number(right.isAssociated) - Number(left.isAssociated) ||
        (left.isAssociated && right.isAssociated
          ? Number(left.sortOrder) - Number(right.sortOrder)
          : 0),
    );
}

function comparable(rows: EditableRow[]) {
  return JSON.stringify(
    rows
      .filter((row) => row.isAssociated)
      .map((row) => ({
        id: row.id,
        sortOrder: row.sortOrder.trim(),
        isDefault: row.isDefault,
        modifierEnabled: row.modifierEnabled,
        basePriceMultiplier: row.basePriceMultiplier.trim(),
        basePriceDeduction: row.basePriceDeduction.trim(),
      }))
      .sort((left, right) => left.id - right.id),
  );
}

export function SystemFrameColorsClient({
  data,
}: {
  data: SystemFrameColorsManage;
}) {
  const router = useRouter();
  const initialRows = useMemo(() => toEditableRows(data), [data]);
  const [rows, setRows] = useState(initialRows);
  const [savedRows, setSavedRows] = useState(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const savedRowsRef = useRef(initialRows);
  const savingRef = useRef(false);

  useEffect(() => {
    const previousSaved = savedRowsRef.current;
    savedRowsRef.current = initialRows;
    setRows((current) =>
      comparable(current) === comparable(previousSaved) ? initialRows : current,
    );
    setSavedRows(initialRows);
  }, [initialRows]);

  const hasChanges = comparable(rows) !== comparable(savedRows);
  const associatedRows = rows.filter((row) => row.isAssociated);
  const availableRows = rows.filter((row) => !row.isAssociated && row.isActive);
  const matchingRows = availableRows.filter((row) =>
    row.color.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const updateRow = (
    id: number,
    updater: (row: EditableRow) => EditableRow,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? updater(row) : row)),
    );
  };
  const setAssociated = (id: number, isAssociated: boolean) => {
    setRows((current) => {
      const highestOrder = current.reduce((highest, row) => {
        const order = Number(row.sortOrder);
        return row.isAssociated &&
          row.id !== id &&
          Number.isInteger(order) &&
          order >= 0
          ? Math.max(highest, order)
          : highest;
      }, -1);
      const next = current.map((row) =>
        row.id === id
          ? {
              ...row,
              isAssociated,
              sortOrder: isAssociated
                ? row.sortOrder || String(highestOrder + 1)
                : row.sortOrder,
              isDefault: isAssociated && row.isDefault,
            }
          : row,
      );
      if (
        !next.some((row) => row.isAssociated && row.isDefault && row.isActive)
      ) {
        const fallback = next.find((row) => row.isAssociated && row.isActive);
        if (fallback)
          return next.map((row) => ({
            ...row,
            isDefault: row.id === fallback.id,
          }));
      }
      return next;
    });
  };
  const setModifier = (id: number, enabled: boolean) => {
    updateRow(id, (current) => {
      const saved =
        savedRows.find((row) => row.id === id) ?? neutralFrameColorModifier();
      return {
        ...current,
        ...(!enabled && validateFrameColorModifier(current)
          ? {
              basePriceMultiplier: saved.basePriceMultiplier,
              basePriceDeduction: saved.basePriceDeduction,
            }
          : {}),
        modifierEnabled: enabled,
      };
    });
  };

  const handleSave = async () => {
    if (savingRef.current || !hasChanges) return;
    const associated = rows.filter((row) => row.isAssociated);
    const defaults = associated.filter((row) => row.isDefault);
    if (
      associated.length > 0 &&
      (defaults.length !== 1 || !defaults[0].isActive)
    ) {
      toast.error("Select exactly one active default Frame Color.");
      return;
    }
    const frameColors: UpdateSystemFrameColorsData["frameColors"] = [];
    for (const row of associated) {
      const order = Number(row.sortOrder.trim());
      if (
        !/^\d+$/.test(row.sortOrder.trim()) ||
        !Number.isSafeInteger(order) ||
        order > 2147483647
      ) {
        toast.error(
          `${row.color}: Order must be a whole number from 0 to 2147483647.`,
        );
        return;
      }
      const error = validateFrameColorModifier(row);
      if (error) {
        toast.error(`${row.color}: ${error}`);
        return;
      }
      frameColors.push({
        frameColorId: row.id,
        sortOrder: order,
        isDefault: row.isDefault,
        modifierEnabled: row.modifierEnabled,
        basePriceMultiplier: row.basePriceMultiplier.trim(),
        basePriceDeduction: row.basePriceDeduction.trim(),
      });
    }
    savingRef.current = true;
    setIsSaving(true);
    try {
      const updated = await updateSystemFrameColors(data.system.id, {
        frameColors,
      });
      const nextRows = toEditableRows(updated);
      savedRowsRef.current = nextRows;
      setRows(nextRows);
      setSavedRows(nextRows);
      toast.success("Frame colors updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error saving frame colors.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
        Add the frame colors used by this series and choose one active default.
        When enabled, the modifier applies:{" "}
        <span className="font-medium">
          base price × Base Multiplier − Amount to Subtract
        </span>
        . Turning it off keeps its values and uses the original base price.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Associated Frame Colors</h2>
        <Button
          type="button"
          disabled={isSaving || availableRows.length === 0}
          onClick={() => {
            setSearch("");
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Frame Color
        </Button>
      </div>
      <div className="rounded-md border">
        <Table aria-label="Associated Frame Colors">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Order</TableHead>
              <TableHead className="w-20">Default</TableHead>
              <TableHead className="min-w-40">Frame Color</TableHead>
              <TableHead className="w-36">Modifier</TableHead>
              <TableHead className="min-w-48">Base Multiplier</TableHead>
              <TableHead className="min-w-48">Amount to Subtract</TableHead>
              <TableHead className="w-16 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {associatedRows.map((row) => {
              const coefficientsDisabled = isSaving || !row.modifierEnabled;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={row.sortOrder}
                      disabled={isSaving}
                      aria-label={`${row.color} order`}
                      onChange={(event) =>
                        updateRow(row.id, (current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="radio"
                      name="frame-color-default"
                      checked={row.isDefault}
                      disabled={isSaving || !row.isActive}
                      aria-label={`Use ${row.color} as default`}
                      className="h-4 w-4"
                      onChange={() =>
                        setRows((current) =>
                          current.map((item) => ({
                            ...item,
                            isDefault: item.id === row.id,
                          })),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.hexCode && (
                        <span
                          className="h-7 w-7 shrink-0 rounded border shadow-sm"
                          style={{ backgroundColor: row.hexCode }}
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <div className="font-medium">{row.color}</div>
                        {!row.isActive && (
                          <div className="text-xs text-amber-700">Inactive</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.modifierEnabled}
                        disabled={isSaving}
                        aria-label={`Apply modifier to ${row.color}`}
                        onCheckedChange={(checked) =>
                          setModifier(row.id, checked)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {row.modifierEnabled ? "Enabled" : "Off"}
                      </span>
                    </div>
                  </TableCell>
                  {(
                    [
                      ["basePriceMultiplier", "Base multiplier"],
                      ["basePriceDeduction", "Amount to subtract"],
                    ] as const
                  ).map(([field, label]) => (
                    <TableCell key={field}>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row[field]}
                        disabled={coefficientsDisabled}
                        aria-label={`${row.color} ${label}`}
                        onChange={(event) =>
                          updateRow(row.id, (current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={isSaving}
                      aria-label={`Remove ${row.color} from this series`}
                      title="Remove from this series"
                      onClick={() => setAssociated(row.id, false)}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {associatedRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No associated frame colors. Use Add Frame Color to add a color
                  to this series.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {isAddDialogOpen && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Frame Color to {data.system.name}</DialogTitle>
              <DialogDescription>
                Choose a color from the catalog. Use Save Frame Colors to save
                your changes to this series.
              </DialogDescription>
            </DialogHeader>
            <Input
              aria-label="Search frame colors"
              placeholder="Search frame colors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {matchingRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    {row.hexCode && (
                      <span
                        className="h-7 w-7 shrink-0 rounded border shadow-sm"
                        style={{ backgroundColor: row.hexCode }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-medium">{row.color}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    aria-label={`Add ${row.color} to this series`}
                    onClick={() => {
                      setAssociated(row.id, true);
                      setIsAddDialogOpen(false);
                      setSearch("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add
                  </Button>
                </div>
              ))}
              {matchingRows.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No frame colors match your search.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? "Saving..." : "Save Frame Colors"}
        </Button>
      </div>
    </div>
  );
}
