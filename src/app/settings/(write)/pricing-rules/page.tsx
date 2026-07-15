import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPricingRules } from "@/app/api/pricing-rules.api";

import { PricingRulesClient } from "./pricing-rules-client";

export default async function PricingRulesPage() {
  const pricingRules = await getPricingRules();

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Pricing Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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

      <PricingRulesClient initialRules={pricingRules} />
    </div>
  );
}