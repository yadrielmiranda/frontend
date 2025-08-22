// src/app/estimates/new/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstimateForm } from "./estimate-form";
import { cookies } from "next/headers";

// API Calls
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getGlobalParameters } from "@/app/api/global-parameters.api";

export default async function NewEstimatePage() {
  // CORRECCIÓN: Añadido 'await' a la llamada de cookies()
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const [
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
    parameters,
  ] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getFColors(),
    getCrystals(),
    getTints(),
    getCoatings(),
    getGlobalParameters(token),
  ]);

  const salesTaxParam = parameters.find(p => p.key === 'SALES_TAX');
  const taxRate = salesTaxParam ? salesTaxParam.value : 0;

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-6xl shadow-lg">
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
