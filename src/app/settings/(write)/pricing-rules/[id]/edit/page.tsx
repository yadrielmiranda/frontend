import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getPricingRule } from "@/app/api/pricing-rules.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getCrystals } from "@/app/api/crystals.api";
import { PricingRuleForm } from "../../new/pricing-rule-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ruleId = Number(id);

  if (Number.isNaN(ruleId)) notFound();

  const [rule, productsWithBrands, systemsWithConfigs, crystals] =
    await Promise.all([
      getPricingRule(ruleId),
      getProductsWithBrands(),
      getSystemsWithConfigs(),
      getCrystals(),
    ]);

  if (!rule) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink href="/settings/pricing-rules" label="Back to Pricing Rules" />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Pricing Rule #{rule.id}</CardTitle>
          <CardDescription>
            Update the costs for this product combination.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingRuleForm
            pricingRule={rule}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
            crystals={crystals}
          />
        </CardContent>
      </Card>
    </div>
  );
}
