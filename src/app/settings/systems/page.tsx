import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSystems } from "@/app/api/systems.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { SystemsClient } from "./systems-client";

export default async function SystemsPage() {
  const [systems, user] = await Promise.all([getSystems(), getCurrentUser()]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the systems available in the platform.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/systems/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New System
            </Link>
          </Button>
        )}
      </div>

      <SystemsClient initialSystems={systems} canEdit={canEdit} />
    </div>
  );
}
