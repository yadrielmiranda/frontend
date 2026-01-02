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
import type { PricingRule } from "@/app/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount);

export const columns: ColumnDef<PricingRule>[] = [
  {
    id: "productName",
    header: "Product",
    accessorFn: (row) => row.product?.name ?? "",
  },
  {
    id: "brandName",
    header: "Brand",
    accessorFn: (row) => row.brand?.name ?? "",
  },
  {
    id: "systemName",
    header: "System",
    accessorFn: (row) => row.system?.name ?? "",
  },
  {
    id: "configConf",
    header: "Config",
    accessorFn: (row) => row.config?.conf ?? "",
  },
  {
    id: "crystalGlass",
    header: "Crystal",
    accessorFn: (row) => row.crystal?.glass ?? "",
  },

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

      const { user } = useAuth();
      const role = user?.role?.name ?? null;
      const canEdit = isAdmin(role);

      if (!canEdit) return <div className="text-right text-muted-foreground">—</div>;

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
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link href={`/settings/pricing-rules/${rule.id}/edit`}>Edit</Link>
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
