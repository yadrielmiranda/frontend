"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PricingRule } from "@/app/api/pricing-rules.api";
import { deletePricingRule } from "@/app/api/pricing-rules.api";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount);
};

export const columns: ColumnDef<PricingRule>[] = [
  { id: "product", accessorKey: "product.name", header: "Product" },
  { accessorKey: "brand.name", header: "Brand" },
  { accessorKey: "system.name", header: "System" },
  { accessorKey: "config.conf", header: "Config" },
  { accessorKey: "crystal.glass", header: "Crystal" },
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
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          await deletePricingRule(rule.id);
          toast.success("Pricing rule deleted successfully.");
          router.refresh();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setShowDeleteConfirm(false);
        }
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
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
                className="text-red-600"
                onSelect={() => setShowDeleteConfirm(true)}
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
