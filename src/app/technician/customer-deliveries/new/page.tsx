import { technicianCustomerDeliveryOptions } from "@/app/api/technician.api";
import { TechnicianCustomerDeliveryClient } from "../customer-delivery-client";
import { requireTechnicianDeliveryUser } from "../technician-delivery-access";

export default async function TechnicianCustomerDeliveryPage({ searchParams }: { searchParams: Promise<{ poKey?: string }> }) {
  const user = await requireTechnicianDeliveryUser();
  const query = await searchParams;
  const poKey = /^(order|external):[1-9]\d*$/.test(query.poKey ?? "") ? query.poKey : undefined;
  const initial = await technicianCustomerDeliveryOptions({ poKey, page: 1, pageSize: 20 });
  return <main className="mx-auto min-h-dvh max-w-3xl space-y-5 px-4 py-6"><TechnicianCustomerDeliveryClient key={user.id} actorId={user.id} initial={initial} initialPoKey={poKey} /></main>;
}
