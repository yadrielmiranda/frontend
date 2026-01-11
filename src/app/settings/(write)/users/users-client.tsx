// src/app/settings/(write)/users/users-client.tsx
"use client";

import { DataTable } from "@/components/data-table";
import type { User } from "@/lib/types";
import { columns } from "./columns-users";

export function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  return (
    <DataTable
      columns={columns}
      data={initialUsers}
      filterColumnId="username"
      filterPlaceholder="Filter by username..."
    />
  );
}
