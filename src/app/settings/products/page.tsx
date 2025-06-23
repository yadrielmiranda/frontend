import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { getProducts } from "../api/products.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
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
  const products = await getProducts();
  console.log(products);

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-4xl font-bold">Products</h1>

        <Button variant="green" asChild>
          <Link href="/products/new" >
          + New
        </Link>
        </Button>
        
       
      </div>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={products} filterColumnId="name" 
        filterPlaceholder="Filter products..."/>
      </div>
    </div>
  );
}
