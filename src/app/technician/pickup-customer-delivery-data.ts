import { technicianCustomerDeliveryOptions } from "@/app/api/technician.api";
import { warehouseInventoryByPo, warehousePickupCustomerDeliveryOptions, type WarehousePoInventory } from "@/app/api/warehouse.api";

export type PickupDeliverySurface = "technician" | "warehouse";
export const pickupDeliveryContextKey = (surface: PickupDeliverySurface, actorId: number, runId: number) =>
  `${surface}-pickup-customer-delivery:${actorId}:${runId}`;

export function emptyPickupCustomerDelivery(surface: PickupDeliverySurface) {
  const options = { items: [], total: 0, page: 1, pageSize: 20, countOpen: false };
  if (surface === "technician") return { surface, options } as const;
  const inventory: WarehousePoInventory = {
    items: [], total: 0, page: 1, pageSize: 20,
    summary: { onHand: 0, unassigned: 0, inTransit: 0, released: 0 }, activeCountId: null,
  };
  return { surface, options, inventory } as const;
}

export async function loadPickupCustomerDelivery(surface: PickupDeliverySurface, runId: number, poKey: string, poNumber: string) {
  const options = surface === "technician"
    ? await technicianCustomerDeliveryOptions({ pickupRunId: runId, poKey, page: 1, pageSize: 20 })
    : await warehousePickupCustomerDeliveryOptions(runId, poKey);
  // Match the internal source key, never only the printed PO number.
  const chosen = options.items.find(po => po.key === poKey);
  const scoped = { ...options, items: chosen ? [chosen] : [], total: chosen ? 1 : 0 };
  if (surface === "technician") return { surface, options: scoped } as const;

  let inventory: WarehousePoInventory = {
    items: [], total: 0, page: 1, pageSize: 20,
    summary: { onHand: 0, unassigned: 0, inTransit: 0, released: 0 },
    activeCountId: null,
  };
  if (chosen) {
    for (let page = 1; ; page++) {
      const result = await warehouseInventoryByPo({ view: "in_transit", search: poNumber, completePo: true, page, pageSize: 20 });
      const group = result.items.find(po => po.key === poKey);
      if (group) {
        const units = chosen.lines.map(line => {
          const unit = group.units.find(value => value.lineNumber === line.lineNumber);
          if (!unit || unit.version !== line.version || unit.inTransit < line.inTransit)
            throw new Error("The available parts changed. Try again to review the current quantities.");
          // Inventory supplies display details; the server's pickup lots supply the quantities.
          return { ...unit, inTransit: line.inTransit };
        });
        inventory = { ...result, items: [{ ...group, units }], total: 1, page: 1 };
        break;
      }
      if (page * result.pageSize >= result.total || !result.items.length)
        throw new Error("The available parts changed. Try again to review the current quantities.");
    }
  }
  return { surface, options: scoped, inventory } as const;
}
