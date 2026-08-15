"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type BrandCoatingsManage,
  type BrandPrivaciesManage,
  type BrandTintsManage,
  updateBrandCoatings,
  updateBrandPrivacies,
  updateBrandTints,
} from "@/app/api/brands.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type Props =
  | { kind: "tint"; initialData: BrandTintsManage }
  | { kind: "coating"; initialData: BrandCoatingsManage }
  | { kind: "privacy"; initialData: BrandPrivaciesManage };

type EditableRow = {
  id: number;
  label: string;
  hexCode?: string;
  isActive: boolean;
  isAssociated: boolean;
  sortOrder: string;
  surchargeEnabled: boolean;
  isDefault: boolean;
  costoA: string;
  costoB: string;
  costoC: string;
};

const SURCHARGE_DECIMAL_REGEX = /^\d{1,4}(?:\.\d{1,20})?$/;

function toEditableRows(props: Props): EditableRow[] {
  if (props.kind === "tint") {
    return props.initialData.tints.map((option) => ({
      id: option.id,
      label: option.color,
      hexCode: option.hexCode,
      isActive: option.isActive,
      isAssociated: option.isAssociated,
      sortOrder: option.sortOrder == null ? "" : String(option.sortOrder),
      surchargeEnabled: option.surchargeEnabled,
      isDefault: option.isDefault,
      costoA: option.costoA == null ? "" : String(option.costoA),
      costoB: option.costoB == null ? "" : String(option.costoB),
      costoC: option.costoC == null ? "" : String(option.costoC),
    }));
  }

  const options =
    props.kind === "coating"
      ? props.initialData.coatings
      : props.initialData.privacies;

  return options.map((option) => ({
    id: option.id,
    label: option.name,
    isActive: option.isActive,
    isAssociated: option.isAssociated,
    sortOrder: option.sortOrder == null ? "" : String(option.sortOrder),
    surchargeEnabled: option.surchargeEnabled,
    isDefault: option.isDefault,
    costoA: option.costoA == null ? "" : String(option.costoA),
    costoB: option.costoB == null ? "" : String(option.costoB),
    costoC: option.costoC == null ? "" : String(option.costoC),
  }));
}

function comparable(rows: EditableRow[]) {
  return rows.map((row) => ({
    id: row.id,
    isAssociated: row.isAssociated,
    sortOrder: row.isAssociated ? row.sortOrder.trim() : "",
    isDefault: row.isAssociated && row.isDefault,
    surchargeEnabled: row.isAssociated && row.surchargeEnabled,
    costoA: row.isAssociated && row.surchargeEnabled ? row.costoA.trim() : "",
    costoB: row.isAssociated && row.surchargeEnabled ? row.costoB.trim() : "",
    costoC: row.isAssociated && row.surchargeEnabled ? row.costoC.trim() : "",
  }));
}

