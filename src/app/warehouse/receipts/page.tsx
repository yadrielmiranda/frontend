import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventory, warehouseStores } from "@/app/api/warehouse.api";
import { ReceiptsClient } from "./receipts-client";

export default async function ReceiptsPage() {
  await requireWarehouseUser();
  const [initial, stores] = await Promise.all([
    warehouseInventory({ view: "in_transit" }), warehouseStores(),
  ]);
  return <ReceiptsClient initial={initial} initialStores={stores} />;
}
