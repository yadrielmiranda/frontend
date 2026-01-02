// app/settings/products/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getProducts } from "@/app/api/products.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-products";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

export default async function ProductsPage() {
  const [products, user] = await Promise.all([getProducts(), getCurrentUser()]);
  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Products</h1>

        {canEdit && (
          <Button variant="green" asChild>
            <Link href="/settings/products/new">+ New</Link>
          </Button>
        )}
      </div>

      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={products}
          filterColumnId="name"
          filterPlaceholder="Filter products..."
        />
      </div>
    </div>
  );
}
