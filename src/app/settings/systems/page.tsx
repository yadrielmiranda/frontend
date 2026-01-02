import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getSystems } from "@/app/api/systems.api";
import { columns } from "./columns-systems";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function SystemsPage() {
  const [systems, user] = await Promise.all([getSystems(), getCurrentUser()]);

  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sistemas</h1>

        {canEdit && (
          <Button asChild variant="green">
            <Link href="/settings/systems/new">+ Nuevo Sistema</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={systems}
          filterColumnId="name"
          filterPlaceholder="Filtrar sistemas..."
        />
      </div>
    </div>
  );
}
