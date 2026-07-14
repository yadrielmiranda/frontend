// src/app/settings/(write)/dimension-policies/rules-editor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import {
  bulkUpsertRules,
  deleteRulesByType,
  type RuleRow,
} from "@/app/api/dimension-policies.api";
import {
  normalizeInchesToEighthStep,
  DimensionParseError,
} from "@/lib/dimensions";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DimensionRuleType } from "@/lib/types";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

type Props = {
  idPolicy: number;
  initialRows?: RuleRow[];
};

const ruleTypeOptions: { value: DimensionRuleType; label: string }[] = [
  { value: "MAIN", label: "Main / Standard" },
  { value: "DOOR", label: "Door" },
  { value: "SIDELITE", label: "Sidelite" },
];

export function RulesEditor({ idPolicy, initialRows = [] }: Props) {
  const [selectedRuleType, setSelectedRuleType] =
    useState<DimensionRuleType>("MAIN");

  const [allRows, setAllRows] = useState<RuleRow[]>(initialRows);
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  const rowsForSelectedType = useMemo(() => {
    return allRows.filter(
      (row) => (row.ruleType ?? "MAIN") === selectedRuleType,
    );
  }, [allRows, selectedRuleType]);

  useEffect(() => {
    setAllRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setRows(rowsForSelectedType);
  }, [rowsForSelectedType]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        ruleType: selectedRuleType,
        widthIn: 0,
        heightIn: 0,
        dpPosPsf: 0,
        dpNegPsf: 0,
        screws: undefined,
        note: "",
      },
    ]);

  const onExcel = async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        toast.error("Only Excel files are allowed (.xlsx, .xls).");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const parsed: RuleRow[] = json.map((r, idx) => {
        const rowLabel = `Row ${idx + 1}`;

        const widthIn = normalizeInchesToEighthStep(
          r.widthIn,
          `${rowLabel} - widthIn`,
          1,
        );
        const heightIn = normalizeInchesToEighthStep(
          r.heightIn,
          `${rowLabel} - heightIn`,
          1,
        );

        const dpPosPsf = Number(r.dpPosPsf);
        const dpNegPsf = Number(r.dpNegPsf);

        if (!isFinite(dpPosPsf) || !isFinite(dpNegPsf)) {
          throw new Error(`${rowLabel}: invalid dpPosPsf/dpNegPsf.`);
        }

        let screws: number | undefined = undefined;
        if (
          r.screws !== undefined &&
          r.screws !== null &&
          String(r.screws).trim() !== ""
        ) {
          const n = Number(r.screws);
          if (!Number.isFinite(n))
            throw new Error(`${rowLabel}: invalid screws value.`);
          if (!Number.isInteger(n))
            throw new Error(`${rowLabel}: screws must be an integer.`);
          if (n < 0) throw new Error(`${rowLabel}: screws cannot be negative.`);
          screws = n;
        }

        return {
          ruleType: selectedRuleType,
          widthIn,
          heightIn,
          dpPosPsf,
          dpNegPsf,
          screws,
          note: r.note ?? undefined,
        };
      });

      setRows(parsed);
      toast.success(`Imported ${parsed.length} rows from Excel.`);
    } catch (err: any) {
      if (err instanceof DimensionParseError) toast.error(err.message);
      else toast.error(err?.message ?? "Failed to import Excel file.");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const [i, r] of rows.entries()) {
        if (!isFinite(r.widthIn) || r.widthIn <= 0)
          return toast.error(`Row ${i + 1}: invalid widthIn`);
        if (!isFinite(r.heightIn) || r.heightIn <= 0)
          return toast.error(`Row ${i + 1}: invalid heightIn`);
        if (!isFinite(r.dpPosPsf) || !isFinite(r.dpNegPsf))
          return toast.error(`Row ${i + 1}: invalid pressures`);
      }

      await bulkUpsertRules(idPolicy, selectedRuleType, rows);

      setAllRows((current) => [
        ...current.filter(
          (row) => (row.ruleType ?? "MAIN") !== selectedRuleType,
        ),
        ...rows.map((row) => ({
          ...row,
          ruleType: selectedRuleType,
        })),
      ]);

      toast.success(`${selectedRuleType} rules saved.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save rules.");
    } finally {
      setBusy(false);
    }
  };

  const clearSelectedRules = async () => {
    setBusy(true);

    try {
      const result = await deleteRulesByType(idPolicy, selectedRuleType);

      setAllRows((current) =>
        current.filter((row) => (row.ruleType ?? "MAIN") !== selectedRuleType),
      );

      setRows([]);

      toast.success(
        result.deletedCount === 1
          ? `1 ${selectedRuleType} rule deleted.`
          : `${result.deletedCount} ${selectedRuleType} rules deleted.`,
      );
    } catch (error: any) {
      toast.error(
        error?.message ?? `Failed to delete ${selectedRuleType} rules.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label>Rule Type</Label>
          <Select
            value={selectedRuleType}
            onValueChange={(value) =>
              setSelectedRuleType(value as DimensionRuleType)
            }
            disabled={busy}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addRow}
          disabled={busy}
        >
          + Row
        </Button>

        <label>
          <Button type="button" variant="outline" asChild disabled={busy}>
            <span>Import Excel for {selectedRuleType}</span>
          </Button>
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              await onExcel(file);

              e.target.value = "";
            }}
          />
        </label>

        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsClearOpen(true)}
          disabled={busy || rowsForSelectedType.length === 0}
        >
          Clear {selectedRuleType} Rules
        </Button>

        <p className="text-sm text-muted-foreground">
          Saving replaces only the {selectedRuleType} rules for this policy.
        </p>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {["W (in)", "H (in)", "+DP", "-DP", "Screws", "Note"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2">
                  <input
                    className="w-28 rounded border px-2 py-1"
                    type="number"
                    step="0.001"
                    value={r.widthIn ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, widthIn: v } : row,
                        ),
                      );
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-28 rounded border px-2 py-1"
                    type="number"
                    step="0.001"
                    value={r.heightIn ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, heightIn: v } : row,
                        ),
                      );
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-28 rounded border px-2 py-1"
                    type="number"
                    step="0.01"
                    value={r.dpPosPsf ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, dpPosPsf: v } : row,
                        ),
                      );
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-28 rounded border px-2 py-1"
                    type="number"
                    step="0.01"
                    value={r.dpNegPsf ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, dpNegPsf: v } : row,
                        ),
                      );
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-24 rounded border px-2 py-1"
                    type="number"
                    step="1"
                    min="0"
                    value={r.screws ?? ""}
                    onChange={(e) => {
                      const v =
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, screws: v } : row,
                        ),
                      );
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-64 rounded border px-2 py-1"
                    value={r.note ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, note: v } : row,
                        ),
                      );
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Saving..." : `Save ${selectedRuleType} rules`}
        </Button>
      </div>

      <ConfirmActionDialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={async () => {
          setIsClearOpen(false);
          await clearSelectedRules();
        }}
        title={`Clear ${selectedRuleType} rules?`}
        description={`This permanently deletes all ${selectedRuleType} rules from this policy. Other rule types will not be changed.`}
        confirmText={`Yes, clear ${selectedRuleType} rules`}
        cancelText="Cancel"
      />
    </div>
  );
}
