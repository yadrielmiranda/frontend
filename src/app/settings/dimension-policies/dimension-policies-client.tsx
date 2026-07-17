"use client";

import { useMemo } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { PolicyListItem } from "@/app/api/dimension-policies.api";

import { getPolicyColumns } from "./columns-policies";

function createOptions(values: string[]): DataTableFilterOption[] {
  return Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
}

export function DimensionPoliciesClient({
  initialPolicies,
  canEdit,
}: {
  initialPolicies: PolicyListItem[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getPolicyColumns({ canEdit }), [canEdit]);

  const filters = useMemo<DataTableFilter[]>(() => {
    return [
      {
        columnId: "id",
        type: "text",
        placeholder: "Filter policy #...",
      },
      {
        columnId: "systemName",
        type: "text",
        placeholder: "Filter system...",
      },
      {
        columnId: "configName",
        type: "select",
        faceted: true,
        allLabel: "All configs",
        options: createOptions(
          initialPolicies.map(
            (policy) => policy.configName ?? String(policy.idConfig),
          ),
        ),
      },
      {
        columnId: "crystalName",
        type: "select",
        faceted: true,
        allLabel: "All crystals",
        options: createOptions(
          initialPolicies.map(
            (policy) => policy.crystalName ?? String(policy.idCrystal),
          ),
        ),
      },
      {
        columnId: "reinforcementName",
        type: "select",
        faceted: true,
        allLabel: "All reinforcements",
        options: createOptions(
          initialPolicies.map((policy) => policy.reinforcementName ?? "N/A"),
        ),
      },
      {
        columnId: "sizeBasis",
        type: "select",
        faceted: true,
        allLabel: "All bases",
        options: createOptions(
          initialPolicies.map((policy) => String(policy.sizeBasis)),
        ),
      },
      {
        columnId: "roundingRule",
        type: "select",
        faceted: true,
        allLabel: "All rounding rules",
        options: createOptions(
          initialPolicies.map((policy) => String(policy.roundingRule)),
        ),
      },
      {
        columnId: "isActive",
        type: "select",
        faceted: true,
        allLabel: "All statuses",
        options: [
          {
            label: "Active",
            value: true,
          },
          {
            label: "Inactive",
            value: false,
          },
        ],
      },
    ];
  }, [initialPolicies]);

  return (
    <DataTable
      columns={columns}
      data={initialPolicies}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="dimension-policies"
    />
  );
}
