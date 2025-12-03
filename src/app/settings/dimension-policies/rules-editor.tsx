// src/app/settings/dimension-policies/rules-editor.tsx
"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { bulkUpsertRules, RuleRow } from "@/app/api/dimension-policies.api";
import { toast } from "sonner";

type Props = {
  idPolicy: number;
  initialRows?: RuleRow[];
};

export default function RulesEditor({ idPolicy, initialRows = [] }: Props) {
  // 👇 arrancamos el estado con las filas iniciales
  const [rows, setRows] = useState<RuleRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  // 👇 si cambian las initialRows (cuando se carga la página), sincronizamos
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

  const onCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          const parsed = (res.data as any[]).map((r) => ({
            widthIn: Number(r.widthIn),
            heightIn: Number(r.heightIn),
            dpPosPsf: Number(r.dpPosPsf),
            dpNegPsf: Number(r.dpNegPsf),
            screws:
              r.screws !== undefined && r.screws !== ""
                ? Number(r.screws)
                : undefined,
            note: r.note ?? undefined,
          })) as RuleRow[];

          setRows(parsed);
          toast.success(`Importadas ${parsed.length} filas`);
        } catch {
          toast.error("CSV inválido");
        }
      },
      error: () => toast.error("No se pudo leer el CSV"),
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Validación básica
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
      toast.error(e.message ?? "Error guardando reglas");
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
          Import CSV
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => e.target.files && onCSV(e.target.files[0])}
          />
        </label>

        <a
          className="underline text-sm"
          href={`data:text/csv,${encodeURIComponent(
            "widthIn,heightIn,dpPosPsf,dpNegPsf,screws,note\n"
          )}`}
          download="dimension-rules-template.csv"
        >
          Descargar template CSV
        </a>
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
                {/* widthIn */}
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

                {/* heightIn */}
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

                {/* dpPosPsf */}
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

                {/* dpNegPsf */}
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

                {/* screws */}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="1"
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

                {/* note */}
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
