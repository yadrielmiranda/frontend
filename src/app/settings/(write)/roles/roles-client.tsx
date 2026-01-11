// src/app/settings/(write)/roles/roles-client.tsx
"use client";

import { DataTable } from "@/components/data-table";
import type { Role } from "@/lib/types";
import { columns } from "./columns-roles";

export function RolesClient({ initialRoles }: { initialRoles: Role[] }) {
  return <DataTable columns={columns} data={initialRoles} />;
}
