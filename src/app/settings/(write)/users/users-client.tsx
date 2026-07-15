"use client";

import { useMemo } from "react";

import { DataTable, type DataTableFilter } from "@/components/data-table";
import type { User } from "@/lib/types";

import { columns } from "./columns-users";

export function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const filters = useMemo<DataTableFilter[]>(() => {
    const roles = Array.from(
      new Set(initialUsers.map((user) => user.role.name)),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((role) => ({
        label: role.charAt(0).toUpperCase() + role.slice(1),
        value: role,
      }));

    return [
      {
        columnId: "username",
        type: "text",
        placeholder: "Filter username...",
      },
      {
        columnId: "firstName",
        type: "text",
        placeholder: "Filter first name...",
      },
      {
        columnId: "lastName",
        type: "text",
        placeholder: "Filter last name...",
      },
      {
        columnId: "email",
        type: "text",
        placeholder: "Filter email...",
      },
      {
        columnId: "roleName",
        type: "select",
        allLabel: "All roles",
        options: roles,
      },
      {
        columnId: "status",
        type: "select",
        allLabel: "All statuses",
        options: [
          {
            label: "Active",
            value: "Active",
          },
          {
            label: "Inactive",
            value: "Inactive",
          },
          {
            label: "Deleted",
            value: "Deleted",
          },
        ],
      },
    ];
  }, [initialUsers]);

  return (
    <DataTable
      columns={columns}
      data={initialUsers}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
    />
  );
}
