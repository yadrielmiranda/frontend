// src/app/settings/brands/[id]/edit/page.tsx
import { notFound } from "next/navigation";

import { BrandForm } from "../../new/brand-form";
import { getBrand } from "@/app/api/brands.api";
import { FormPageShell } from "@/components/layout/form-page-shell";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  if (Number.isNaN(brandId)) notFound();

  const brand = await getBrand(brandId);

  if (!brand) notFound();

  return (
    <FormPageShell
      backHref="/settings/brands"
      backLabel="Back to Brands"
      title="Edit Brand"
      description="Update the brand name, High Bottom percentage, and status."
      maxWidth="max-w-xl"
    >
      <BrandForm brand={brand} />
    </FormPageShell>
  );
}
