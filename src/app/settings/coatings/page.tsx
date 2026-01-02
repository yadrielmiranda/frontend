import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCoatings } from "@/app/api/coatings.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-coatings";

import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function CoatingsPage() {
  const [coatings, user] = await Promise.all([getCoatings(), getCurrentUser()]);
  const role = user?.role?.name ?? null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Coatings</h1>

        {isAdmin(role) && (
          <Button variant="green" asChild>
            <Link href="/settings/coatings/new">+ New</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={coatings}
          filterColumnId="name"
          filterPlaceholder="Filter coatings..."
        />
      </div>
    </div>
  );
}
