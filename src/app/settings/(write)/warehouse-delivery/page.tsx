import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { getCompanyBranding } from "@/app/api/brandings.api";
import { getWarehouseDeliverySettings } from "@/app/api/warehouse-delivery.api";
import { WarehouseDeliveryClient } from "./warehouse-delivery-client";

export default async function WarehouseDeliveryPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role?.name)) notFound();

  const [settings, company] = await Promise.all([
    getWarehouseDeliverySettings(),
    getCompanyBranding().catch(() => null),
  ]);
  const companyAddress =
    company?.street && company.city && company.state && company.postalCode
      ? {
          street: company.street,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
        }
      : null;

  return (
    <WarehouseDeliveryClient
      initialSettings={settings}
      companyAddress={companyAddress}
    />
  );
}
