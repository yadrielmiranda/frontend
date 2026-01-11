// src/app/settings/systems/page.tsx
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
  const canEdit = canEditSettings(role); // 

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Systems</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the systems available in the platform.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link href="/settings/systems/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New System
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <SystemsClient initialSystems={systems} canEdit={canEdit} />
      </div>
    </div>
  );
}
