import { redirect } from "next/navigation";
import { requireWarehouseUser } from "../warehouse-access";
import { warehouseCustomerDeliveryPath } from "./customer-delivery-navigation";

export default async function CustomerDeliveriesPage({ searchParams }: {
  searchParams: Promise<{ runId?: string; storeId?: string }>;
}) {
  await requireWarehouseUser();
  redirect(warehouseCustomerDeliveryPath(await searchParams));
}
