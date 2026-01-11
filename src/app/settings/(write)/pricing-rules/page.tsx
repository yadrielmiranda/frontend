import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPricingRules } from "@/app/api/pricing-rules.api";

import { PricingRulesClient } from "./pricing-rules-client";

export default async function PricingRulesPage() {
  const pricingRules = await getPricingRules();

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Pricing Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define costs for specific product combinations.
          </p>
        </div>

        <Button asChild>
          <Link
            href="/settings/pricing-rules/new"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </Link>
        </Button>
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <PricingRulesClient initialRules={pricingRules} />
      </div>
    </div>
  );
}
