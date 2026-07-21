import Link from "next/link";
import { Plus } from "lucide-react";

import { getPricingRanges } from "@/app/api/pricing-ranges.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { Button } from "@/components/ui/button";

import { PricingRangesClient } from "./pricing-ranges-client";

export default async function PricingRangesPage() {
  const [initialRanges, productsWithBrands, systemsWithConfigs] =
    await Promise.all([
      getPricingRanges(),
      getProductsWithBrands(),
      getSystemsWithConfigs(),
    ]);

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Pricing Ranges</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define dimension ranges and crystal pricing coefficients.
          </p>
        </div>

        <Button asChild>
          <Link
            href="/settings/pricing-ranges/new"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Range
          </Link>
        </Button>
      </div>

      <PricingRangesClient
        initialRanges={initialRanges}
        productsWithBrands={productsWithBrands}
        systemsWithConfigs={systemsWithConfigs}
      />
    </div>
  );
}
