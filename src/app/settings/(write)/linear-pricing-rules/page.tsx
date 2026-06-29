import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLinearPricingRules } from "@/app/api/linear-pricing-rules.api";

import { LinearPricingRulesClient } from "./linear-pricing-rules-client";

export default async function LinearPricingRulesPage() {
  const linearPricingRules = await getLinearPricingRules();

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Linear Pricing Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define cost per inch for linear materials like mullion tubes.
          </p>
        </div>

        <Button asChild>
          <Link
            href="/settings/linear-pricing-rules/new"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <LinearPricingRulesClient initialRules={linearPricingRules} />
      </div>
    </div>
  );
}
