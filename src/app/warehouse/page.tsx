import { requireWarehouseUser } from "./warehouse-access";
import { warehouseInventoryByPo, warehouseStores } from "@/app/api/warehouse.api";
import { InventoryClient } from "./inventory-client";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; view?: string; storeId?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const view = ["on_hand", "in_transit", "complete", "partial", "all"].includes(
    query.view ?? "",
  )
    ? query.view!
    : "on_hand";
  const search =
    typeof query.search === "string" ? query.search.slice(0, 150) : "";
  const storeId = view !== "in_transit" && (query.storeId === "unassigned" || (/^[1-9]\d*$/.test(query.storeId ?? "") && Number.isSafeInteger(Number(query.storeId)))) ? query.storeId! : "all";
  const [initial, stores] = await Promise.all([warehouseInventoryByPo({ search, view, storeId, pageSize: 20 }), warehouseStores()]);
  return (
    <InventoryClient
      initial={initial}
      initialStores={stores}
      initialStoreId={storeId}
      initialSearch={search}
      initialView={view}
      admin={user?.role?.name === "admin"}
    />
  );
}
