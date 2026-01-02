import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCrystals } from "@/app/api/crystals.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-crystals";

import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function CrystalsPage() {
  const [crystals, user] = await Promise.all([getCrystals(), getCurrentUser()]);
  const role = user?.role?.name ?? null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Crystals</h1>

        {isAdmin(role) && (
          <Button variant="green" asChild>
            <Link href="/settings/crystals/new">+ New</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={crystals}
          filterColumnId="glass"
          filterPlaceholder="Filter glasses..."
        />
      </div>
    </div>
  );
}
