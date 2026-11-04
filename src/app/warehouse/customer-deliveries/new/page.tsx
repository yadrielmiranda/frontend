import { requireWarehouseUser } from "../../warehouse-access";
import { redirect } from "next/navigation";
import { pendingReceiptCustomerDeliveryPath, warehouseCustomerDeliveryPath } from "../customer-delivery-navigation";

export default async function NewCustomerDeliveryPage({ searchParams }: {
  searchParams: Promise<{ source?: string; storeId?: string; search?: string; poKey?: string; runId?: string }>;
}) {
  await requireWarehouseUser();
  const query = await searchParams;
  const source = query.source === "TRANSIT" ? "TRANSIT" : "WAREHOUSE";
  const storeId = query.storeId === "unassigned" || /^[1-9]\d*$/.test(query.storeId ?? "") ? query.storeId! : "";
  if (source === "WAREHOUSE") redirect(warehouseCustomerDeliveryPath({ storeId, runId: query.runId }));
  redirect(pendingReceiptCustomerDeliveryPath({ search: query.search, poKey: query.poKey }));
}
