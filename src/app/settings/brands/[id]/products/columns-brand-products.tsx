"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Product } from "@/app/settings/products/columns-products"; // Reutilizamos el tipo Product

// Tipo para el producto asociado a través de la tabla de unión
export type AssociatedProduct = {
  product: Product;
};

// --- Columnas para la tabla de productos YA ASOCIADOS ---
// Usamos una función que recibe el manejador del evento para mantener el código limpio.
export const getAssociatedColumns = (
  handleRemove: (productId: number) => void
): ColumnDef<AssociatedProduct>[] => [
  {
    id: "product_name",
    accessorKey: "product.name",
    header: "Nombre del Producto",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const productId = row.original.product.id;
      return (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleRemove(productId)}
        >
          Desvincular
        </Button>
      );
    },
  },
];

// --- Columnas para la tabla de productos DISPONIBLES (en el modal) ---
export const getAvailableColumns = (
  handleAdd: (productId: number) => void
): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: "Nombre del Producto",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <Button
          variant="green"
          size="sm"
          onClick={() => handleAdd(product.id)}
        >
          Add
        </Button>
      );
    },
  },
];