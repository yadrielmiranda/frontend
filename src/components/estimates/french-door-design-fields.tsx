"use client";

import { useRef, useState } from "react";
import { FrenchDoorDesignThumbnail } from "@/components/piece-diagram/renderers/french-door/french-door-design-thumbnail";
import type { DoorDesignOption } from "@/lib/door-designs";

type Props = {
  locale?: "en" | "es";
  options: readonly DoorDesignOption[];
  selected: DoorDesignOption | null;
  selectedId?: number | null;
  frameColorHex?: string | null;
  glassTintHex?: string | null;
  highBottom?: boolean;
  locked: boolean;
  onChange: (id: number | null) => void;
};

export function FrenchDoorDesignFields({ options, selected, selectedId, frameColorHex, glassTintHex, highBottom, locked, onChange, locale = "en" }: Props) {
  const picker = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(false);
  if (!options.length && !selectedId) return null;
  const available = options.some(item => item.id === selectedId);
  const spanish = locale === "es";
  const noDesign = spanish ? "Sin diseño" : "No design";
  const label = selected?.code ?? (selectedId ? (spanish ? "Diseño no disponible" : "Unavailable design") : noDesign);
  function choose(id: number | null) {
    if (locked) return;
    onChange(id);
    setExpanded(false);
    if (picker.current) {
      picker.current.open = false;
      picker.current.querySelector("summary")?.focus();
    }
  }
  return <fieldset className="min-w-0">
    <legend className="mb-2 text-sm font-semibold text-slate-800">{spanish ? "Diseño de la puerta" : "Door Design"}</legend>
    {locked ? <p className="text-sm">{label}</p> : <details ref={picker} className="max-w-2xl"
      onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary aria-label={spanish ? `Elegir diseño de puerta. Selección actual: ${label}` : `Choose door design, current: ${label}`}
        className="w-fit cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium">{label}</summary>
      {expanded && <div className="mt-2 grid max-h-64 grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2 overflow-y-auto p-1">
        <button type="button" aria-pressed={!selectedId} onClick={() => choose(null)}
          className="min-h-20 rounded-md border bg-white px-2 text-sm aria-pressed:border-blue-600 aria-pressed:ring-1 aria-pressed:ring-blue-600">{noDesign}</button>
        {options.map(design => <button type="button" key={design.id} aria-pressed={design.id === selectedId}
          onClick={() => choose(design.id)} className="rounded-md border bg-white p-2 text-center text-sm aria-pressed:border-blue-600 aria-pressed:ring-1 aria-pressed:ring-blue-600">
          <div aria-hidden="true" className="h-20 w-full">
            <FrenchDoorDesignThumbnail artworkKey={design.artworkKey} frameColorHex={frameColorHex} glassTintHex={glassTintHex} highBottom={highBottom} />
          </div>
          <span className="mt-1 block break-words">{selected?.id === design.id ? selected.code : design.code}</span>
        </button>)}
      </div>}
    </details>}
    {!!selectedId && !available && <p className="mt-1 text-sm text-muted-foreground" role="status">
      {selected
        ? (spanish ? "Esta pieza conserva el diseño guardado. Ya no se ofrece para esta configuración." : "Saved design. This design is no longer offered for this configuration.")
        : (spanish ? "Elige otro diseño antes de calcular." : "Choose another design before calculating.")}
    </p>}
  </fieldset>;
}
