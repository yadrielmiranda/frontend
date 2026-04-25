import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// API functions
import { getEstimate } from "@/app/api/estimates.api";
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
import { isApiError } from "@/app/api/_base";
import { getCurrentUser } from "@/lib/session";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id } = await params;
  const estimateId = Number(id);

  if (Number.isNaN(estimateId)) notFound();

  let estimate;

  try {
    estimate = await getEstimate(estimateId);
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 403)) {
      notFound();
    }
    throw e;
  }

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

  if (!estimate) notFound();

  const isActive = estimate.status?.name === "Active";
  const canEdit = isActive && !estimate.order;
  if (!canEdit) notFound();

  const salesTaxParam = parameters.find((p) => p.key === "SALES_TAX");
  const taxRate = salesTaxParam ? salesTaxParam.value : 0;

  return (
  <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-6">
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/estimates" label="Back to Estimate" />
      </div>

      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            Edit Estimate #{estimate.number}
          </CardTitle>
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
            muntinPatterns={muntinPatterns}
            muntinTypes={muntinTypes}
          />
        </CardContent>
      </Card>
    </div>
  </div>
);
}