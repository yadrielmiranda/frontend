import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { getActiveOptions } from "@/app/api/active-options.api";
import { ActiveOptionsClient } from "./active-options-client";


export default async function ActiveOptionsPage() {
  const [activeOptions, user] = await Promise.all([
    getActiveOptions(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Active Options</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage active options available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/active-options/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <ActiveOptionsClient
          initialActiveOptions={activeOptions}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}