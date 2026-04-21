import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { getSillOptions } from "@/app/api/sill-options.api";
import { SillOptionsClient } from "./sill-options-client";

export default async function SillOptionsPage() {
  const [sillOptions, user] = await Promise.all([
    getSillOptions(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Sill Options</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage sill options available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/sill-options/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <SillOptionsClient initialSillOptions={sillOptions} canEdit={canEdit} />
      </div>
    </div>
  );
}