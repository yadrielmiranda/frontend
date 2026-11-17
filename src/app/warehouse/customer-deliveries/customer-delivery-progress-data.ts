import type {
  CustomerDeliveryRun,
  CustomerDeliveryRunOrder,
} from "@/app/api/customer-delivery-runs.api";
import type {
  CustomerDeliveryItem,
  CustomerDeliveryOrigin,
} from "@/app/api/warehouse.api";

export type DeliveryPieceState = "COMPLETE" | "PARTIAL" | "PENDING";

export type DeliveryPieceProgress = {
  key: string;
  item: CustomerDeliveryItem;
  scanned: number;
  pending: number;
  expected: number | null;
  unknown: boolean;
  state: DeliveryPieceState;
  allocations: CustomerDeliveryOrigin[];
};

export type DeliveryPoProgressData = {
  order: CustomerDeliveryRunOrder;
  pieces: DeliveryPieceProgress[];
  scanned: number;
  pending: number;
  expected: number | null;
  unknown: boolean;
};

const sourceKey = (item: Pick<CustomerDeliveryItem, "source" | "orderNumber" | "poNumber">) =>
  JSON.stringify([item.source, item.orderNumber, item.poNumber]);
const pieceKey = (item: CustomerDeliveryItem) =>
  JSON.stringify([sourceKey(item), item.lineNumber]);

/** A partly scanned piece appears in both lists, but is still one physical piece. */
export function deliveryPieceProgress(run: CustomerDeliveryRun): DeliveryPieceProgress[] {
  const pieces = new Map<string, DeliveryPieceProgress>();
  for (const [kind, items] of [
    ["scanned", run.items ?? []],
    ["pending", run.pendingItems ?? []],
  ] as const) {
    for (const item of items) {
      const key = pieceKey(item);
      const piece = pieces.get(key) ?? {
        key,
        item,
        scanned: 0,
        pending: 0,
        expected: 0,
        unknown: false,
        state: "PENDING" as const,
        allocations: [],
      };
      piece[kind] += item.quantity;
      piece.unknown ||= item.unknownQuantity === true;
      pieces.set(key, piece);
    }
  }
  return [...pieces.values()].map((piece): DeliveryPieceProgress => {
    const item = piece.item;
    const allocations = run.allocations
      ? run.allocations.filter((allocation) => pieceKey(allocation) === piece.key)
      : item.origins?.length
        ? item.origins
        : !run.multiStore && piece.scanned > 0
          ? [{ storeId: run.storeId, storeName: run.storeName || "Unassigned", quantity: piece.scanned, parts: item.parts }]
          : [];
    return {
      ...piece,
      expected: piece.unknown ? null : piece.scanned + piece.pending,
      state: piece.scanned > 0
        ? piece.pending > 0 || piece.unknown ? "PARTIAL" : "COMPLETE"
        : "PENDING",
      allocations: allocations.filter((allocation) => allocation.quantity > 0),
    };
  }).sort((a, b) => a.item.lineNumber.localeCompare(b.item.lineNumber, "en", { numeric: true }));
}

export function deliveryPoProgress(run: CustomerDeliveryRun): DeliveryPoProgressData[] {
  const pieces = deliveryPieceProgress(run);
  return run.orders.map((order) => {
    const matches = pieces.filter((piece) => sourceKey(piece.item) === sourceKey(order));
    const scanned = matches.reduce((sum, piece) => sum + piece.scanned, 0);
    const pending = matches.reduce((sum, piece) => sum + piece.pending, 0);
    const unknown = order.unknownPending || matches.some((piece) => piece.unknown);
    return { order, pieces: matches, scanned, pending, unknown, expected: unknown ? null : scanned + pending };
  });
}

export function deliveryProgressTotals(run: CustomerDeliveryRun) {
  const pieces = deliveryPieceProgress(run);
  const unknown = run.orders.some((order) => order.unknownPending) || pieces.some((piece) => piece.unknown);
  return {
    scanned: run.totalParts,
    pending: run.pendingParts,
    expected: unknown ? null : run.totalParts + run.pendingParts,
    unknown,
    pieces: pieces.length,
  };
}
