export const materialMovementKinds = [
  ["RECEIVE", "Purchase received"],
  ["INTERNAL_USE", "Withdrawal for internal use"],
  ["TRANSFER_OUT", "Transfer out"],
  ["TRANSFER_IN", "Transfer in"],
  ["OPEN", "Packages opened"],
  ["PACK", "Packages prepared"],
  ["ADJUST", "Stock adjustment"],
  ["COUNT_ADJUSTMENT", "Inventory count"],
  ["SALE_DELIVERY", "Sale delivered"],
] as const;

export type MaterialHistoryFilters = {
  search: string; recipient: string; storeId: string; kind: string; from: string; to: string;
};
export const emptyMaterialHistoryFilters: MaterialHistoryFilters = {
  search: "", recipient: "", storeId: "", kind: "", from: "", to: "",
};

export const materialMovementLabel = (kind: string) =>
  materialMovementKinds.find(([value]) => value === kind)?.[1] ?? kind.replaceAll("_", " ");

function localDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a valid date.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (year < 1000 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    throw new Error("Enter a valid date.");
  return date;
}

export function materialHistoryQuery(filters: MaterialHistoryFilters, page = 1) {
  const query: Record<string, string | number> = { page, pageSize: 25 };
  const search = filters.search.trim(), recipient = filters.recipient.trim();
  if (search.length > 150 || recipient.length > 200) throw new Error("Shorten the material or recipient search.");
  if (search) query.search = search;
  if (recipient) query.recipient = recipient;
  if (filters.storeId) {
    if (!/^[1-9]\d*$/.test(filters.storeId) || !Number.isSafeInteger(Number(filters.storeId))) throw new Error("Select a valid store.");
    query.storeId = Number(filters.storeId);
  }
  if (filters.kind) {
    if (!materialMovementKinds.some(([kind]) => kind === filters.kind)) throw new Error("Select a valid movement type.");
    query.kind = filters.kind;
  }
  const from = filters.from ? localDate(filters.from) : null;
  const to = filters.to ? localDate(filters.to) : null;
  if (from && to && from > to) throw new Error("The end date must be on or after the start date.");
  if (from) query.from = from.toISOString();
  if (to) {
    // Calendar arithmetic keeps the entire selected local day, including DST changes.
    to.setDate(to.getDate() + 1);
    query.to = to.toISOString();
  }
  return query;
}
