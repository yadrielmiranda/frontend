import { requireWarehouseUser } from "../warehouse-access";
import { warehouseInventory, warehouseStores } from "@/app/api/warehouse.api";
import { ScanClient } from "./scan-client";
import { customerDeliveryRun, customerDeliveryRuns } from "@/app/api/customer-delivery-runs.api";
import { isApiError } from "@/app/api/_base";
export default async function ScanPage({ searchParams }: {
  searchParams: Promise<{ action?: string; destination?: string; storeId?: string; runId?: string; manual?: string }>;
}) {
  const user = await requireWarehouseUser();
  const query = await searchParams;
  const initialRelease = query.action === "RELEASE" && query.destination === "installation";
  const initialCustomerDelivery = query.action === "RELEASE" && query.destination === "customer";
  const initialAction = query.action === "COLLECT" || query.action === "RELEASE" ? query.action : "RECEIVE";
  const isAdmin = user.role?.name === "admin";
  const runId = initialCustomerDelivery && /^[1-9]\d*$/.test(query.runId ?? "") && Number.isSafeInteger(Number(query.runId)) ? Number(query.runId) : null;
  const initialStoreId = query.storeId === "unassigned" || /^[1-9]\d*$/.test(query.storeId ?? "") ? query.storeId! : "";
  const [initial, stores, deliveries, delivery] = await Promise.all([
    warehouseInventory({ pageSize: 1 }), warehouseStores(),
    isAdmin ? customerDeliveryRuns({ status: "ACTIVE", page: 1, pageSize: 20 }) : undefined,
    isAdmin && runId ? customerDeliveryRun(runId).catch(error => {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }) : null,
  ]);
  return <ScanClient actorId={user.id} isAdmin={isAdmin} activeCountId={initial.activeCountId}
    initialStores={stores} initialAction={initialAction} initialRelease={initialRelease}
    initialCustomerDelivery={initialCustomerDelivery} initialDeliveries={deliveries} initialDelivery={delivery}
    initialManualDelivery={Boolean(delivery && query.manual === "1")}
    initialStoreId={initialAction === "RELEASE" ? initialStoreId : ""} />;
}
