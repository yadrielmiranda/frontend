import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { BackLink } from "@/components/navigation/back-link";

import { PricingRangeForm } from "./pricing-range-form";

export default async function NewPricingRangePage() {
  const [productsWithBrands, systemsWithConfigs] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
  ]);

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto mb-4 max-w-6xl">
        <BackLink
          href="/settings/pricing-ranges"
          label="Back to Pricing Ranges"
        />
      </div>

      <Card className="mx-auto max-w-6xl">
        <CardHeader>
          <CardTitle>New Pricing Range</CardTitle>
          <CardDescription>
            Define the dimensions and crystal coefficients for this range.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PricingRangeForm
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
