import { technicianState } from "@/app/api/technician.api";
import { isApiError } from "@/app/api/_base";
import {
  customerDeliveryRun,
  customerDeliveryRuns,
} from "@/app/api/customer-delivery-runs.api";
import { CustomerDeliveryRunsClient } from "@/app/warehouse/customer-deliveries/customer-delivery-runs-client";
import { requireTechnicianDeliveryUser } from "../../customer-deliveries/technician-delivery-access";
import { technicianStoreSelection } from "../warehouse-data";

export default async function TechnicianWarehouseCustomerDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string; runId?: string }>;
}) {
  const user = await requireTechnicianDeliveryUser();
  const query = await searchParams;
  const storeId = technicianStoreSelection(query.storeId);
  const id = /^[1-9]\d*$/.test(query.runId ?? "") ? Number(query.runId) : null;
  const [state, initialList, initialRun] = await Promise.all([
    technicianState(),
    customerDeliveryRuns({ status: "ACTIVE", page: 1, pageSize: 20 }),
    id ? customerDeliveryRun(id).catch(error => {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }) : null,
  ]);
  return (
    <main className="mx-auto min-h-dvh max-w-4xl space-y-5 px-4 py-6">
      <CustomerDeliveryRunsClient
        technician
        key={user.id}
        actorId={user.id}
        actorRole="technician"
        initialList={initialList}
        initialRun={initialRun}
        initialStores={state.stores}
        initialStoreId={storeId}
      />
    </main>
  );
}
