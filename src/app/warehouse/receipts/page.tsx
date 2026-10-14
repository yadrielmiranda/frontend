import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventoryByPo, warehouseStores } from "@/app/api/warehouse.api";
import { ReceiptsClient } from "./receipts-client";

export default async function ReceiptsPage() {
  await requireWarehouseUser();
  const [initial, stores] = await Promise.all([
    warehouseInventoryByPo({ view: "in_transit", completePo: true, pageSize: 20 }), warehouseStores(),
  ]);
  return <ReceiptsClient initial={initial} initialStores={stores} />;
}
