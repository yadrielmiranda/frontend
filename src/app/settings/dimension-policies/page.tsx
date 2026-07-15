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
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Dimension Policies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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

      <DimensionPoliciesClient
        initialPolicies={policies}
        canEdit={canEdit}
      />
    </div>
  );
}