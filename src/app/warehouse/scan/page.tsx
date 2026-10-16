import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventory, warehouseStores } from "@/app/api/warehouse.api";
import { ScanClient } from "./scan-client";
export default async function ScanPage({ searchParams }: {
  searchParams: Promise<{ action?: string; destination?: string; storeId?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const initialRelease = query.action === "RELEASE" && query.destination === "installation";
  const initialStoreId = query.storeId === "unassigned" || /^[1-9]\d*$/.test(query.storeId ?? "") ? query.storeId! : "";
  const [initial, stores] = await Promise.all([warehouseInventory({ pageSize: 1 }), warehouseStores()]);
  return <ScanClient actorId={user.id} isAdmin={user.role?.name === "admin"} activeCountId={initial.activeCountId}
    initialStores={stores} initialRelease={initialRelease} initialStoreId={initialRelease ? initialStoreId : ""} />;
}
