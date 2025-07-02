import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getBrands } from "@/app/api/brands.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-brands";

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Brands</h1>
        <Button variant="green" asChild>
          <Link href="/settings/brands/new">+ New</Link>
        </Button>
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
