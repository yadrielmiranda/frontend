import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFactoryManufacturers, getFactoryPaymentOrders } from "@/app/api/factory-payments.api";
import { FactoryPaymentsClient } from "./factory-payments-client";

export default async function FactoryPaymentsPage() {
  const user = await getCurrentUser();
  if (user?.role?.name !== "admin") notFound();
  const [manufacturers, orders] = await Promise.all([getFactoryManufacturers(), getFactoryPaymentOrders({ page: 1, pageSize: 25 })]);
  return <FactoryPaymentsClient initialManufacturers={manufacturers} initialOrders={orders} />;
}
