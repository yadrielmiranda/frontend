"use client";

import { useMemo } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { isAdminRole } from "@/lib/rbac";

import { getEstimateColumns, getEstimateStatusName } from "./estimates-columns";

function createOptions(
  values: Array<string | null | undefined>,
): DataTableFilterOption[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface EstimatesClientProps {
  initialEstimates: EstimateWithRelations[];
  currentUser: AuthUser | null;
}

export function EstimatesClient({
  initialEstimates,
  currentUser,
}: EstimatesClientProps) {
  const role = currentUser?.role?.name ?? null;
  const isAdmin = isAdminRole(role);

  const columns = useMemo(() => getEstimateColumns(currentUser), [currentUser]);

  const filters = useMemo<DataTableFilter[]>(() => {
    const result: DataTableFilter[] = [
      {
        columnId: "number",
        type: "text",
        placeholder: "Filter number...",
      },
      {
        columnId: "name",
        type: "text",
        placeholder: "Filter name...",
      },
      {
        columnId: "date",
        type: "date-range",
        placeholder: "Estimate date",
      },
    ];

    if (isAdmin) {
      result.push(
        {
          columnId: "createdBy",
          type: "select",
          allLabel: "All users",
          options: createOptions(
            initialEstimates.map((estimate) => estimate.user?.username),
          ),
        },
        {
          columnId: "createdByRole",
          type: "select",
          allLabel: "All roles",
          options: createOptions(
            initialEstimates.map((estimate) => estimate.user?.role?.name),
          ).map((option) => ({
            ...option,
            label: capitalize(option.label),
          })),
        },
      );
    }

    result.push({
      columnId: "status",
      type: "select",
      allLabel: "All statuses",
      options: createOptions(
        initialEstimates.map((estimate) => getEstimateStatusName(estimate)),
      ),
    });

    return result;
  }, [initialEstimates, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={initialEstimates}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
    />
  );
}
