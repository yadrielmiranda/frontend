"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { addProductToBrand, removeProductFromBrand } from "@/app/api/brands.api";
import { Product } from "@/app/settings/products/columns-products"; // Reutilizamos el tipo
import { AssociatedProduct, getAssociatedColumns, getAvailableColumns } from "./columns-brand-products";

// Este es el nuevo componente que contiene toda la lógica de cliente.
export function BrandProductsClient({
  brandId,
  initialAssociatedProducts,
  allProducts,
}: {
  brandId: number;
  initialAssociatedProducts: AssociatedProduct[];
  allProducts: Product[];
}) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // ---- Lógica para añadir y desvincular productos ----
  const handleAction = async (action: Promise<any>, successMsg: string, errorMsg: string) => {
    try {
      await action;
      router.refresh(); // Recarga los datos del servidor para actualizar las listas
      // alert(successMsg); // Opcional: mostrar notificación de éxito
    } catch (error) {
      console.error(errorMsg, error);
      alert(errorMsg);
    }
  };

  const handleRemoveProduct = (productId: number) => {
    handleAction(
      removeProductFromBrand(brandId, productId),
      "Product successfully unlinked",
      "Error unlinking product"
    );
  };
  
  const handleAddProduct = (productId: number) => {
    handleAction(
      addProductToBrand(brandId, productId),
      "Product successfully linked",
      "Error linking product"
    );
  };
  
  // ---- Preparación de datos y columnas ----

  // Obtenemos las definiciones de las columnas llamando a las funciones
  const associatedColumns = useMemo(() => getAssociatedColumns(handleRemoveProduct), [handleRemoveProduct]);
  const availableColumns = useMemo(() => getAvailableColumns(handleAddProduct), [handleAddProduct]);

  // Filtramos para mostrar en el modal solo los productos que NO están ya asociados
  const associatedProductIds = new Set(initialAssociatedProducts.map(p => p.product.id));
  const availableProducts = allProducts.filter(p => !associatedProductIds.has(p.id));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="green">+ Add Products </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>
                Search and select a product from the list to link it to this brand,
              </DialogDescription>
            </DialogHeader>
            <DataTable
              columns={availableColumns}
              data={availableProducts}
              filterColumnId="name"
              filterPlaceholder="Find for a product to add..."
            />
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Associated products</h2>
      <DataTable
        columns={associatedColumns}
        data={initialAssociatedProducts}
        filterColumnId="product_name"
        filterPlaceholder="Filter associated products..."
      />
    </div>
  );
}