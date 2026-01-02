import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getCrystals } from "@/app/api/crystals.api";
import { PricingRuleForm } from "./pricing-rule-form";

export default async function NewPricingRulePage() {
  // Obtenemos los mismos datos que necesitas para el EstimateForm
  const [productsWithBrands, systemsWithConfigs, crystals] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getCrystals(),
  ]);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>New Pricing Rule</CardTitle>
        <CardDescription>Define the costs for a specific product combination.</CardDescription>
      </CardHeader>
      <CardContent>
        <PricingRuleForm
          productsWithBrands={productsWithBrands}
          systemsWithConfigs={systemsWithConfigs}
          crystals={crystals}
        />
      </CardContent>
    </Card>
  );
}