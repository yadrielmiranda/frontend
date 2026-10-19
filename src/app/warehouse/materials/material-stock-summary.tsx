import type { MaterialProduct } from "@/app/api/materials.api";
import { quantity } from "./materials-shared";

/** Physical packages stay distinct from base units available inside those packages. */
export function summarizeMaterialStock(product: MaterialProduct) {
  const counts = new Map<number, { quantity: number; reservedQuantity: number }>();
  let totalBaseQuantity = 0, reservedBaseQuantity = 0, availableBaseQuantity = 0;
  for (const store of product.inventoryByStore) {
    totalBaseQuantity += store.totalBaseQuantity;
    reservedBaseQuantity += store.reservedBaseQuantity;
    availableBaseQuantity += store.availableBaseQuantity;
    for (const presentation of store.presentations) {
      const current = counts.get(presentation.id) ?? { quantity: 0, reservedQuantity: 0 };
      current.quantity += presentation.quantity;
      current.reservedQuantity += presentation.reservedQuantity;
      counts.set(presentation.id, current);
    }
  }
  const presentations = product.presentations.map(presentation => ({
    id: presentation.id,
    name: presentation.name,
    multiplier: presentation.multiplier,
    isBase: presentation.isBase,
    isActive: presentation.isActive,
    ...(counts.get(presentation.id) ?? { quantity: 0, reservedQuantity: 0 }),
  })).filter(presentation => presentation.quantity > 0)
    .sort((a, b) => Number(a.isBase) - Number(b.isBase));
  return { presentations, totalBaseQuantity, reservedBaseQuantity, availableBaseQuantity };
}

export function MaterialStockSummary({ product }: { product: MaterialProduct }) {
  const stock = summarizeMaterialStock(product);
  return <div className="space-y-3">
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-600">On hand by presentation</p>
      {stock.presentations.length ? <dl className="mt-1 divide-y divide-slate-200/80">
        {stock.presentations.map(presentation => <div key={presentation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2">
          <dt className="min-w-0">
            <span className="block break-words text-sm font-medium text-slate-950">{presentation.name}</span>
            {!presentation.isBase && <span className="block text-xs text-slate-500">{quantity(presentation.multiplier)} {product.baseUnit.name.toLowerCase()} each</span>}
            {presentation.reservedQuantity > 0 && <span className="block text-xs text-slate-600">{quantity(presentation.reservedQuantity)} reserved</span>}
            {!presentation.isActive && <span className="block text-xs text-amber-800">Inactive presentation</span>}
          </dt>
          <dd className="text-right text-2xl font-semibold tabular-nums tracking-tight text-slate-950">{quantity(presentation.quantity)}</dd>
        </div>)}
      </dl> : <p className="py-3 text-sm text-slate-500">No stock on hand</p>}
    </div>
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>Total: <span className="font-medium tabular-nums">{quantity(stock.totalBaseQuantity)}</span> {product.baseUnit.name.toLowerCase()}</p>
      <p className="flex flex-wrap gap-x-3 gap-y-1"><span>Reserved: <span className="tabular-nums">{quantity(stock.reservedBaseQuantity)}</span> {product.baseUnit.name.toLowerCase()}</span><span>Available: <span className="tabular-nums">{quantity(stock.availableBaseQuantity)}</span> {product.baseUnit.name.toLowerCase()}</span></p>
    </div>
  </div>;
}
