import type { MaterialProduct } from "@/app/api/materials.api";

/** Informational preview only. The server rechecks reservations under a stock lock. */
export function materialOpeningPreview(product: MaterialProduct, storeId: number, presentationId: number, amount: number) {
  const presentation = product.presentations.find(p => p.id === presentationId);
  const store = product.inventoryByStore.find(s => s.store.id === storeId);
  if (!presentation?.isBase || !store || !Number.isInteger(amount) || amount < 1 || amount > store.availableBaseQuantity) return [];
  let needed = Math.max(0, amount - (store.presentations.find(p => p.id === presentationId)?.quantity ?? 0));
  const opened: Array<{ name: string; quantity: number }> = [];
  for (const pack of product.presentations.filter(p => !p.isBase).sort((a, b) => a.multiplier - b.multiplier || a.id - b.id)) {
    if (needed <= 0) break;
    const stock = store.presentations.find(p => p.id === pack.id);
    if (!stock) continue;
    const count = Math.min(stock.quantity - stock.reservedQuantity, Math.ceil(needed / pack.multiplier));
    if (count <= 0) continue;
    opened.push({ name: pack.name, quantity: count });
    needed -= count * pack.multiplier;
  }
  return opened;
}
