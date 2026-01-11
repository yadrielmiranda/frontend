"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, PackageOpen } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  addProductToBrand,
  BrandWithProducts,
  removeProductFromBrand,
} from "@/app/api/brands.api";

import { Product } from "@/lib/types";
import {
  getAssociatedColumns,
  getAvailableColumns,
} from "./columns-brand-products";

export function BrandProductsClient({
  brand: initialBrand,
  allProducts,
}: {
  brand: BrandWithProducts;
  allProducts: Product[];
}) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Ejecuta acción async + toast + refresh
  const runAction = async (
    action: () => Promise<unknown>,
    successMsg: string,
    errorMsg: string
  ) => {
    try {
      await action();
      toast.success(successMsg);
      router.refresh();
      return true;
    } catch (error) {
      toast.error((error as Error).message || errorMsg);
      console.error(errorMsg, error);
      return false;
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    await runAction(
      () => removeProductFromBrand(initialBrand.id, productId),
      "Product unlinked successfully.",
      "Error unlinking product."
    );
  };

  const handleAddProduct = async (productId: number) => {
    const ok = await runAction(
      () => addProductToBrand(initialBrand.id, productId),
      "Product linked successfully.",
      "Error linking product."
    );

    if (ok) setIsAddDialogOpen(false);
  };

  const availableProducts = useMemo(() => {
    const associatedIds = new Set(
      initialBrand.brandProducts.map((p) => p.product.id)
    );
    return allProducts.filter((p) => !associatedIds.has(p.id));
  }, [allProducts, initialBrand.brandProducts]);

 const associatedColumns = useMemo(
  () => getAssociatedColumns(handleRemoveProduct),
  [handleRemoveProduct]
);

const availableColumns = useMemo(
  () => getAvailableColumns(handleAddProduct),
  [handleAddProduct]
);


  const hasAssociated = initialBrand.brandProducts.length > 0;
  const hasAvailable = availableProducts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!hasAvailable}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {!hasAvailable && (
                <TooltipContent>
                  No available products to add.
                </TooltipContent>
              )}
            </Tooltip>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Add Product to{" "}
                  <span className="font-semibold">{initialBrand.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Select a product to associate it with this brand.
                </DialogDescription>
              </DialogHeader>

              {hasAvailable ? (
                <DataTable
                  columns={availableColumns}
                  data={availableProducts}
                  filterColumnId="name"
                  filterPlaceholder="Search products..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No products available
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All products are already linked to this brand.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      {/* Associated list */}
      <div>
        <h3 className="text-lg font-medium">Associated Products</h3>

        {!hasAssociated ? (
          <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No associated products</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add products to make them available under this brand.
            </p>
          </div>
        ) : (
          <div className="mt-2 rounded-md border">
            <DataTable
              columns={associatedColumns}
              data={initialBrand.brandProducts}
              filterColumnId="product_name"
              filterPlaceholder="Filter associated products..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
