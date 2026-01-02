import { cookies } from "next/headers";
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

export default async function EditPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ruleId = Number(id);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const [rule, productsWithBrands, systemsWithConfigs, crystals] =
    await Promise.all([
      getPricingRule(ruleId, token),
      getProductsWithBrands(),
      getSystemsWithConfigs(),
      getCrystals(),
    ]);

  if (!rule) {
    notFound();
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Pricing Rule #{rule.id}</CardTitle>
        <CardDescription>
          Update the costs for this product combination.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PricingRuleForm
          pricingRule={rule} // Pasamos la regla para el modo edición
          productsWithBrands={productsWithBrands}
          systemsWithConfigs={systemsWithConfigs}
          crystals={crystals}
        />
      </CardContent>
    </Card>
  );
}
