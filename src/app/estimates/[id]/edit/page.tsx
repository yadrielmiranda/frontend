// src/app/estimates/[id]/edit/page.tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstimateForm } from "../../new/estimate-form"; 

// API functions
import { getEstimate } from "@/app/api/estimates.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getGlobalParameters } from "@/app/api/global-parameters.api";


export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  
  const { id } = await params; 
  const estimateId = Number(id);

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const [
    estimate,
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
    parameters,
  ] = await Promise.all([
    getEstimate(estimateId, token),
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getFColors(),
    getCrystals(),
    getTints(),
    getCoatings(),
    getGlobalParameters(token),
  ]);

  if (!estimate) {
    notFound();
  }

  const salesTaxParam = parameters.find(p => p.key === 'SALES_TAX');
  const taxRate = salesTaxParam ? salesTaxParam.value : 0;

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-6xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Estimate #{estimate.number}</CardTitle>
          <CardDescription>
            Update the details for this estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EstimateForm
            estimate={estimate}
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
