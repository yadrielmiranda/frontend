import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventory, warehouseStores } from "@/app/api/warehouse.api";
import { ScanClient } from "./scan-client";
export default async function ScanPage() {
  await requireWarehouseUser();
  const [initial, stores] = await Promise.all([warehouseInventory({ pageSize: 1 }), warehouseStores()]);
  return <ScanClient activeCountId={initial.activeCountId} initialStores={stores} />;
}
