import { notFound } from "next/navigation";
import { requireTechnicianDeliveryUser } from "../technician-delivery-access";
import { TechnicianCustomerDeliveryReceiptClient } from "./receipt-client";

export default async function TechnicianCustomerDeliveryReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTechnicianDeliveryUser();
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <main className="mx-auto min-h-dvh max-w-4xl px-4 py-6"><TechnicianCustomerDeliveryReceiptClient key={`${id}:${user.id}`} id={Number(id)} actorId={user.id} /></main>;
}
