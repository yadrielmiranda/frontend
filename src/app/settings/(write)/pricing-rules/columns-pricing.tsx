"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import { deletePricingRule } from "@/app/api/pricing-rules.api";
import type { PricingRule } from "@/lib/types";

// comentario en español: formatear el decimal sin convertirlo a number
// para conservar hasta 20 posiciones decimales.
const formatCurrency = (value: string | number): string => {
  const rawValue = String(value).trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    return "$0.00";
  }

  const isNegative = rawValue.startsWith("-");
  const unsignedValue = isNegative ? rawValue.slice(1) : rawValue;

  const [integerPart = "0", decimalPart = ""] = unsignedValue.split(".");

  const formattedInteger = new Intl.NumberFormat("en-US", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(BigInt(integerPart || "0"));

  // comentario en español: eliminar únicamente ceros finales,
  // manteniendo un mínimo de dos decimales.
  const significantDecimals = decimalPart.slice(0, 20).replace(/0+$/, "");

  const formattedDecimals = significantDecimals.padEnd(2, "0");

  return `${isNegative ? "-" : ""}$${formattedInteger}.${formattedDecimals}`;
};

export const columns: ColumnDef<PricingRule>[] = [
  {
    accessorKey: "id",
    header: "Rule #",
    filterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue ?? "").trim();

      if (!search) return true;

      return String(row.original.id).includes(search);
    },
    cell: ({ row }) => row.original.id,
  },
  {
    id: "productName",
    header: "Product",
    accessorFn: (row) => row.product?.name ?? "",
    filterFn: "equalsString",
  },
  {
    id: "brandName",
    header: "Brand",
    accessorFn: (row) => row.brand?.name ?? "",
    filterFn: "equalsString",
  },
  {
    id: "systemName",
    header: "System",
    accessorFn: (row) => row.system?.name ?? "",
    filterFn: "includesString",
  },
  {
    id: "configConf",
    header: "Config",
    accessorFn: (row) => row.config?.conf ?? "",
    filterFn: "equalsString",
  },
  {
    id: "crystalGlass",
    header: "Crystal",
    accessorFn: (row) => row.crystal?.glass ?? "",
    filterFn: "equalsString",
  },

  // Desde aquí continúan costoA, costoB, costoC y actions sin cambios.
  {
    accessorKey: "costoA",
    header: () => <div className="text-right">Area Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.costoA)}</div>
    ),
  },
  {
    accessorKey: "costoB",
    header: () => <div className="text-right">Perimeter Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.costoB)}</div>
    ),
  },
  {
    accessorKey: "costoC",
    header: () => <div className="text-right">Fixed Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.costoC)}</div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const rule = row.original;
      const router = useRouter();
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

      const handleDelete = async () => {
        try {
          await deletePricingRule(rule.id);
          toast.success("Pricing rule deleted.");
          router.refresh();
        } catch (e: any) {
          toast.error(e?.message || "Delete failed");
        } finally {
          setShowDeleteConfirm(false);
        }
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link href={`/settings/pricing-rules/${rule.id}/edit`}>
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            itemName={`the rule for ${rule.product?.name || "this item"}`}
          />
        </div>
      );
    },
  },
];
