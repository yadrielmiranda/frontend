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

import { deleteLinearPricingRule } from "@/app/api/linear-pricing-rules.api";
import type { LinearPricingRule } from "@/lib/types";

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(Number(amount ?? 0));

const formatInches = (value: number) =>
  `${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })}"`;

export const columns: ColumnDef<LinearPricingRule>[] = [
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
    accessorKey: "costPerInch",
    header: () => <div className="text-right">Cost / Inch</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatMoney(row.original.costPerInch)}</div>
    ),
  },
  {
    accessorKey: "minLengthIn",
    header: () => <div className="text-right">Min Length</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatInches(row.original.minLengthIn)}</div>
    ),
  },
  {
    accessorKey: "maxLengthIn",
    header: () => <div className="text-right">Max Length</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatInches(row.original.maxLengthIn)}</div>
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
          await deleteLinearPricingRule(rule.id);
          toast.success("Linear pricing rule deleted.");
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
                <Link href={`/settings/linear-pricing-rules/${rule.id}/edit`}>
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
            itemName={`the linear rule for ${rule.product?.name || "this item"}`}
          />
        </div>
      );
    },
  },
];
