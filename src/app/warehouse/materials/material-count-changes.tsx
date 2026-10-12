import type { MaterialMovement, MaterialProduct } from "@/app/api/materials.api";
import { quantity } from "./materials-shared";

export function MaterialCountChanges({ movement, presentations }: {
  movement: MaterialMovement;
  presentations: MaterialProduct["presentations"];
}) {
  if (movement.kind !== "COUNT_ADJUSTMENT" || !movement.details || typeof movement.details !== "object") return null;
  const changes = "changes" in movement.details ? movement.details.changes : undefined;
  if (!Array.isArray(changes)) return null;
  const rows = changes.flatMap((change: unknown, index) => {
    if (!change || typeof change !== "object" || !("presentationId" in change) || !("before" in change) || !("after" in change)) return [];
    const { presentationId, before, after } = change;
    if (typeof presentationId !== "number" || typeof before !== "number" || typeof after !== "number" ||
      !Number.isSafeInteger(presentationId) || !Number.isSafeInteger(before) || !Number.isSafeInteger(after) || before < 0 || after < 0) return [];
    const presentation = presentations.find(item => item.id === presentationId);
    const label = presentation ? `${presentation.name} (${presentation.isBase ? "loose" : "closed"})` : `Presentation #${presentationId}`;
    return [<li key={`${presentationId}-${index}`}>{label}: {quantity(before)} → {quantity(after)}</li>];
  });
  return rows.length ? <ul aria-label="Inventory count changes" className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">{rows}</ul> : null;
}
