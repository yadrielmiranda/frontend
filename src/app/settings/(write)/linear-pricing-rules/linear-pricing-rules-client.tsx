"use client";

import { useMemo } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { LinearPricingRule } from "@/lib/types";

import { columns } from "./columns-linear-pricing";

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

export function LinearPricingRulesClient({
  initialRules,
}: {
  initialRules: LinearPricingRule[];
}) {
  const filters = useMemo<DataTableFilter[]>(() => {
    return [
      {
        columnId: "productName",
        type: "select",
        allLabel: "All products",
        options: createOptions(initialRules.map((rule) => rule.product?.name)),
      },
      {
        columnId: "brandName",
        type: "select",
        allLabel: "All brands",
        options: createOptions(initialRules.map((rule) => rule.brand?.name)),
      },
      {
        columnId: "systemName",
        type: "text",
        placeholder: "Filter system...",
      },
      {
        columnId: "configConf",
        type: "select",
        allLabel: "All configs",
        options: createOptions(initialRules.map((rule) => rule.config?.conf)),
      },
    ];
  }, [initialRules]);

  return (
    <DataTable
      columns={columns}
      data={initialRules}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
    />
  );
}
