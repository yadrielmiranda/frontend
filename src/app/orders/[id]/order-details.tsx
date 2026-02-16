"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { OrderWithRelations } from "@/lib/types";
import { formatDateEn, formatMoney } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

export function OrderDetails({
  order,
  canEdit,
  canViewFinancials,
}: {
  order: OrderWithRelations;
  canEdit: boolean;
  canViewFinancials: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Order #{order.number}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>Created: {formatDateEn(order.date)}</span>
            
            
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/orders">Back to Orders</Link>
          </Button>

          {canEdit ? (
            <Button asChild>
              <Link href={`/orders/${order.id}/edit`}>Edit Status</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Core info (todo el mundo lo ve) */}
      <div className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold">Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Estimate</div>
            <div className="font-medium">
              #{order.estimate?.number} — {order.estimate?.name}
            </div>
            <div className="mt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/estimates/${order.estimate?.id}`}>View Estimate</Link>
              </Button>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Amount Paid</div>
            <div className="font-medium">{formatMoney(order.amount)}</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-muted-foreground">Units</div>
                <div className="font-medium">{order.units}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">
                  <OrderStatusBadge name={order.status?.name} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privileged info (solo admin/operator) */}
      {canViewFinancials ? (
        <div className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold">Internal (Admin/Operator)</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Price</div>
              <div className="font-medium">{formatMoney(order.price)}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Rate (snapshot)</div>
              <div className="font-medium">{formatMoney(order.rate)}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Net Profit (snapshot)</div>
              <div className="font-medium">{formatMoney(order.netProfit)}</div>
            </div>

            <div>
              <div className="text-muted-foreground">PO Number</div>
              <div className="font-medium">{order.poNumber ?? "—"}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Rate Real</div>
              <div className="font-medium">
                {order.rateReal === null || order.rateReal === undefined
                  ? "—"
                  : formatMoney(order.rateReal)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Net Profit Real</div>
              <div className="font-medium">
                {order.netProfitReal === null || order.netProfitReal === undefined
                  ? "—"
                  : formatMoney(order.netProfitReal)}
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Created By: {order.user?.username ?? "—"} (User ID: {order.userId})
          </div>
        </div>
      ) : null}
    </div>
  );
}
