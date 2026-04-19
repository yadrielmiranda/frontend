import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// API Calls
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getGlobalParameters } from "@/app/api/global-parameters.api";
import { getMuntinPatterns } from "@/app/api/muntin-patterns.api";
import { getMuntinTypes } from "@/app/api/muntin-types.api";
import { EstimateForm } from "@/components/estimates/estimate-form";
import { getCurrentUser } from "@/lib/session";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/navigation/back-link";

export default async function NewEstimatePage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const [
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
    parameters,
    muntinPatterns,
    muntinTypes,
  ] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getFColors(),
    getCrystals(),
    getTints(),
    getCoatings(),
    getGlobalParameters(),
    getMuntinPatterns({ active: true }),
    getMuntinTypes({ active: true }),
  ]);

  const salesTaxParam = parameters.find((p) => p.key === "SALES_TAX");
  const taxRate = salesTaxParam ? salesTaxParam.value : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <BackLink href="/estimates" label="Back to Estimates" />
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">New Estimate</CardTitle>
            <CardDescription>
              Fill in the details below to create a new estimate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <EstimateForm
              taxRate={taxRate}
              productsWithBrands={productsWithBrands}
              systemsWithConfigs={systemsWithConfigs}
              frameColors={frameColors}
              crystals={crystals}
              tints={tints}
              coatings={coatings}
              muntinPatterns={muntinPatterns}
              muntinTypes={muntinTypes}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}