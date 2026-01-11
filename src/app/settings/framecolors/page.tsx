import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getFColors } from "@/app/api/fcolors.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { FrameColorsClient } from "./framecolors-client";

export default async function FrameColorsPage() {
  const [fcolors, user] = await Promise.all([getFColors(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Frame Colors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage frame color options available in the system.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/framecolors/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Color
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <FrameColorsClient initialFColors={fcolors} canEdit={canEdit} />
      </div>
    </div>
  );
}
