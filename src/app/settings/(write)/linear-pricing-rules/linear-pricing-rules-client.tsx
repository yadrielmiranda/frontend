"use client";

import { DataTable } from "@/components/data-table";
import type { LinearPricingRule } from "@/lib/types";
import { columns } from "./columns-linear-pricing";

export function LinearPricingRulesClient({
  initialRules,
}: {
  initialRules: LinearPricingRule[];
}) {
  return (
    <DataTable
      columns={columns}
      data={initialRules}
      filterColumnId="productName"
      filterPlaceholder="Filter by product name..."
    />
  );
}
