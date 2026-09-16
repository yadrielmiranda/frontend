"use client";
import type { PaymentPlan } from "@/lib/payment-plan";
// src/app/settings/(write)/roles/roles-client.tsx


import { DataTable } from "@/components/data-table";
import type { InstallationPriceProfile, Role } from "@/lib/types";
import { getColumns } from "./columns-roles";

export function RolesClient({
  initialRoles,
  profiles,
  paymentPlans,
}: {
  initialRoles: Role[];
  profiles: InstallationPriceProfile[];
  paymentPlans: PaymentPlan[];
}) {
  return <DataTable columns={getColumns(profiles, paymentPlans)} data={initialRoles} />;
}
