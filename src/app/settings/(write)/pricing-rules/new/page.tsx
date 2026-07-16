import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { PricingRuleForm } from "./pricing-rule-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function NewPricingRulePage() {
  const [productsWithBrands, systemsWithConfigs] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
  ]);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink
          href="/settings/pricing-rules"
          label="Back to Pricing Rules"
        />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>New Pricing Rule</CardTitle>
          <CardDescription>
            Define the costs for a specific product combination.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PricingRuleForm
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
