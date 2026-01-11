// src/app/settings/brands/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getBrands } from "@/app/api/brands.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { BrandsClient } from "./brands-client";

export default async function BrandsPage() {
  const [brands, user] = await Promise.all([getBrands(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Brands</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the brands available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link href="/settings/brands/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Brand
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <BrandsClient initialBrands={brands} canEdit={canEdit} />
      </div>
    </div>
  );
}
