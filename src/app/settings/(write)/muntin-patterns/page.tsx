import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getMuntinPatterns } from "@/app/api/muntin-patterns.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";
import { MuntinPatternsClient } from "./muntin-patterns-client";



export default async function MuntinPatternsPage() {
  const [patterns, user] = await Promise.all([
    getMuntinPatterns(),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Muntin Patterns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the muntin patterns available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/muntin-patterns/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Muntin Pattern
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <MuntinPatternsClient initialPatterns={patterns} canEdit={canEdit} />
      </div>
    </div>
  );
}