// src/app/settings/(write)/roles/roles-client.tsx
"use client";

import { DataTable } from "@/components/data-table";
import type { InstallationPriceProfile, Role } from "@/lib/types";
import { getColumns } from "./columns-roles";

export function RolesClient({
  initialRoles,
  profiles,
}: {
  initialRoles: Role[];
  profiles: InstallationPriceProfile[];
}) {
  return <DataTable columns={getColumns(profiles)} data={initialRoles} />;
}
