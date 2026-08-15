import Link from "next/link";
import { notFound } from "next/navigation";

import { getBrandPrivaciesForManage } from "@/app/api/brands.api";
import { ContentCard } from "@/components/layout/content-card";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/navigation/back-link";

import { BrandOptionAssociationsClient } from "../brand-option-associations-client";

export default async function BrandPrivaciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  if (!Number.isInteger(brandId) || brandId <= 0) notFound();

  const data = await getBrandPrivaciesForManage(brandId);

  return (
    <PageContainer size="default">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <BackLink href="/settings/brands" label="Back to Brands" />
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/settings/brands" className="hover:text-foreground">
              Brands
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">
              {data.brand.name}
            </span>
          </div>
        </div>

        <ContentCard className="overflow-hidden p-0">
          <div className="border-b bg-slate-50/70 px-6 py-5">
            <h1 className="text-2xl font-bold tracking-tight">
              {data.brand.name} Privacy Options
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure availability, the default Privacy option and its Area
              Cost, Perimeter Cost and Fixed Cost surcharge.
            </p>
          </div>
          <div className="p-6">
            <BrandOptionAssociationsClient
              kind="privacy"
              initialData={data}
            />
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
