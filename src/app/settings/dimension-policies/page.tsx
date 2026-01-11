import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getPolicies } from "@/app/api/dimension-policies.api";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

import { DimensionPoliciesClient } from "./dimension-policies-client";

export default async function DimensionPoliciesPage() {
  const [policies, user] = await Promise.all([
    getPolicies({ activeOnly: false }),
    getCurrentUser(),
  ]);

  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Dimension Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage size basis, rounding, and rule tables per system/config/crystal.
          </p>
        </div>

        {canEdit && (
          <Button asChild>
            <Link
              href="/settings/dimension-policies/new"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Policy
            </Link>
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <DimensionPoliciesClient initialPolicies={policies} canEdit={canEdit} />
      </div>
    </div>
  );
}
