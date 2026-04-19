import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getMuntinTypes } from "@/app/api/muntin-types.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";
import { MuntinTypesClient } from "./muntin-types-client";



export default async function MuntinTypesPage() {
  const [types, user] = await Promise.all([getMuntinTypes(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Muntin Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the muntin types available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/muntin-types/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Muntin Type
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <MuntinTypesClient initialTypes={types} canEdit={canEdit} />
      </div>
    </div>
  );
}