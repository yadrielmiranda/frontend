"use client";

import { GarageDesignPreview } from "@/components/estimates/garage-design-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateGarageDesignTemplate, type GarageDesignTemplate } from "@/lib/garage-design-templates";

export interface GarageDesignTemplateDraft {
  columnWidths: string[];
  rows: number[];
  cells: GarageDesignTemplate["cells"];
}

export function createTemplateDraft(template?: GarageDesignTemplate | null): GarageDesignTemplateDraft {
  if (template) return {
    columnWidths: template.columns.map((width) => String(width * 100)),
    rows: [...template.rows],
    cells: template.cells.map((row) => [...row]),
  };
  return { columnWidths: ["100"], rows: [0.25, 0.25, 0.25, 0.25], cells: [["slat"], ["slat"], ["slat"], ["slat"]] };
}

export function normalizeTemplateDraft(draft: GarageDesignTemplateDraft): GarageDesignTemplate | null {
  const widths = draft.columnWidths.map(Number);
  if (draft.columnWidths.some((width) => !width.trim()) || widths.some((width) => !Number.isFinite(width) || width <= 0)) return null;
  const total = widths.reduce((sum, width) => sum + width, 0);
  return validateGarageDesignTemplate({ version: 1, columns: widths.map((width) => width / total), rows: draft.rows, cells: draft.cells });
}

function resizeTemplate(draft: GarageDesignTemplateDraft, rowCount: number, columnCount: number): GarageDesignTemplateDraft {
  const positiveWidths = draft.columnWidths.map(Number).filter((width) => Number.isFinite(width) && width > 0);
  const averageWidth = positiveWidths.length ? positiveWidths.reduce((sum, width) => sum + width, 0) / positiveWidths.length : 100 / columnCount;
  return {
    columnWidths: Array.from({ length: columnCount }, (_, column) => draft.columnWidths[column] ?? String(averageWidth)),
    rows: rowCount === draft.rows.length ? [...draft.rows] : Array.from({ length: rowCount }, () => 1 / rowCount),
    cells: Array.from({ length: rowCount }, (_, row) => Array.from({ length: columnCount }, (_, column) => draft.cells[row]?.[column] ?? "slat")),
  };
}

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

export function GarageDesignTemplateEditor({ value, onChange, color, name }: {
  value: GarageDesignTemplateDraft;
  onChange: (draft: GarageDesignTemplateDraft) => void;
  color?: string;
  name: string;
}) {
  const template = normalizeTemplateDraft(value);
  return (
    <section className="space-y-4 rounded-lg border bg-slate-50 p-4" aria-label="Design layout editor">
      <div><h3 className="font-medium">Design layout</h3><p className="mt-1 text-sm text-muted-foreground">Choose the divisions, then click each panel to switch between slats and glass.</p></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor="template-rows">Rows</Label><select id="template-rows" className={selectClass} value={value.rows.length} onChange={(event) => onChange(resizeTemplate(value, Number(event.target.value), value.columnWidths.length))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="template-columns">Columns</Label><select id="template-columns" className={selectClass} value={value.columnWidths.length} onChange={(event) => onChange(resizeTemplate(value, value.rows.length, Number(event.target.value)))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Relative column widths (%)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.columnWidths.map((width, column) => <div className="space-y-1" key={column}>
            <Label htmlFor={`template-width-${column}`} className="text-xs">Column {column + 1}</Label>
            <Input id={`template-width-${column}`} type="number" min="0" step="any" required value={width} aria-invalid={!width.trim() || !Number.isFinite(Number(width)) || Number(width) <= 0} onChange={(event) => onChange({ ...value, columnWidths: value.columnWidths.map((current, index) => index === column ? event.target.value : current) })} />
          </div>)}
        </div>
        <p className="text-xs text-muted-foreground">Widths are scaled to a total of 100% when saved. Changing the row count makes all rows equal height.</p>
      </div>
      <div className="overflow-x-auto rounded border bg-white p-2">
        <div className="grid gap-1" style={{ minWidth: value.columnWidths.length * 70, gridTemplateColumns: value.columnWidths.map((width) => `${Number(width) > 0 && Number.isFinite(Number(width)) ? Number(width) : 1}fr`).join(" "), gridTemplateRows: value.rows.map((height) => `${height}fr`).join(" ") }}>
          {value.cells.flatMap((row, rowIndex) => row.map((material, columnIndex) => <Button key={`${rowIndex}-${columnIndex}`} type="button" variant="outline" className={`h-full min-h-10 px-1 text-xs ${material === "glass" ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-300 bg-slate-100"}`} aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${material === "glass" ? "Glass" : "Slats"}`} aria-pressed={material === "glass"} onClick={() => onChange({ ...value, cells: value.cells.map((current, r) => current.map((cell, c) => r === rowIndex && c === columnIndex ? cell === "glass" ? "slat" : "glass" : cell)) })}>{material === "glass" ? "Glass" : "Slats"}</Button>))}
        </div>
      </div>
      {template ? <GarageDesignPreview template={template} color={color} name={name || "Design preview"} className="mx-auto h-52 w-full max-w-sm" /> : <p role="alert" className="text-sm text-destructive">Enter a positive width for every column.</p>}
    </section>
  );
}
