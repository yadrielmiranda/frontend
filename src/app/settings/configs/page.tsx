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
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Configs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the configurations available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/configs/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Config
            </Link>
          </Button>
        )}
      </div>

      <ConfigsClient initialConfigs={configs} canEdit={canEdit} />
    </div>
  );
}
