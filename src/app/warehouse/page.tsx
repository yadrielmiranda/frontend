import { requireWarehouseUser } from "./warehouse-access";
import { warehouseInventory } from "@/app/api/warehouse.api";
import { InventoryClient } from "./inventory-client";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; view?: string }>;
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
  const initial = await warehouseInventory({ search, view });
  return (
    <InventoryClient
      initial={initial}
      initialSearch={search}
      initialView={view}
      admin={user?.role?.name === "admin"}
    />
  );
}
