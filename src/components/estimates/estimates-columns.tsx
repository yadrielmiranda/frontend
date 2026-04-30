"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Send, RefreshCw } from "lucide-react";
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

import { deleteEstimate, recalculateEstimate } from "@/app/api/estimates.api";
import { createCheckoutSession } from "@/app/api/payments.api";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { formatDateEn, formatMoney } from "@/lib/formatters";

// =============================
// Helpers
// =============================

const getEstimateStatusName = (estimate: EstimateWithRelations): string => {
  if (estimate.status?.name) return estimate.status.name;
  if (estimate.order) return "Ordered";
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

// =============================
// Columns
// =============================

export const getEstimateColumns = (
  currentUser: AuthUser | null,
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
      const [isPaying, setIsPaying] = useState(false);
      const [isRecalculating, setIsRecalculating] = useState(false);
      const router = useRouter();

      const isOwner = currentUser?.id === estimate.idUser;

      const statusName = getEstimateStatusName(estimate);
      const isActive = statusName.trim().toLowerCase() === "active";
      const isExpired = statusName.trim().toLowerCase() === "expired";

      // Solo se puede pagar si está Active y no tiene order
      const isPayable = isActive && !estimate.order;
      const canDelete = !estimate.order && isOwner;

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

      const handlePay = async () => {
        setIsPaying(true);
        try {
          const { url } = await createCheckoutSession(estimate.id);
          window.location.href = url; // Stripe Checkout
        } catch (error) {
          toast.error((error as Error).message);
          setIsPaying(false);
        }
      };

      const handleRecalculate = async () => {
        setIsRecalculating(true);

        try {
          await recalculateEstimate(estimate.id);
          toast.success("Estimate recalculated successfully.");
          router.refresh();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsRecalculating(false);
        }
      };

      const payLabel = () => {
        if (isPaying) return "Redirecting to payment...";
        if (!isPayable) return "Not Available";
        return "Pay & Create Order";
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

              <DropdownMenuItem asChild disabled={!isPayable || !isOwner}>
                <Link href={`/estimates/${estimate.id}/edit`}>
                  Edit Estimate
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {isExpired ? (
                <DropdownMenuItem
                  onSelect={handleRecalculate}
                  disabled={isRecalculating || !isOwner}
                  className="text-blue-700 focus:bg-blue-50 focus:text-blue-800"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRecalculating
                    ? "Recalculating..."
                    : "Recalculate Estimate"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={handlePay}
                  disabled={isPaying || !isPayable || !isOwner}
                  className="text-green-700 focus:bg-green-50 focus:text-green-800"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {payLabel()}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => setShowDeleteConfirm(true)}
                disabled={!canDelete}
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
