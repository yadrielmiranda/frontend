"use client";

import { useState, useEffect } from "react";
import { bulkUpsertRules, RuleRow } from "@/app/api/dimension-policies.api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Ajusta la ruta a donde tengas este helper en el FRONT
import {
  normalizeInchesToEighthStep,
  DimensionParseError,
} from "@/lib/dimensions";

type Props = {
  idPolicy: number;
  initialRows?: RuleRow[];
};

export default function RulesEditor({ idPolicy, initialRows = [] }: Props) {
  const [rows, setRows] = useState<RuleRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        widthIn: 0,
        heightIn: 0,
        dpPosPsf: 0,
        dpNegPsf: 0,
        screws: undefined,
        note: "",
      },
    ]);

  // -------- Importar desde Excel (.xlsx / .xls) --------
  const onExcel = async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        toast.error("Solo se permiten archivos Excel (.xlsx, .xls)");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // defval: "" -> si la celda está vacía, queda "" en vez de undefined
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const parsed: RuleRow[] = json.map((r, idx) => {
        const rowLabel = `fila ${idx + 1}`;

        // Excel puede devolver números o strings -> tu helper soporta ambos
        const widthIn = normalizeInchesToEighthStep(
          r.widthIn,
          `${rowLabel} - widthIn`,
          1
        );

        const heightIn = normalizeInchesToEighthStep(
          r.heightIn,
          `${rowLabel} - heightIn`,
          1
        );

        const dpPosPsf = Number(r.dpPosPsf);
        const dpNegPsf = Number(r.dpNegPsf);

        if (!isFinite(dpPosPsf) || !isFinite(dpNegPsf)) {
          throw new Error(
            `${rowLabel}: dpPosPsf/dpNegPsf inválidos ("${r.dpPosPsf}", "${r.dpNegPsf}")`
          );
        }

        // screws: entero >= 0, opcional
        let screws: number | undefined = undefined;

        if (
          r.screws !== undefined &&
          r.screws !== null &&
          String(r.screws).trim() !== ""
        ) {
          const n = Number(r.screws);

          if (!Number.isFinite(n)) {
            throw new Error(`${rowLabel}: screws inválido ("${r.screws}")`);
          }

          if (!Number.isInteger(n)) {
            throw new Error(
              `${rowLabel}: screws debe ser un número entero (no decimales).`
            );
          }

          if (n < 0) {
            throw new Error(
              `${rowLabel}: screws no puede ser negativo.`
            );
          }

          screws = n;
        }

        return {
          widthIn,
          heightIn,
          dpPosPsf,
          dpNegPsf,
          screws,
          note: r.note ?? undefined,
        };
      });

      setRows(parsed);
      toast.success(`Importadas ${parsed.length} filas desde Excel`);
    } catch (err: any) {
      if (err instanceof DimensionParseError) {
        toast.error(err.message);
      } else {
        console.error(err);
        toast.error(err?.message ?? "No se pudo importar el archivo Excel");
      }
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      // Validación básica final antes de enviar al backend
      for (const [i, r] of rows.entries()) {
        if (!isFinite(r.widthIn) || r.widthIn <= 0) {
          toast.error(`Fila ${i + 1}: widthIn inválido`);
          setBusy(false);
          return;
        }
        if (!isFinite(r.heightIn) || r.heightIn <= 0) {
          toast.error(`Fila ${i + 1}: heightIn inválido`);
          setBusy(false);
          return;
        }
        if (!isFinite(r.dpPosPsf) || !isFinite(r.dpNegPsf)) {
          toast.error(`Fila ${i + 1}: presiones inválidas`);
          setBusy(false);
          return;
        }
      }

      await bulkUpsertRules(idPolicy, rows);
      toast.success("Reglas guardadas");
    } catch (e: any) {
      toast.error(e?.message ?? "Error guardando reglas");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button className="btn-secondary" onClick={addRow}>
          + Fila
        </button>

        <label className="btn-secondary">
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => e.target.files && onExcel(e.target.files[0])}
          />
        </label>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {["W (in)", "H (in)", "+DP", "-DP", "Screws", "Note"].map((h) => (
                <th key={h} className="px-2 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                {/* Width */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.001"
                    value={r.widthIn ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, widthIn: v } : row
                        )
                      );
                    }}
                  />
                </td>

                {/* Height */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.001"
                    value={r.heightIn ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, heightIn: v } : row
                        )
                      );
                    }}
                  />
                </td>

                {/* +DP */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={r.dpPosPsf ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, dpPosPsf: v } : row
                        )
                      );
                    }}
                  />
                </td>

                {/* -DP */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={r.dpNegPsf ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, dpNegPsf: v } : row
                        )
                      );
                    }}
                  />
                </td>

                {/* Screws */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={r.screws ?? ""}
                    onChange={(e) => {
                      const v =
                        e.target.value === "" ? undefined : Number(e.target.value);

                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, screws: v } : row
                        )
                      );
                    }}
                  />
                </td>

                {/* Note */}
                <td className="px-2 py-1">
                  <input
                    value={r.note ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, note: v } : row
                        )
                      );
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn-primary" onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Guardar reglas"}
      </button>
    </div>
  );
}
