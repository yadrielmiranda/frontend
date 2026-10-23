import { technicianState } from "@/app/api/technician.api";
import { requireTechnicianDeliveryUser } from "../../../customer-deliveries/technician-delivery-access";
import { technicianStoreSelection } from "../../warehouse-data";
import { TechnicianReleaseScan } from "./release-scan";

export default async function TechnicianReleaseScanPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  const user = await requireTechnicianDeliveryUser();
  const state = await technicianState();
  return <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6"><TechnicianReleaseScan key={user.id} actorId={user.id} initial={state} initialStoreId={technicianStoreSelection((await searchParams).storeId)} /></main>;
}
