// src/app/settings/brands/[id]/products/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAvailableProductsForBrand,
  getBrandWithProducts,
} from "@/app/api/brands.api";

import { BrandProductsClient } from "./brand-products-client";
import { BackLink } from "@/components/navigation/back-link";
import { PageContainer } from "@/components/layout/page-container";
import { ContentCard } from "@/components/layout/content-card";

export default async function BrandProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  if (Number.isNaN(brandId)) notFound();

  const [brandData, allProducts] = await Promise.all([
    getBrandWithProducts(brandId),
    getAvailableProductsForBrand(brandId),
  ]);

  if (!brandData) notFound();

  return (
    <PageContainer size="default">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <BackLink href="/settings/brands" label="Back to Brands" />

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Settings</span>
            <span>/</span>

            <Link href="/settings/brands" className="hover:text-foreground">
              Brands
            </Link>

            <span>/</span>
            <span className="font-medium text-foreground">
              {brandData.name}
            </span>
          </div>
        </div>

        <ContentCard className="overflow-hidden p-0">
          <div className="border-b bg-slate-50/70 px-6 py-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {brandData.name}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage the products available for this brand.
            </p>
          </div>

          <div className="p-6">
            <BrandProductsClient brand={brandData} allProducts={allProducts} />
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
