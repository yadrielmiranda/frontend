import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { getBrands } from "@/queries/brands.api";
import { DataTableBrands } from "./data-table-brands";
import { columns } from "./columns-brands";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";




export default async function ProductPage() {
  const brands = await getBrands();
  console.log(brands);

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-4xl font-bold">Brands</h1>

        <Button variant="green" asChild>
          <Link href="/brands/new" >
          + New
        </Link>
        </Button>
        
       
      </div>
      <div className="container mx-auto py-10">
        <DataTableBrands columns={columns} data={brands} />
      </div>
    </div>
  );
}