"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { InstallationJob, OrderWithRelations } from "@/lib/types";
import { formatDateEn, formatMoney } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderInstallationPanel } from "@/components/orders/order-installation-panel";
import { OrderExtraChargesPanel } from "@/components/orders/order-extra-charges-panel";
import { OrderMaterialPanel } from "@/components/orders/order-material-panel";
import { OrderDeliveryPanel } from "@/components/orders/order-delivery-panel";

const percent = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Number(value ?? 0));

export function OrderDetails({
  order,
  installation,
  isOwner,
  isPrivileged,
  isAdmin,
  canEdit,
  canViewFinancials,
  canRecordManualPayment,
}: {
  order: OrderWithRelations;
  installation: InstallationJob | null;
  isOwner: boolean;
  isPrivileged: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canViewFinancials: boolean;
  canRecordManualPayment: boolean;
}) {
  const orderPaymentBase = Number(
    order.payment?.baseAmount ?? order.amount ?? 0,
  );
  const orderPaymentFee = Number(order.payment?.surchargeAmount ?? 0);
  const orderPaymentTotal = Number(order.payment?.amount ?? order.amount ?? 0);

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
                <Link href={`/estimates/${order.estimate?.id}`}>
                  View Estimate
                </Link>
              </Button>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Order creation payment</div>
            <div className="font-medium">{formatMoney(orderPaymentTotal)}</div>
            {orderPaymentFee > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {formatMoney(orderPaymentBase)} project charge +{" "}
                {formatMoney(orderPaymentFee)} card fee (
                {percent(order.payment?.surchargePercent)}%)
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                {order.payment?.paymentMethod ?? "Payment recorded"}
              </div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              Materials and any applicable City Fee. Installation payments are
              recorded separately.
            </div>

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

      <OrderMaterialPanel order={order} />

      <OrderDeliveryPanel
        order={order}
        installation={installation}
        isOwner={isOwner}
        isPrivileged={isPrivileged}
        isAdmin={isAdmin}
        canRecordManualPayment={canRecordManualPayment}
      />

      {installation && (
        <OrderInstallationPanel
          order={order}
          initialJob={installation}
          isOwner={isOwner}
          isPrivileged={isPrivileged}
          canRecordManualPayment={canRecordManualPayment}
        />
      )}

      {installation && installation.status !== "CANCELED" && (
        <OrderExtraChargesPanel
          order={order}
          isOwner={isOwner}
          isPrivileged={isPrivileged}
          canRecordManualPayment={canRecordManualPayment}
        />
      )}

      {/* Privileged info (solo admin/operator) */}
      {canViewFinancials ? (
        <div className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Material financial summary
            </h2>
            <p className="text-xs text-muted-foreground">
              Installation profit is not included in these figures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Sale channel</div>
              <div className="font-medium">
                {order.dealerModeSnapshot
                  ? `${order.dealerModeSnapshot} · ${
                      order.dealerAffiliationSnapshot ?? "AUTHENTIC"
                    }`
                  : "DIRECT CLIENT · AUTHENTIC"}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Material sale subtotal
              </div>
              <div className="font-medium">
                {formatMoney(order.saleSubtotal)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Estimated factory cost
              </div>
              <div className="font-medium">{formatMoney(order.rate)}</div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Impact markup snapshot
              </div>
              <div className="font-medium">
                {(Number(order.impactMarkupRate) * 100).toFixed(2)}%
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Estimated Impact profit
              </div>
              <div className="font-medium">
                {formatMoney(order.impactProfit)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Estimated Authentic profit
              </div>
              <div className="font-medium">
                {formatMoney(order.authenticProfit)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Estimated total material profit
              </div>
              <div className="font-medium">{formatMoney(order.netProfit)}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Factory PO Number</div>
              <div className="font-medium">{order.poNumber ?? "—"}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Real factory cost</div>
              <div className="font-medium">
                {order.rateReal === null || order.rateReal === undefined
                  ? "—"
                  : formatMoney(order.rateReal)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Real Impact profit</div>
              <div className="font-medium">
                {order.impactProfitReal === null ||
                order.impactProfitReal === undefined
                  ? "—"
                  : formatMoney(order.impactProfitReal)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Real Authentic profit</div>
              <div className="font-medium">
                {order.authenticProfitReal === null ||
                order.authenticProfitReal === undefined
                  ? "—"
                  : formatMoney(order.authenticProfitReal)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">
                Real total material profit
              </div>
              <div className="font-medium">
                {order.netProfitReal === null ||
                order.netProfitReal === undefined
                  ? "Pending real factory cost"
                  : formatMoney(order.netProfitReal)}
              </div>
            </div>
          </div>

          <div className="border-t pt-3 text-xs text-muted-foreground">
            Payment: {order.payment?.paymentMethod ?? "CARD"}
            {order.payment?.manualReference
              ? ` · Ref. ${order.payment.manualReference}`
              : ""}
            {order.payment?.payerName
              ? ` · Payer: ${order.payment.payerName}`
              : ""}
            <br />
            Created By: {order.user?.username ?? "—"} (User ID: {order.userId})
          </div>
        </div>
      ) : null}
    </div>
  );
}
