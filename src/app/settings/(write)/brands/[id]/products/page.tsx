// src/app/settings/brands/[id]/products/page.tsx
import Link from "next/link";
import { getAvailableProductsForBrand, getBrandWithProducts } from "@/app/api/brands.api";
import { BrandProductsClient } from "./brand-products-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackLink } from "@/components/navigation/back-link";

export default async function BrandProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  // ✅ Cargamos data necesaria
  const brandData = await getBrandWithProducts(brandId);
  const allProducts = await getAvailableProductsForBrand(brandId);

  return (
    <div className="container mx-auto py-10">
      {/* ✅ Header de navegación (Back + breadcrumb) */}
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink href="/settings/brands" label="Back to Brands" />

        {/* ✅ Breadcrumb simple */}
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>

          <Link href="/settings/brands" className="hover:text-foreground">
            Brands
          </Link>

          <span>/</span>
          <span className="text-foreground">{brandData.name}</span>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{brandData.name}</CardTitle>
          <CardDescription>
            Manage the products available for this brand.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <BrandProductsClient brand={brandData} allProducts={allProducts} />
        </CardContent>
      </Card>
    </div>
  );
}
