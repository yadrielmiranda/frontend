// app/settings/framecolors/page.tsx (server component)
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getFColors } from "@/app/api/fcolors.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./colums-fcolors";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function FrameColorsPage() {
  const [fcolors, user] = await Promise.all([getFColors(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Frame Colors</h1>

        {canEdit && (
          <Button variant="green" asChild>
            <Link href="/settings/framecolors/new">+ New</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={fcolors}
          filterColumnId="color"
          filterPlaceholder="Filter colors..."
        />
      </div>
    </div>
  );
}
