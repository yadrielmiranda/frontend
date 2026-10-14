import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../../warehouse-access";
import { CustomerDeliveryReceiptClient } from "./receipt-client";

export default async function CustomerDeliveryReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWarehouseUser();
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <CustomerDeliveryReceiptClient key={`${id}:${user.id}:${user.role?.name}`} id={Number(id)} initialIdentity={{ id: user.id, role: user.role?.name ?? "" }} />;
}
