import type { CustomerDeliveryRequest, WarehouseUnit } from "@/app/api/warehouse.api";
import type { SignatureStrokes } from "@/app/api/contracts.api";

export type DeliverySource = "TRANSIT" | "WAREHOUSE";
export type DeliverySelection = Record<string, { unit: WarehouseUnit; quantity: string }>;
export const MAX_DELIVERY_PIECES = 500;

export function deliveryAvailable(unit: WarehouseUnit, source: DeliverySource, storeId: string) {
  if (source === "TRANSIT") return unit.inTransit;
  if (storeId === "unassigned") return unit.unassigned;
  return unit.stores.find((store) => String(store.id) === storeId)?.onHand ?? 0;
}

export function deliveryItems(selection: DeliverySelection, source: DeliverySource, storeId: string) {
  const chosen = Object.values(selection);
  if (!chosen.length || chosen.length > MAX_DELIVERY_PIECES)
    throw new Error(`Select between 1 and ${MAX_DELIVERY_PIECES} pieces.`);
  if (source === "WAREHOUSE" && storeId !== "unassigned" && !/^[1-9]\d*$/.test(storeId))
    throw new Error("Choose the source store.");
  return chosen.map(({ unit, quantity }) => {
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 200 || count > deliveryAvailable(unit, source, storeId))
      throw new Error(`Enter an available whole number of parts for line ${unit.lineNumber}.`);
    return { barcode: unit.barcode, version: unit.version, quantity: count };
  }).sort((a, b) => a.barcode.localeCompare(b.barcode));
}

export function hasDeliverySignature(signature: SignatureStrokes) {
  if (!signature.length || signature.length > 100) return false;
  let points = 0, distance = 0;
  for (const stroke of signature) {
    if (!stroke.length || stroke.length > 3000) return false;
    for (let index = 0; index < stroke.length; index++) {
      const point = stroke[index];
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return false;
      points++;
      if (index > 0) distance += Math.hypot(point.x - stroke[index - 1].x, point.y - stroke[index - 1].y);
    }
  }
  return points >= 5 && points <= 5000 && distance >= 0.08;
}

export function customerDeliveryRequest({ selection, source, storeId, firstName, lastName, signatureStrokes, requestKey }: {
  selection: DeliverySelection; source: DeliverySource; storeId: string;
  firstName: string; lastName: string; signatureStrokes: SignatureStrokes; requestKey: string;
}): CustomerDeliveryRequest {
  const first = firstName.trim().replace(/\s+/g, " "), last = lastName.trim().replace(/\s+/g, " ");
  if (!first || !last || first.length > 100 || last.length > 100)
    throw new Error("Enter the recipient's first and last name.");
  if (!hasDeliverySignature(signatureStrokes)) throw new Error("Ask the recipient to sign the receipt.");
  return {
    requestKey, source, ...(source === "WAREHOUSE" ? { storeId: storeId === "unassigned" ? null : Number(storeId) } : {}),
    firstName: first, lastName: last, signatureStrokes,
    items: deliveryItems(selection, source, storeId),
  };
}
