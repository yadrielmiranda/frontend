import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isApiError } from "@/app/api/_base";
import { getMaterialRevisions } from "@/app/api/material-revisions.api";
import { MaterialRevisionClient } from "@/components/estimates/material-revisions/material-revision-client";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getPrivacies } from "@/app/api/privacies.api";
import { getMuntinPatterns } from "@/app/api/muntin-patterns.api";
import { getMuntinTypes } from "@/app/api/muntin-types.api";

export default async function MaterialRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentUser()) notFound();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  let initialData;
  try { initialData = await getMaterialRevisions(id); }
  catch (error) { if (isApiError(error) && [403, 404].includes(error.status)) notFound(); throw error; }
  const [productsWithBrands, systemsWithConfigs, frameColors, crystals, tints, coatings, privacies, muntinPatterns, muntinTypes] = await Promise.all([
    getProductsWithBrands(), getSystemsWithConfigs(), getFColors(), getCrystals(), getTints(), getCoatings(), getPrivacies(), getMuntinPatterns({ active: true }), getMuntinTypes({ active: true }),
  ]);
  return <MaterialRevisionClient initialData={initialData} productsWithBrands={productsWithBrands} systemsWithConfigs={systemsWithConfigs} frameColors={frameColors} crystals={crystals} tints={tints} coatings={coatings} privacies={privacies} muntinPatterns={muntinPatterns} muntinTypes={muntinTypes} />;
}
