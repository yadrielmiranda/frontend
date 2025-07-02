"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  addProductToBrand,
  removeProductFromBrand,
  BrandWithProducts,
  Product,
} from "@/app/api/brands.api";
import {
  getAssociatedColumns,
  getAvailableColumns,
} from "./columns-brand-products"; // Se importa desde el archivo separado
import { toast } from "sonner";

interface BrandProductsClientProps {
  brand: BrandWithProducts;
  allProducts: Product[];
}

export function BrandProductsClient({
  brand: initialBrand,
  allProducts,
}: BrandProductsClientProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAction = async (
    action: Promise<any>,
    successMsg: string,
    errorMsg: string
  ) => {
    try {
      await action;
      toast.success(successMsg);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || errorMsg);
      console.error(errorMsg, error);
    }
  };

  const handleRemoveProduct = (productId: number) => {
    handleAction(
      removeProductFromBrand(initialBrand.id, productId),
      "Product unlinked successfully.",
      "Error unlinking product."
    );
  };

  const handleAddProduct = (productId: number) => {
    handleAction(
      addProductToBrand(initialBrand.id, productId),
      "Product linked successfully.",
      "Error linking product."
    ).finally(() => {
      setIsAddDialogOpen(false);
    });
  };

  const associatedColumns = useMemo(
    () => getAssociatedColumns(handleRemoveProduct),
    [initialBrand.brandProducts]
  );
  const availableColumns = useMemo(
    () => getAvailableColumns(handleAddProduct),
    [initialBrand.brandProducts, allProducts]
  );

  const associatedProductIds = new Set(
    initialBrand.brandProducts.map((p) => p.product.id)
  );
  const availableProducts = allProducts.filter(
    (p) => !associatedProductIds.has(p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="green">+ Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Product to Brand</DialogTitle>
              <DialogDescription>
                Select a product from the list to associate it with this brand.
              </DialogDescription>
            </DialogHeader>
            <DataTable
              columns={availableColumns}
              data={availableProducts}
              filterColumnId="name"
              filterPlaceholder="Search for a product to add..."
            />
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h3 className="text-lg font-medium">Associated Products</h3>
        <div className="mt-2 rounded-md border">
          <DataTable
            columns={associatedColumns}
            data={initialBrand.brandProducts}
            filterColumnId="product_name"
            filterPlaceholder="Filter associated products..."
          />
        </div>
      </div>
    </div>
  );
}