export function BrandOptionAssociationsClient(props: Props) {
  const initialRows = useMemo(() => toEditableRows(props), [props]);
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [savedRows, setSavedRows] = useState<EditableRow[]>(initialRows);
  const [isSaving, setIsSaving] = useState(false);

  const singular =
    props.kind === "tint"
      ? "Tint"
      : props.kind === "coating"
        ? "Coating"
        : "Privacy option";
  const plural =
    props.kind === "tint"
      ? "Tints"
      : props.kind === "coating"
        ? "Coatings"
        : "Privacy options";
  const brandId = props.initialData.brand.id;
  const hasChanges =
    JSON.stringify(comparable(rows)) !== JSON.stringify(comparable(savedRows));

  const updateRow = (
    optionId: number,
    updater: (row: EditableRow) => EditableRow,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === optionId ? updater(row) : row)),
    );
  };

  const setDefault = (optionId: number) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        isDefault: row.id === optionId,
      })),
    );
  };

  const setAssociated = (optionId: number, isAssociated: boolean) => {
    setRows((current) => {
      const highestOrder = current.reduce((highest, row) => {
        if (!row.isAssociated || row.id === optionId) return highest;

        const value = Number(row.sortOrder);
        return Number.isInteger(value) && value >= 0
          ? Math.max(highest, value)
          : highest;
      }, -1);

      return current.map((row) => {
        if (row.id !== optionId) return row;

        return {
          ...row,
          isAssociated,
          sortOrder: isAssociated
            ? row.sortOrder || String(highestOrder + 1)
            : "",
          isDefault: isAssociated ? row.isDefault : false,
          surchargeEnabled: isAssociated && row.surchargeEnabled,
        };
      });
    });
  };

  const handleSave = async () => {
    const associatedRows = rows.filter((row) => row.isAssociated);

    if (associatedRows.length === 0) {
      toast.error(`Select at least one available ${singular}.`);
      return;
    }

    const defaults = associatedRows.filter((row) => row.isDefault);

    if (defaults.length !== 1 || !defaults[0].isActive) {
      toast.error(`Select exactly one active default ${singular}.`);
      return;
    }

    const normalizedRows: Array<{
      id: number;
      sortOrder: number;
      surchargeEnabled: boolean;
      isDefault: boolean;
      costoA: string | null;
      costoB: string | null;
      costoC: string | null;
    }> = [];

    for (const row of associatedRows) {
      const rawSortOrder = row.sortOrder.trim();

      if (!/^\d+$/.test(rawSortOrder)) {
        toast.error(
          `${row.label}: Order must be a whole number of zero or greater.`,
        );
        return;
      }

      const sortOrder = Number(rawSortOrder);

      if (!row.surchargeEnabled) {
        normalizedRows.push({
          id: row.id,
          sortOrder,
          surchargeEnabled: false,
          isDefault: row.isDefault,
          costoA: null,
          costoB: null,
          costoC: null,
        });
        continue;
      }

      const rawValues = [
        row.costoA.trim(),
        row.costoB.trim(),
        row.costoC.trim(),
      ];
      if (
        rawValues.some((value) => value === "") ||
        rawValues.some((value) => !SURCHARGE_DECIMAL_REGEX.test(value))
      ) {
        toast.error(
          `${row.label}: Area Cost, Perimeter Cost and Fixed Cost must be zero or greater, with up to 4 integer digits and 20 decimal places.`,
        );
        return;
      }

      normalizedRows.push({
        id: row.id,
        sortOrder,
        surchargeEnabled: true,
        isDefault: row.isDefault,
        costoA: rawValues[0],
        costoB: rawValues[1],
        costoC: rawValues[2],
      });
    }

    try {
      setIsSaving(true);

      let nextProps: Props;

      if (props.kind === "tint") {
        const updated = await updateBrandTints(brandId, {
          tints: normalizedRows.map(({ id, ...row }) => ({
            tintId: id,
            ...row,
          })),
        });
        nextProps = { kind: "tint", initialData: updated };
      } else if (props.kind === "coating") {
        const updated = await updateBrandCoatings(brandId, {
          coatings: normalizedRows.map(({ id, ...row }) => ({
            coatingId: id,
            ...row,
          })),
        });
        nextProps = { kind: "coating", initialData: updated };
      } else {
        const updated = await updateBrandPrivacies(brandId, {
          privacies: normalizedRows.map(({ id, ...row }) => ({
            privacyId: id,
            ...row,
          })),
        });
        nextProps = { kind: "privacy", initialData: updated };
      }
      const nextRows = toEditableRows(nextProps);

      setRows(nextRows);
      setSavedRows(nextRows);
      toast.success(`Brand ${plural.toLowerCase()} updated successfully.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Error updating Brand ${plural.toLowerCase()}.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
        Choose one active default for this Brand. Turning off the surcharge
        means Area Cost, Perimeter Cost and Fixed Cost are ignored; this
        behavior never depends on the option name. Order controls how the
        available options appear for this Brand.
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Available</TableHead>
              <TableHead className="w-28">Order</TableHead>
              <TableHead className="w-20">Default</TableHead>
              <TableHead>{singular}</TableHead>
              <TableHead className="w-36">Surcharge</TableHead>
              <TableHead className="min-w-36">Area Cost</TableHead>
              <TableHead className="min-w-36">Perimeter Cost</TableHead>
              <TableHead className="min-w-36">Fixed Cost</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => {
              const coefficientsDisabled =
                isSaving || !row.isAssociated || !row.surchargeEnabled;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={row.isAssociated}
                      disabled={
                        isSaving || (!row.isActive && !row.isAssociated)
                      }
                      aria-label={`Make ${row.label} available`}
                      onCheckedChange={(checked) =>
                        setAssociated(row.id, checked === true)
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={row.sortOrder}
                      disabled={isSaving || !row.isAssociated}
                      aria-label={`${row.label} order`}
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
                      name={`${props.kind}-default`}
                      checked={row.isDefault}
                      disabled={isSaving || !row.isAssociated || !row.isActive}
                      aria-label={`Use ${row.label} as default`}
                      onChange={() => setDefault(row.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.hexCode && (
                        <span
                          className="h-7 w-7 rounded border shadow-sm"
                          style={{ backgroundColor: row.hexCode }}
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <div className="font-medium">{row.label}</div>
                        {!row.isActive && (
                          <div className="text-xs text-amber-700">Inactive</div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.surchargeEnabled}
                        disabled={isSaving || !row.isAssociated}
                        aria-label={`Apply surcharge to ${row.label}`}
                        onCheckedChange={(checked) =>
                          updateRow(row.id, (current) => ({
                            ...current,
                            surchargeEnabled: checked,
                            costoA:
                              checked && current.costoA === ""
                                ? "0"
                                : current.costoA,
                            costoB:
                              checked && current.costoB === ""
                                ? "0"
                                : current.costoB,
                            costoC:
                              checked && current.costoC === ""
                                ? "0"
                                : current.costoC,
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {row.surchargeEnabled ? "Enabled" : "Off"}
                      </span>
                    </div>
                  </TableCell>

                  {(
                    [
                      ["costoA", "Area Cost"],
                      ["costoB", "Perimeter Cost"],
                      ["costoC", "Fixed Cost"],
                    ] as const
                  ).map(([field, label]) => (
                    <TableCell key={field}>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row[field]}
                        disabled={coefficientsDisabled}
                        aria-label={`${row.label} ${label}`}
                        onChange={(event) =>
                          updateRow(row.id, (current) => ({
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
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? "Saving..." : `Save Brand ${plural}`}
        </Button>
      </div>
    </div>
  );
}
