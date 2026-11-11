import type { WarehouseUnit, WarehouseUnitDimensions } from "@/app/api/warehouse.api";

const additionalDimensions: Array<[keyof WarehouseUnitDimensions, string]> = [
  ["doorWidth", "Door width"],
  ["doorHeight", "Door height"],
  ["leftSideliteWidth", "Left sidelite width"],
  ["rightSideliteWidth", "Right sidelite width"],
  ["heightLeft", "Left height"],
  ["heightRight", "Right height"],
  ["legHeight", "Leg height"],
  ["sashHeight", "Sash height"],
  ["windowHeight", "Window height"],
];

function dimension(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(number) : null;
}

export function InternalUnitDimensions({ unit }: { unit: Pick<WarehouseUnit, "source" | "dimensions"> }) {
  if (unit.source !== "ORDER" || !unit.dimensions) return null;
  const width = dimension(unit.dimensions.width);
  const height = dimension(unit.dimensions.height);
  const details = additionalDimensions.flatMap(([key, label]) => {
    const value = dimension(unit.dimensions?.[key]);
    return value ? [`${label}: ${value}″`] : [];
  });
  if (!width && !height && !details.length) return null;

  return <div className="mt-1 space-y-0.5 text-sm text-slate-600" aria-label="Piece dimensions in inches">
    {(width || height) && <p>Size: {[width && `${width}″ W`, height && `${height}″ H`].filter(Boolean).join(" × ")}</p>}
    {details.length > 0 && <p className="flex flex-wrap gap-x-3 gap-y-0.5">
      {details.map(detail => <span key={detail}>{detail}</span>)}
    </p>}
  </div>;
}
