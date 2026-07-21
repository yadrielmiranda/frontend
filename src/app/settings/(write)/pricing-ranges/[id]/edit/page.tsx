import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getPricingRange } from "@/app/api/pricing-ranges.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { BackLink } from "@/components/navigation/back-link";

import { PricingRangeForm } from "../../new/pricing-range-form";

export default async function EditPricingRangePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rangeId = Number(id);

  if (!Number.isInteger(rangeId) || rangeId < 1) notFound();

  const [pricingRange, productsWithBrands, systemsWithConfigs] =
    await Promise.all([
      getPricingRange(rangeId),
      getProductsWithBrands(),
      getSystemsWithConfigs(),
    ]);

  if (!pricingRange) notFound();

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
          <CardTitle>Edit Pricing Range #{pricingRange.id}</CardTitle>
          <CardDescription>
            Update the dimensions and crystal coefficients for this range.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PricingRangeForm
            pricingRange={pricingRange}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
