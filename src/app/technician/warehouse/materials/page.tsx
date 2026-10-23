import Link from "next/link";
import { ChevronRight, Warehouse } from "lucide-react";
import { technicianState } from "@/app/api/technician.api";
import { technicianMaterialInventory } from "@/app/api/technician-warehouse.api";
import { StoreMaterialInternalUseClient } from "@/app/warehouse/stores/store-material-internal-use-client";
import { Button } from "@/components/ui/button";
import { requireTechnicianDeliveryUser } from "../../customer-deliveries/technician-delivery-access";
import { technicianStoreSelection } from "../warehouse-data";

export default async function TechnicianMaterialsPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  const user = await requireTechnicianDeliveryUser();
  const storeId = technicianStoreSelection((await searchParams).storeId);
  if (storeId && storeId !== "unassigned") {
    const initial = await technicianMaterialInventory(Number(storeId));
    return <main className="mx-auto min-h-dvh max-w-4xl px-4 py-6"><StoreMaterialInternalUseClient technician key={`${user.id}:${storeId}`} initial={initial} initialIdentity={{ id: user.id, role: "technician" }} /></main>;
  }
  const state = await technicianState();
  return <main className="mx-auto min-h-dvh max-w-2xl space-y-5 px-4 py-6">
    <Button asChild variant="outline"><Link href="/technician">Technician home</Link></Button>
    <h1 className="text-2xl font-semibold">Materials for installation</h1>
    <p className="text-sm text-slate-600">Choose the store you are taking materials from.</p>
    {state.stores.map(store => <Link key={store.id} href={`/technician/warehouse/materials?storeId=${store.id}`} className="flex min-h-20 items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm hover:bg-slate-50">
      <Warehouse className="size-6 shrink-0 text-red-600" /><span className="flex-1 font-semibold">{store.name}</span><ChevronRight className="size-5" />
    </Link>)}
    {!state.stores.length && <p className="rounded-xl border bg-white p-5 text-sm">No active stores are available.</p>}
  </main>;
}
