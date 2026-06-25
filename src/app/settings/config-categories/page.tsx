import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getConfigCategories } from "@/app/api/config-categories.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { ConfigCategoriesClient } from "./config-categories-client";

export default async function ConfigCategoriesPage() {
  const [categories, user] = await Promise.all([
    getConfigCategories(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Config Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage categories used to group configurations.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/config-categories/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Category
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <ConfigCategoriesClient
          initialCategories={categories}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
