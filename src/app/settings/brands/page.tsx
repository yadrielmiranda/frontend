import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getBrands } from "@/app/api/brands.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-brands";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

export default async function BrandsPage() {
  const [brands, user] = await Promise.all([getBrands(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Brands</h1>

        {canEdit && (
          <Button variant="green" asChild>
            <Link href="/settings/brands/new">+ New</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={brands}
          filterColumnId="name"
          filterPlaceholder="Filter brands..."
        />
      </div>
    </div>
  );
}
