import { requireWarehouseUser } from "../../warehouse-access";
import { warehouseInventory, warehouseStores } from "@/app/api/warehouse.api";
import { CustomerDeliveryClient } from "../customer-delivery-client";

export default async function NewCustomerDeliveryPage({ searchParams }: {
  searchParams: Promise<{ source?: string; storeId?: string; search?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const source = query.source === "TRANSIT" ? "TRANSIT" : "WAREHOUSE";
  const storeId = query.storeId === "unassigned" || /^[1-9]\d*$/.test(query.storeId ?? "") ? query.storeId! : "";
  const search = (query.search ?? "").slice(0, 150);
  const [initial, stores] = await Promise.all([
    warehouseInventory({ view: source === "TRANSIT" ? "in_transit" : "on_hand", storeId: source === "WAREHOUSE" && storeId ? storeId : undefined, search }),
    warehouseStores(),
  ]);
  return <CustomerDeliveryClient actorId={user.id} actorRole={user.role?.name ?? ""} initial={initial} initialStores={stores} initialSource={source} initialStoreId={storeId} initialSearch={search} />;
}
