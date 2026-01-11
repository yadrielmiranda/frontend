"use client";

import { DataTable } from "@/components/data-table";
import type { PricingRule } from "@/lib/types";
import { columns } from "./columns-pricing";

export function PricingRulesClient({
  initialRules,
}: {
  initialRules: PricingRule[];
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
