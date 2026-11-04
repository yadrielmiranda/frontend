import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventoryByPo, warehouseStores } from "@/app/api/warehouse.api";
import { ReceiptsClient } from "./receipts-client";

export default async function ReceiptsPage({ searchParams }: {
  searchParams: Promise<{ destination?: string; search?: string; poKey?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const search = (query.search ?? "").slice(0, 150);
  const initialDestination = query.destination === "customer" ? "customer" : "warehouse";
  const poKey = /^(order|external):[1-9]\d*$/.test(query.poKey ?? "") ? query.poKey! : "";
  const [initial, stores] = await Promise.all([
    warehouseInventoryByPo({ view: "in_transit", search, completePo: true, pageSize: 20 }), warehouseStores(),
  ]);
  return <ReceiptsClient key={user.id} actorId={user.id} actorRole={user.role?.name ?? ""} initial={initial} initialStores={stores}
    initialDestination={initialDestination} initialSearch={search} initialPoKey={poKey} />;
}
