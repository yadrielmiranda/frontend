"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { deleteEstimate } from "@/app/api/estimates.api";
import { createOrder } from "@/app/api/orders.api";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { formatDateEn, formatMoney } from "@/lib/formatters";

const getEstimateStatusName = (estimate: EstimateWithRelations): string => {
  // Preferimos status.name si viene incluido desde el backend
  if (estimate.status?.name) return estimate.status.name;

  // Fallback defensivo: si existe order, entonces está ordenado
  if (estimate.order) return "Ordered";

  // Si no viene status y tampoco order, dejamos Unknown
  return "Unknown";
};

const getStatusBadge = (statusName: string) => {
  const name = statusName.trim().toLowerCase();

  if (name === "active") {
    return (
      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Active
      </span>
    );
  }

  if (name === "ordered") {
    return (
      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
        Ordered
      </span>
    );
  }

  if (name === "expired") {
    return (
      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
        Expired
      </span>
    );
  }

  return (
    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
      {statusName || "Unknown"}
    </span>
  );
};

export const getEstimateColumns = (
  currentUser: AuthUser | null
): ColumnDef<EstimateWithRelations>[] => [
  {
    accessorKey: "number",
    header: "Number",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDateEn(row.original.date),
  },
  {
    accessorKey: "units",
    header: "Units",
    cell: ({ row }) => <div className="text-center">{row.original.units}</div>,
  },
  {
    accessorKey: "priceT",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatMoney(row.original.priceT)}
      </div>
    ),
  },
  {
    accessorKey: "netProfitD",
    header: () => <div className="text-right">Net Profit ($)</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatMoney(row.original.netProfitD)}</div>
    ),
  },
  {
    accessorKey: "user.username",
    header: "Created By",
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const statusName = getEstimateStatusName(row.original);
      return getStatusBadge(statusName);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const estimate = row.original;

      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const [isCreatingOrder, setIsCreatingOrder] = useState(false);
      const router = useRouter();

      const isOwner = currentUser?.id === estimate.idUser;

      const statusName = getEstimateStatusName(estimate);
      const isActive = statusName.trim().toLowerCase() === "active";

      // Editable SOLO si está Active y no tiene order
      const isEditable = isActive && !estimate.order;

      const handleDelete = async () => {
        try {
          await deleteEstimate(estimate.id);
          setShowDeleteConfirm(false);
          toast.success("Estimate deleted successfully.");
          router.refresh();
        } catch (error) {
          toast.error((error as Error).message);
        }
      };

      const handleCreateOrder = async () => {
        setIsCreatingOrder(true);
        try {
          const newOrder = await createOrder(estimate.id);
          toast.success(`Order #${newOrder.number} created successfully!`);
          router.refresh();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsCreatingOrder(false);
        }
      };

      const createOrderLabel = () => {
        if (isCreatingOrder) return "Creating Order...";
        if (!isEditable) return "Not Available";
        return "Create Order";
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
                <Link href={`/estimates/${estimate.id}`}>View Details</Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild disabled={!isEditable || !isOwner}>
                <Link href={`/estimates/${estimate.id}/edit`}>Edit Estimate</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={handleCreateOrder}
                disabled={isCreatingOrder || !isEditable || !isOwner}
                className="text-blue-600 focus:bg-blue-50 focus:text-blue-700"
              >
                <Send className="mr-2 h-4 w-4" />
                {createOrderLabel()}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => setShowDeleteConfirm(true)}
                disabled={!isEditable || !isOwner}
              >
                Delete Estimate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
          />
        </div>
      );
    },
  },
];
