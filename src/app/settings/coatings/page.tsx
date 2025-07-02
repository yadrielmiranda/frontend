import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCoatings } from "@/app/api/coatings.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-coatings";

export default async function CoatingsPage() {
  const coatings = await getCoatings();
  console.log(coatings);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Coatings</h1>

        <Button variant="green" asChild>
          <Link href="/settings/coatings/new">+ New</Link>
        </Button>
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
