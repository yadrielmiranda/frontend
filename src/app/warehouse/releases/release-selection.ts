import type { WarehouseReleaseRequest } from "@/app/api/warehouse.api";
import { deliveryItems, type DeliverySelection } from "../customer-deliveries/customer-delivery-selection";

export type ReleaseLine = { barcode: string; lineNumber: string; poKey: string; poNumber: string; customer: string; description: string; quantity: number };
export type PendingRelease = { body: WarehouseReleaseRequest; storeName: string; lines: ReleaseLine[] };

export function prepareRelease(selection: DeliverySelection, storeId: string, storeName: string, requestKey: string): PendingRelease {
  const items = deliveryItems(selection, "WAREHOUSE", storeId);
  return {
    body: { requestKey, storeId: storeId === "unassigned" ? null : Number(storeId), items }, storeName,
    lines: Object.values(selection).map(({ unit, quantity }) => ({
      barcode: unit.barcode, lineNumber: unit.lineNumber,
      poKey: unit.source === "EXTERNAL" ? `external:${unit.externalPoId}` : unit.orderId ? `order:${unit.orderId}` : `line:${unit.lineNumber}`,
      poNumber: unit.poNumber || unit.orderNumber || "No PO", customer: unit.customer || unit.project,
      description: unit.description || [unit.product, unit.system, unit.configuration].filter(Boolean).join(" · "), quantity: Number(quantity),
    })).sort((a, b) => a.barcode.localeCompare(b.barcode)),
  };
}

export function parsePendingRelease(raw: string): PendingRelease {
  const value = JSON.parse(raw) as PendingRelease;
  const body = value?.body;
  if (!body || typeof body.requestKey !== "string" || !body.requestKey ||
    !(body.storeId === null || (Number.isSafeInteger(body.storeId) && body.storeId > 0)) ||
    typeof value.storeName !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 500 ||
    !Array.isArray(value.lines) || value.lines.length !== body.items.length) throw new Error("Invalid pending release");
  const unique = new Set<string>();
  for (const item of body.items) {
    const line = value.lines.find((entry) => entry.barcode === item.barcode);
    if (typeof item.barcode !== "string" || !item.barcode || unique.has(item.barcode) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 200 ||
      !Number.isInteger(item.version) || item.version < 0 || !line || line.quantity !== item.quantity ||
      [line.lineNumber, line.poKey, line.poNumber, line.customer, line.description].some((entry) => typeof entry !== "string"))
      throw new Error("Invalid pending release");
    unique.add(item.barcode);
  }
  return value;
}

export function releasePoTotals(lines: ReleaseLine[]) {
  const groups = new Map<string, { key: string; poNumber: string; customer: string; pieces: number; parts: number }>();
  for (const line of lines) {
    const entry = groups.get(line.poKey) ?? { key: line.poKey, poNumber: line.poNumber, customer: line.customer, pieces: 0, parts: 0 };
    entry.pieces++; entry.parts += line.quantity;
    groups.set(line.poKey, entry);
  }
  return [...groups.values()];
}
