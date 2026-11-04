export function warehouseCustomerDeliveryPath({ storeId, runId, manual }: { storeId?: string; runId?: string | number; manual?: boolean } = {}) {
  const query = new URLSearchParams({ action: "RELEASE", destination: "customer" });
  if (storeId === "unassigned" || (/^[1-9]\d*$/.test(storeId ?? "") && Number.isSafeInteger(Number(storeId)))) query.set("storeId", storeId!);
  if (/^[1-9]\d*$/.test(String(runId ?? "")) && Number.isSafeInteger(Number(runId))) query.set("runId", String(runId));
  if (manual && query.has("runId")) query.set("manual", "1");
  return `/warehouse/scan?${query}`;
}

export function pendingReceiptCustomerDeliveryPath({ search, poKey }: { search?: string; poKey?: string } = {}) {
  const query = new URLSearchParams({ destination: "customer" });
  if (search) query.set("search", search.slice(0, 150));
  if (/^(order|external):[1-9]\d*$/.test(poKey ?? "") && Number.isSafeInteger(Number(poKey!.split(":")[1]))) query.set("poKey", poKey!);
  return `/warehouse/receipts?${query}`;
}
