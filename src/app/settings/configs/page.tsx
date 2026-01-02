import Link from "next/link";
import { getConfigs } from "@/app/api/configs.api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-configs";

import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function ConfigsPage() {
  const [configs, user] = await Promise.all([getConfigs(), getCurrentUser()]);
  const role = user?.role?.name ?? null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Configuraciones</h1>

        {isAdmin(role) && (
          <Button asChild variant="green">
            <Link href="/settings/configs/new">+ Nueva Configuración</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={configs}
          filterColumnId="conf"
          filterPlaceholder="Filtrar configuraciones..."
        />
      </div>
    </div>
  );
}
