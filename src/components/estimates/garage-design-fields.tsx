"use client";

import type { SystemDesignOption } from "@/lib/garage-designs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { pieceGarageDesign } from "./piece-garage-design";
import { GarageDesignPreview } from "./garage-design-preview";

type Props = {
  locale?: "en" | "es";
  index: number; allowed: boolean; enabled: boolean; locked: boolean; retained: boolean;
  idDesign?: number | null; idDesignColor?: number | null;
  options: SystemDesignOption[]; selected: ReturnType<typeof pieceGarageDesign>; error: string | null;
  onToggle: (enabled: boolean) => void;
  onDesignChange: (id: number | null) => void;
  onColorChange: (id: number | null) => void;
};

export function GarageDesignFields(props: Props) {
  if (!props.allowed && !props.enabled) return null;
  const colors = [...new Map(props.options.map(option => [option.idDesignColor, option.color])).values()];
  const compatible = props.options.filter(option => !props.idDesignColor || option.idDesignColor === Number(props.idDesignColor));
  const designs = [...new Map(compatible.map(option => [option.idDesign, option.design])).values()];
  const currentAvailable = props.options.some(option => option.idDesign === Number(props.idDesign)
    && option.idDesignColor === Number(props.idDesignColor));
  const selectedColor = props.selected && props.selected.color.id === props.idDesignColor ? props.selected.color
    : colors.find(color => color.id === Number(props.idDesignColor));
  const swatchColor = selectedColor?.hexCode && /^#[0-9a-f]{6}$/i.test(selectedColor.hexCode) ? selectedColor.hexCode : undefined;
  const savedOnly = !!props.idDesign && !designs.some(design => design.id === props.idDesign);
  const spanish = props.locale === "es";
  const designLabel = spanish ? "Diseño" : "Design";
  const colorLabel = spanish ? "Color del diseño" : "Design Color";
  const unavailable = spanish ? "guardado / no disponible" : "saved / unavailable";

  return <div className="col-span-full space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4" data-garage-design-fields>
    {props.allowed ? <div className="flex items-center gap-2">
      <Checkbox id={`add-design-${props.index}`} checked={props.enabled} disabled={props.locked}
        onCheckedChange={value => props.onToggle(value === true)} />
      <label htmlFor={`add-design-${props.index}`} className="text-sm font-semibold">{spanish ? "Agregar diseño" : "Add design"}</label>
    </div> : <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold">{spanish ? "Diseño guardado" : "Saved design"}</p>
      {!props.locked && <Button type="button" size="sm" variant="outline" onClick={() => props.onToggle(false)}>{spanish ? "Quitar diseño" : "Remove design"}</Button>}
    </div>}
    {props.enabled && <>
      {props.retained && !currentAvailable && <p className="text-sm text-slate-600" role="status">
        {spanish ? "Esta pieza conserva el diseño y el color guardados. La combinación ya no está disponible para nuevas selecciones."
          : "The saved design and color are retained for this piece. This combination is no longer offered for new selections."}
      </p>}
      {props.allowed ? <>
        <div>
          <label htmlFor={`design-color-${props.index}`} className="mb-1 block text-sm font-medium">{colorLabel}</label>
          <div className="flex items-center gap-3">
            {swatchColor && <span aria-label={spanish ? `Muestra del color ${selectedColor?.name}` : `${selectedColor?.name} color swatch`} className="h-10 w-10 shrink-0 rounded border" style={{ backgroundColor: swatchColor }} />}
            <select id={`design-color-${props.index}`} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:opacity-60"
              value={props.idDesignColor ?? ""} disabled={props.locked}
              onChange={event => props.onColorChange(event.target.value ? Number(event.target.value) : null)}>
              <option value="">{spanish ? "Selecciona el color del diseño" : "Select design color"}</option>
              {!!props.idDesignColor && !colors.some(color => color.id === props.idDesignColor) &&
                <option value={props.idDesignColor} disabled>{props.selected?.color.name ?? `Color #${props.idDesignColor}`} ({unavailable})</option>}
              {colors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{designLabel}</legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
            {designs.map(design => {
              const isSelected = design.id === props.idDesign;
              const preview = isSelected && props.selected?.design.id === design.id ? props.selected.design : design;
              return <button type="button" key={design.id} aria-pressed={isSelected} aria-label={spanish ? `Seleccionar diseño ${preview.name}` : `Select design ${preview.name}`}
                disabled={props.locked} onClick={() => props.onDesignChange(design.id)}
                className={`w-full min-w-0 max-w-[136px] self-start rounded-lg border-2 bg-white p-2 text-center disabled:cursor-default ${isSelected ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-400"}`}>
                <GarageDesignPreview locale={props.locale} template={preview.template} imageUrl={preview.imageUrl} color={swatchColor} name={preview.name} className="w-full object-contain" />
                <span className="mt-1 block break-words text-xs font-medium">{preview.name}</span>
              </button>;
            })}
          </div>
          {!designs.length && !savedOnly && <p className="text-sm text-muted-foreground">{spanish ? "No hay diseños disponibles para este color." : "No designs are available for this color."}</p>}
        </fieldset>
      </> : <p className="text-sm">{designLabel}: {props.selected?.design.name} · {colorLabel}: {props.selected?.color.name}</p>}
      {props.selected && (!props.allowed || savedOnly) && <div className="w-[136px] max-w-full rounded-lg border bg-white p-2">
        <GarageDesignPreview locale={props.locale} template={props.selected.design.template} imageUrl={props.selected.design.imageUrl} color={swatchColor}
          name={props.selected.design.name} className="w-full object-contain" />
        <p className="mt-1 break-words text-xs">{props.selected.design.name} ({unavailable})</p>
      </div>}
      {props.error && <p role="alert" className="text-sm text-red-600">{props.error}</p>}
    </>}
  </div>;
}
