// src/app/settings/dimension-policies/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPolicies } from "@/app/api/dimension-policies.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-policies";

export default async function DimensionPoliciesPage() {
  const policies = await getPolicies({ activeOnly: false });

  return (
    <div className="max-w-6xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Dimension Policies</h1>
        <Button variant="green" asChild>
          <Link href="/settings/dimension-policies/new">+ New</Link>
        </Button>
      </div>

      <div className="py-4">
        <DataTable
          columns={columns}
          data={policies}
          filterColumnId="systemName"
          filterPlaceholder="Filter by system..."
        />
      </div>
    </div>
  );
}
