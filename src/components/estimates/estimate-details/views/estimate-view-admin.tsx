"use client";

import { EstimateWithRelations } from "@/lib/types";
import { isDealerRole, type RoleName } from "@/lib/rbac";

import { EstimateViewClient } from "./estimate-view-client";
import { EstimateViewDealerInternal } from "./estimate-view-dealer-internal";
import { AdminSummary } from "../parts/admin-summary";

function getOwnerRole(estimate: EstimateWithRelations): RoleName | null {
  const role = estimate.user?.role?.name ?? null;
  return typeof role === "string" ? (role.toLowerCase() as RoleName) : null;
}

export function EstimateViewAdmin({ estimate }: { estimate: EstimateWithRelations }) {
  const ownerRole = getOwnerRole(estimate);

  return (
    <>
      {isDealerRole(ownerRole) ? (
        <EstimateViewDealerInternal estimate={estimate} />
      ) : (
        <EstimateViewClient estimate={estimate} />
      )}

      <AdminSummary estimate={estimate} />
    </>
  );
}
