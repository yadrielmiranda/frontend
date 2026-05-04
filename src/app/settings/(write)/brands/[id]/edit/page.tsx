// src/app/settings/brands/[id]/edit/page.tsx
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandForm } from "../../new/brand-form";
import { getBrand } from "@/app/api/brands.api";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  // Validación simple del parámetro
  if (Number.isNaN(brandId)) notFound();

  const brand = await getBrand(brandId);

  // Si no existe, 404 limpio
  if (!brand) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Brand</CardTitle>
            <CardDescription>Update the brand name and status.</CardDescription>
          </CardHeader>

          <CardContent>
            <BrandForm brand={brand} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
