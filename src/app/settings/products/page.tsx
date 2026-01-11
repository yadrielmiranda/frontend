import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getProducts } from "@/app/api/products.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const [products, user] = await Promise.all([getProducts(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the products available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/products/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Product
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <ProductsClient initialProducts={products} canEdit={canEdit} />
      </div>
    </div>
  );
}
