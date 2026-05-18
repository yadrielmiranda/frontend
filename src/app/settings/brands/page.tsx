// src/app/settings/brands/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ContentCard } from "@/components/layout/content-card";

import { getBrands } from "@/app/api/brands.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { BrandsClient } from "./brands-client";

export default async function BrandsPage() {
  const [brands, user] = await Promise.all([getBrands(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <PageContainer>
      <PageHeader
        title="Brands"
        description="Manage the brands available in the system."
        action={
          canEdit ? (
            <Button
              asChild
              className="bg-slate-950 text-white hover:bg-slate-900"
            >
              <Link
                href="/settings/brands/new"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Brand
              </Link>
            </Button>
          ) : null
        }
      />

      <ContentCard>
        <BrandsClient initialBrands={brands} canEdit={canEdit} />
      </ContentCard>
    </PageContainer>
  );
}
