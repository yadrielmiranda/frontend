import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getFColors } from "@/app/api/framecolors.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./colums-fcolors";

export default async function ProductPage() {
  const fcolors = await getFColors();
  console.log(fcolors);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Frame Colors</h1>

        <Button variant="green" asChild>
          <Link href="/settings/framecolors/new">+ New</Link>
        </Button>
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
