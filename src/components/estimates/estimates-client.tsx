"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
  ownerId?: number;
}

export function EstimatesClient({
  initialEstimates,
  currentUser,
  ownerId,
}: EstimatesClientProps) {
  const role = currentUser?.role?.name ?? null;
  const isAdmin = isAdminRole(role);
  const [scope, setScope] = useState<'all' | 'mine' | 'network'>('all');
  const [selectedOwner, setSelectedOwner] = useState(ownerId);
  const hasNetwork = role === 'dealer' && initialEstimates.some(estimate => estimate.idUser !== currentUser?.id);
  const visibleEstimates = initialEstimates.filter(estimate => (!selectedOwner || estimate.idUser === selectedOwner) &&
    (scope === 'all' || (scope === 'mine' ? estimate.idUser === currentUser?.id : estimate.idUser !== currentUser?.id)));

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

    if (isAdmin || role === "operator" || hasNetwork) {
      result.push(
        {
          columnId: "createdBy",
          type: "select",
          faceted: true,
          allLabel: "All users",
          options: createOptions(
            initialEstimates.map((estimate) => estimate.user?.username),
          ),
        },
        {
          columnId: "createdByRole",
          type: "select",
          faceted: true,
          allLabel: "All roles",
          options: createOptions(
            initialEstimates.map((estimate) => (estimate.dealerNetwork?.level ?? estimate.user?.role?.name)?.toLowerCase()),
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
      faceted: true,
      allLabel: "All statuses",
      options: createOptions(
        initialEstimates.map((estimate) => getEstimateStatusName(estimate)),
      ),
    });

    return result;
  }, [initialEstimates, isAdmin, role, hasNetwork]);

  return (
    <>
    {(hasNetwork || selectedOwner) && <div className="mb-4 flex flex-wrap items-center gap-2">
      {hasNetwork && (['all', 'mine', 'network'] as const).map(value => <Button key={value} size="sm" variant={scope === value ? 'default' : 'outline'} onClick={() => { setScope(value); setSelectedOwner(undefined); }}>{value === 'all' ? 'All estimates' : value === 'mine' ? 'My estimates' : 'My network'}</Button>)}
      {selectedOwner && <Button size="sm" variant="outline" onClick={() => setSelectedOwner(undefined)}>Clear account filter</Button>}
    </div>}
    <DataTable
      columns={columns}
      data={visibleEstimates}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="estimates"
      pagination
      scrollMode="page"
    />
    </>
  );
}
