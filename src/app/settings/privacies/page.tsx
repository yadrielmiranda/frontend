import Link from "next/link";
import { Plus } from "lucide-react";

import { getPrivacies } from "@/app/api/privacies.api";
import { Button } from "@/components/ui/button";
import { canEditSettings } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

import { PrivaciesClient } from "./privacies-client";

export default async function PrivaciesPage() {
  const [privacies, user] = await Promise.all([
    getPrivacies(),
    getCurrentUser(),
  ]);
  const canEdit = canEditSettings(user?.role?.name ?? null);

  return (
    <div className="container mx-auto max-w-6xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Privacy Options</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the Privacy options available for Brand association.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/privacies/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Privacy Option
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <PrivaciesClient initialPrivacies={privacies} canEdit={canEdit} />
      </div>
    </div>
  );
}
