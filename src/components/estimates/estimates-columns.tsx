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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import { deleteEstimate, recalculateEstimate } from "@/app/api/estimates.api";
import { createCheckoutSession } from "@/app/api/payments.api";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { formatDateEn, formatMoney } from "@/lib/formatters";
import {
  canViewDealerEstimateProfit,
  canViewInternalEstimateProfit,
} from "@/lib/rbac";
import type { DataTableDateRangeValue } from "@/components/data-table";

// =============================
// Helpers
// =============================

export const getEstimateStatusName = (
  estimate: EstimateWithRelations,
): string => {
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

const getEstimateDateKey = (value: string): string => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  // Usa la misma fecha local que formatDateEn.
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// =============================
// Columns
// =============================

export const getEstimateColumns = (
  currentUser: AuthUser | null,
): ColumnDef<EstimateWithRelations>[] => {
  const role = currentUser?.role?.name ?? null;

  const showInternalProfit = canViewInternalEstimateProfit(role);
  const showDealerProfit = canViewDealerEstimateProfit(role);

  const columns: ColumnDef<EstimateWithRelations>[] = [
    {
      accessorKey: "number",
      header: "Number",
      filterFn: "includesString",
    },
    {
      accessorKey: "name",
      header: "Name",
      filterFn: "includesString",
    },
    {
      accessorKey: "date",
      header: "Date",
      filterFn: (row, _columnId, range: DataTableDateRangeValue) => {
        const dateKey = getEstimateDateKey(row.original.date);

        if (!dateKey) {
          return false;
        }

        if (range?.from && dateKey < range.from) {
          return false;
        }

        if (range?.to && dateKey > range.to) {
          return false;
        }

        return true;
      },
      cell: ({ row }) => formatDateEn(row.original.date),
    },
    {
      accessorKey: "units",
      header: () => <div className="text-center">Units</div>,
      cell: ({ row }) => (
        <div className="text-center">{row.original.units}</div>
      ),
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
    ...(showInternalProfit
      ? [
          {
            accessorKey: "netProfit",
            header: () => <div className="text-right">Net Profit ($)</div>,
            cell: ({ row }) => (
              <div className="text-right">
                {formatMoney(row.original.netProfit)}
              </div>
            ),
          } satisfies ColumnDef<EstimateWithRelations>,
        ]
      : []),

    ...(showDealerProfit
      ? [
          {
            accessorKey: "netProfitD",
            header: () => <div className="text-right">Net Profit D ($)</div>,
            cell: ({ row }) => (
              <div className="text-right">
                {formatMoney(row.original.netProfitD)}
              </div>
            ),
          } satisfies ColumnDef<EstimateWithRelations>,
        ]
      : []),
    {
      id: "createdBy",
      accessorFn: (estimate) => estimate.user?.username ?? "",
      header: () => <div className="text-center">Created By</div>,
      filterFn: "equalsString",
      cell: ({ row }) => (
        <div className="text-center">{row.original.user?.username ?? "—"}</div>
      ),
    },
    ...(showInternalProfit
      ? [
          {
            id: "createdByRole",
            accessorFn: (estimate) => estimate.user?.role?.name ?? "",
            header: () => <div className="text-center">Role</div>,
            filterFn: "equalsString",
            cell: ({ row }) => (
              <div className="text-center capitalize">
                {row.original.user?.role?.name ?? "—"}
              </div>
            ),
          } satisfies ColumnDef<EstimateWithRelations>,
        ]
      : []),
    {
      id: "status",
      accessorFn: (estimate) => getEstimateStatusName(estimate),
      header: "Status",
      filterFn: "equalsString",
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

        const statusName = getEstimateStatusName(estimate);
        const statusLower = statusName.trim().toLowerCase();

        const isOwner = currentUser?.id === estimate.idUser;
        const showOwnerActions = isOwner;
        const isDealer = currentUser?.role?.name === "dealer";

        const isActive = statusLower === "active";
        const isExpired = statusLower === "expired";
        const isOrdered = statusLower === "ordered" || !!estimate.order;

        const canEdit = isActive && isOwner;
        const canPay = isActive && !estimate.order && isOwner;
        const canRecalculate = isExpired && !estimate.order && isOwner;

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

                {isDealer ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      View Details
                    </DropdownMenuSubTrigger>

                    <DropdownMenuSubContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/estimates/${estimate.id}`}>
                          Dealer View
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href={`/estimates/${estimate.id}?view=public`}>
                          Customer View
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href={`/estimates/${estimate.id}`}>View Details</Link>
                  </DropdownMenuItem>
                )}

                {showOwnerActions && canEdit && (
                  <DropdownMenuItem asChild>
                    <Link href={`/estimates/${estimate.id}/edit`}>
                      Edit Estimate
                    </Link>
                  </DropdownMenuItem>
                )}

                {showOwnerActions && canRecalculate && (
                  <DropdownMenuItem
                    onSelect={handleRecalculate}
                    disabled={isRecalculating}
                    className="text-blue-700 focus:bg-blue-50 focus:text-blue-800"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isRecalculating
                      ? "Recalculating..."
                      : "Recalculate Estimate"}
                  </DropdownMenuItem>
                )}

                {showOwnerActions && canPay && (
                  <DropdownMenuItem
                    onSelect={handlePay}
                    disabled={isPaying}
                    className="text-green-700 focus:bg-green-50 focus:text-green-800"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isPaying ? "Redirecting..." : "Pay & Create Order"}
                  </DropdownMenuItem>
                )}

                {showOwnerActions && !isOrdered && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-700"
                      onSelect={() => setShowDeleteConfirm(true)}
                    >
                      Delete Estimate
                    </DropdownMenuItem>
                  </>
                )}
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
  return columns;
};
