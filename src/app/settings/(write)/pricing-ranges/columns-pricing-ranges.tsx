"use client";

import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { deletePricingRange } from "@/app/api/pricing-ranges.api";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PricingRange } from "@/lib/types";

export type PricingRangeListRow = PricingRange & {
  productName: string;
  brandName: string;
  systemName: string;
  configConf: string;
};

function formatAxis(
  minimum: string | number | null,
  minimumInclusive: boolean,
  maximum: string | number | null,
  maximumInclusive: boolean,
) {
  if (minimum == null && maximum == null) return "Any";

  const opening = minimum == null || !minimumInclusive ? "(" : "[";
  const closing = maximum == null || !maximumInclusive ? ")" : "]";

  return `${opening}${minimum ?? "−∞"}, ${maximum ?? "∞"}${closing}`;
}

function PricingRangeActions({
  range,
  onDeleted,
}: {
  range: PricingRangeListRow;
  onDeleted: (id: number) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deletePricingRange(range.id);
      onDeleted(range.id);
      toast.success("Pricing range deleted successfully.");
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete range.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          <DropdownMenuItem asChild>
            <Link href={`/settings/pricing-ranges/${range.id}/edit`}>Edit</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) setShowDeleteConfirm(false);
        }}
        onConfirm={handleDelete}
        itemName={`pricing range ${range.code}`}
      />
    </div>
  );
}

export function getPricingRangeColumns(
  onDeleted: (id: number) => void,
): ColumnDef<PricingRangeListRow>[] {
  return [
    {
      accessorKey: "id",
      header: "Range #",
      filterFn: (row, _columnId, filterValue) => {
        const search = String(filterValue ?? "").trim();
        return !search || String(row.original.id).includes(search);
      },
    },
    {
      id: "productName",
      header: "Product",
      accessorFn: (row) => row.productName,
      filterFn: "equalsString",
    },
    {
      id: "brandName",
      header: "Brand",
      accessorFn: (row) => row.brandName,
      filterFn: "equalsString",
    },
    {
      id: "systemName",
      header: "System",
      accessorFn: (row) => row.systemName,
      filterFn: "includesString",
    },
    {
      id: "configConf",
      header: "Configuration",
      accessorFn: (row) => row.configConf,
      filterFn: "equalsString",
    },
    {
      accessorKey: "code",
      header: "Code",
      filterFn: "includesString",
    },
    {
      id: "widthRange",
      header: "Width (in)",
      cell: ({ row }) =>
        formatAxis(
          row.original.minWidthIn,
          row.original.minWidthInclusive,
          row.original.maxWidthIn,
          row.original.maxWidthInclusive,
        ),
    },
    {
      id: "heightRange",
      header: "Height (in)",
      cell: ({ row }) =>
        formatAxis(
          row.original.minHeightIn,
          row.original.minHeightInclusive,
          row.original.maxHeightIn,
          row.original.maxHeightInclusive,
        ),
    },
    {
      id: "crystalNames",
      header: () => <div className="text-center">Crystal Rules</div>,
      accessorFn: (row) =>
        row.rules.map((rule) => rule.crystal?.glass ?? "").join(" | "),
      filterFn: "includesString",
      cell: ({ row }) => (
        <div className="text-center">{row.original.rules.length}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
      filterFn: "equalsString",
      cell: ({ row }) => (
        <span
          className={
            row.original.isActive
              ? "font-medium text-emerald-700"
              : "text-muted-foreground"
          }
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <PricingRangeActions range={row.original} onDeleted={onDeleted} />
      ),
    },
  ];
}
