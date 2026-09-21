import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventory } from "@/app/api/warehouse.api";
import { ScanClient } from "./scan-client";
export default async function ScanPage() {
  await requireWarehouseUser();
  const initial = await warehouseInventory({ pageSize: 1 });
  return <ScanClient activeCountId={initial.activeCountId} />;
}
