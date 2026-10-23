import { technicianMaterialHistory, technicianWarehouseHistory } from "@/app/api/technician-warehouse.api";
import { requireTechnicianDeliveryUser } from "../../customer-deliveries/technician-delivery-access";
import { TechnicianWarehouseHistory } from "./warehouse-history-client";

export default async function TechnicianWarehouseHistoryPage() {
  const user = await requireTechnicianDeliveryUser();
  const [pieces, materials] = await Promise.all([
    technicianWarehouseHistory({ page: 1, pageSize: 20 }),
    technicianMaterialHistory({ page: 1, pageSize: 20 }),
  ]);
  return <main className="mx-auto min-h-dvh max-w-3xl space-y-5 px-4 py-6">
    <TechnicianWarehouseHistory key={user.id} actorId={user.id} initialPieces={pieces} initialMaterials={materials} />
  </main>;
}
