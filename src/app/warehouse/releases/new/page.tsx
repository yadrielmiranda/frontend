import { requireWarehouseUser } from "../../warehouse-access";
import { warehouseInventoryByPo, warehouseStores } from "@/app/api/warehouse.api";
import { ReleaseClient } from "../release-client";

export default async function NewWarehouseReleasePage({ searchParams }: {
  searchParams: Promise<{ storeId?: string; search?: string; poKey?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const storeId = query.storeId === "unassigned" || /^[1-9]\d*$/.test(query.storeId ?? "") ? query.storeId! : "";
  const search = (query.search ?? "").slice(0, 150);
  const [initial, stores] = await Promise.all([
    warehouseInventoryByPo({ view: "on_hand", storeId: storeId || undefined, search, completePo: true, pageSize: 20 }),
    warehouseStores(),
  ]);
  return <ReleaseClient actorId={user.id} actorRole={user.role?.name ?? ""} initial={initial} initialStores={stores}
    initialStoreId={storeId} initialSearch={search} initialPoKey={(query.poKey ?? "").slice(0, 150)} />;
}
