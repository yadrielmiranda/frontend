import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getConfigs } from "@/app/api/configs.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { ConfigsClient } from "./configs-client";

export default async function ConfigsPage() {
  const [configs, user] = await Promise.all([getConfigs(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Configs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the configurations available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link href="/settings/configs/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Config
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <ConfigsClient initialConfigs={configs} canEdit={canEdit} />
      </div>
    </div>
  );
}
