import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { getFColors } from "@/app/api/framecolors.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./colums-fcolors";
import { ArrowLeftIcon } from "lucide-react";

export default async function ProductPage() {
  const fcolors = await getFColors();
  console.log(fcolors);

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-4xl font-bold">Frame Colors</h1>

        <Button variant="outline" asChild>
          <Link href="/otra">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> {/* El ícono va aquí */}
            {/* Si no quieres texto, simplemente omite "Back" */}
            Back
            {/* Puedes mantener el texto para accesibilidad o eliminarlo */}
          </Link>
        </Button>
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
