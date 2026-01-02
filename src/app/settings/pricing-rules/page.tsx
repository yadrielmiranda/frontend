import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getPricingRules } from "@/app/api/pricing-rules.api";
import { columns } from "./columns-pricing";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function PricingRulesPage() {
  const [pricingRules, user] = await Promise.all([
    getPricingRules(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Pricing Rules</h1>

        {canEdit && (
          <Button variant="green" asChild>
            <Link href="/settings/pricing-rules/new">+ New Rule</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={pricingRules}
          filterColumnId="productName"
          filterPlaceholder="Filter by product name..."
        />
      </div>
    </div>
  );
}
