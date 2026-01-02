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
  BrandWithProducts
} from "@/app/api/brands.api";
import { getAssociatedColumns, getAvailableColumns } from "./columns-brand-products";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canEditSettings } from "@/lib/rbac";
import { Product } from "@/app/api/types";

export function BrandProductsClient({
  brand: initialBrand,
  allProducts,
}: {
  brand: BrandWithProducts;
  allProducts: Product[];
}) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { user } = useAuth();
  const role = user?.role?.name ?? null;
  const canEdit = canEditSettings(role);

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
    if (!canEdit) return;
    handleAction(
      removeProductFromBrand(initialBrand.id, productId),
      "Product unlinked successfully.",
      "Error unlinking product."
    );
  };

  const handleAddProduct = (productId: number) => {
    if (!canEdit) return;
    handleAction(
      addProductToBrand(initialBrand.id, productId),
      "Product linked successfully.",
      "Error linking product."
    ).finally(() => setIsAddDialogOpen(false));
  };

  const associatedColumns = useMemo(
    () => getAssociatedColumns(handleRemoveProduct, canEdit),
    [canEdit, initialBrand.brandProducts]
  );

  const availableColumns = useMemo(
    () => getAvailableColumns(handleAddProduct, canEdit),
    [canEdit, initialBrand.brandProducts, allProducts]
  );

  const associatedProductIds = new Set(
    initialBrand.brandProducts.map((p) => p.product.id)
  );
  const availableProducts = allProducts.filter((p) => !associatedProductIds.has(p.id));

  return (
    <div className="space-y-6">
      {canEdit && (
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
      )}

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
