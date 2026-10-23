import { technicianState } from "@/app/api/technician.api";
import { technicianWarehouseInventoryByPo } from "@/app/api/technician-warehouse.api";
import { CustomerDeliveryClient } from "@/app/warehouse/customer-deliveries/customer-delivery-client";
import { requireTechnicianDeliveryUser } from "../../customer-deliveries/technician-delivery-access";
import { emptyTechnicianWarehouseInventory, technicianStoreSelection } from "../warehouse-data";

export default async function TechnicianWarehouseCustomerDeliveryPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  const user = await requireTechnicianDeliveryUser();
  const storeId = technicianStoreSelection((await searchParams).storeId);
  const [state, initial] = await Promise.all([
    technicianState(), storeId ? technicianWarehouseInventoryByPo({ storeId, page: 1, pageSize: 20 }) : emptyTechnicianWarehouseInventory(),
  ]);
  return <main className="mx-auto min-h-dvh max-w-4xl space-y-5 px-4 py-6"><h1 className="text-2xl font-semibold">Deliver to customer from warehouse</h1><CustomerDeliveryClient technician key={user.id} actorId={user.id} actorRole="technician" initial={initial} initialStores={state.stores} initialSource="WAREHOUSE" initialStoreId={storeId} /></main>;
}
