import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { getPreparationOptions } from "@/app/api/preparation-options.api";
import { PreparationOptionsClient } from "./preparation-options-client";

export default async function PreparationOptionsPage() {
  const [preparationOptions, user] = await Promise.all([
    getPreparationOptions(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Preparation Options</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage preparation options available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/preparation-options/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <PreparationOptionsClient
          initialPreparationOptions={preparationOptions}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}