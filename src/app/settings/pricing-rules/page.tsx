import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { getPricingRules } from "@/app/api/pricing-rules.api";
import { columns } from "./columns-pricing";


export default async function PricingRulesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const pricingRules = await getPricingRules(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Pricing Rules</h1>
        <Button variant="green" asChild>
          <Link href="/settings/pricing-rules/new">+ New Rule</Link>
        </Button>
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={pricingRules}
          filterColumnId="product" // Podemos filtrar por nombre de producto
          filterPlaceholder="Filter by product name..."
        />
      </div>
    </div>
  );
}