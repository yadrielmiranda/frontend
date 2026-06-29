import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getLinearPricingRule } from "@/app/api/linear-pricing-rules.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { BackLink } from "@/components/navigation/back-link";
import { LinearPricingRuleForm } from "../../new/linear-pricing-rule-form";

export default async function EditLinearPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ruleId = Number(id);

  if (Number.isNaN(ruleId)) notFound();

  const [rule, productsWithBrands, systemsWithConfigs] = await Promise.all([
    getLinearPricingRule(ruleId),
    getProductsWithBrands(),
    getSystemsWithConfigs(),
  ]);

  if (!rule) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto mb-4 max-w-4xl">
        <BackLink
          href="/settings/linear-pricing-rules"
          label="Back to Linear Pricing Rules"
        />
      </div>

      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Edit Linear Pricing Rule #{rule.id}</CardTitle>
          <CardDescription>
            Update cost per inch and length limits for this linear material.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LinearPricingRuleForm
            linearPricingRule={rule}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
