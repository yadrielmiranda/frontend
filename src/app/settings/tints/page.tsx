import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTints } from "@/app/api/tints.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-tints";


export default async function TintsPage() {
  const tints = await getTints();
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Tints</h1>
        <Button variant="green" asChild>
          <Link href="/settings/tints/new">+ New</Link>
        </Button>
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={tints}
          filterColumnId="color"
          filterPlaceholder="Filter colors..."
        />
      </div>
    </div>
  );
}
