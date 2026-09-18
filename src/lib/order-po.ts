type OrderPoSummary = {
  poNumber?: string | null;
  status?: { name?: string | null } | null;
};

export function hasFactoryPo(order: OrderPoSummary) {
  return Boolean(order.poNumber?.trim());
}

// La tarjeta y su filtro comparten el mismo criterio para mostrar las mismas órdenes.
export function isPendingPoOrder(order: OrderPoSummary) {
  return !hasFactoryPo(order) &&
    order.status?.name?.trim().toLowerCase() !== "delivered";
}
