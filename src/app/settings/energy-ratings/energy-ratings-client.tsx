"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateEnergyRating } from "@/app/api/energy-ratings.api";
import { formatEnergyValue, type EnergyCatalogOptions, type EnergyRating } from "@/lib/energy-ratings";
import { EnergyRatingForm } from "./energy-rating-form";

export function EnergyRatingsClient({ initialRatings, options, canEdit }: {
  initialRatings: EnergyRating[];
  options: EnergyCatalogOptions;
  canEdit: boolean;
}) {
  const [ratings, setRatings] = useState(initialRatings);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<{ rating?: EnergyRating } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ratings.filter((row) => [row.system.brand.name, row.system.product.name,
      row.system.name, row.crystal.name, row.tint.name, row.coating.name, row.privacy.name,
      row.config?.name,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [ratings, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 25));
  const visiblePage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(visiblePage * 25, (visiblePage + 1) * 25);

  const saveRow = (rating: EnergyRating) => {
    setRatings((current) => current.some((row) => row.id === rating.id)
      ? current.map((row) => row.id === rating.id ? rating : row)
      : [rating, ...current]);
  };

  async function toggleActive(rating: EnergyRating) {
    setSavingId(rating.id);
    try {
      saveRow(await updateEnergyRating(rating.id, { isActive: !rating.isActive }));
      toast.success(rating.isActive ? "Energy rating deactivated" : "Energy rating activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update energy rating");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="max-w-md" placeholder="Filter energy ratings..." aria-label="Filter energy ratings" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{rows.length} results</span>
          {canEdit && <Button onClick={() => setEditor({})}><Plus className="h-4 w-4" />New Energy Rating</Button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y bg-slate-50 text-left">
            <tr>{["System", "Glass", "Tint", "Coating", "Privacy", "Configuration", "U-factor", "SHGC", "VLT", "Status", ...(canEdit ? ["Actions"] : [])].map((title) => <th key={title} className="whitespace-nowrap p-3 font-medium">{title}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((rating) => <tr key={rating.id} className="border-b align-top">
              <td className="p-3"><div className="font-medium">{rating.system.name}</div><div className="text-xs text-muted-foreground">{rating.system.brand.name}<br />{rating.system.product.name}</div></td>
              <td className="min-w-40 p-3">{rating.crystal.name}</td>
              <td className="p-3">{rating.tint.name}</td>
              <td className="p-3">{rating.coating.name}</td>
              <td className="p-3">{rating.privacy.name}</td>
              <td className="p-3">{rating.config?.name ?? "All configurations"}</td>
              <td className="p-3 tabular-nums">{formatEnergyValue(rating.uFactor)}</td>
              <td className="p-3 tabular-nums">{formatEnergyValue(rating.shgc)}</td>
              <td className="p-3 tabular-nums">{formatEnergyValue(rating.vlt)}</td>
              <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${rating.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{rating.isActive ? "Active" : "Inactive"}</span>{rating.uFactor == null && <div className="mt-2 text-xs text-muted-foreground">Data unavailable</div>}</td>
              {canEdit && <td className="space-y-1 p-3"><Button size="sm" variant="outline" onClick={() => setEditor({ rating })}><Pencil className="h-3 w-3" />Edit</Button><Button size="sm" variant="ghost" disabled={savingId !== null} onClick={() => toggleActive(rating)}>{rating.isActive ? "Deactivate" : "Activate"}</Button></td>}
            </tr>)}
            {!rows.length && <tr><td colSpan={canEdit ? 11 : 10} className="p-8 text-center text-muted-foreground">{ratings.length ? "No matching energy ratings." : "No energy ratings yet. Add a combination and its U-factor, SHGC and VLT values."}</td></tr>}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm">
        <span>Page {visiblePage + 1} of {pageCount}</span>
        <Button variant="outline" size="sm" disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={visiblePage >= pageCount - 1} onClick={() => setPage(visiblePage + 1)}>Next</Button>
      </div>}
      {canEdit && editor && <EnergyRatingForm options={options} rating={editor.rating} onClose={() => setEditor(null)} onSaved={(rating) => { saveRow(rating); setEditor(null); }} />}
    </div>
  );
}
