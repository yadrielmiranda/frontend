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
import { LinearPricingRuleForm } from "./linear-pricing-rule-form";
export default async function NewLinearPricingRulePage() {
  const [productsWithBrands, systemsWithConfigs] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
  ]);

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
          <CardTitle>New Linear Pricing Rule</CardTitle>
          <CardDescription>
            Define cost per inch and length limits for a linear material.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LinearPricingRuleForm
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
