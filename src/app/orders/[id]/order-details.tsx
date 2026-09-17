"use client";

import { useEffect, useState } from "react";
import { EstimatePaymentCard } from "@/components/estimates/estimate-payment-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { InstallationJob, OrderWithRelations } from "@/lib/types";
import { formatDateEn, formatMoney } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderInstallationPanel } from "@/components/orders/order-installation-panel";
import { OrderExtraChargesPanel } from "@/components/orders/order-extra-charges-panel";
import { OrderMaterialPanel } from "@/components/orders/order-material-panel";
import { OrderDeliveryPanel } from "@/components/orders/order-delivery-panel";

export function OrderDetails({
  order,
  installation,
  isOwner,
  isPrivileged,
  isAdmin,
  canEdit,
  canViewFinancials,
  cardSurchargeFraction,
  canRecordManualPayment,
}: {
  order: OrderWithRelations;
  installation: InstallationJob | null;
  isOwner: boolean;
  isPrivileged: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canViewFinancials: boolean;
  cardSurchargeFraction: number;
  canRecordManualPayment: boolean;
}) {
  const [paymentTarget, setPaymentTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!paymentTarget) return;
    // Los cobros adicionales se montan en un portal después del primer render.
    const scrollToPayment = () => {
      const anchor = window.location.hash.slice(1);
      if (anchor === "estimate-payment" || anchor === "order-additional-payments") {
        document.getElementById(anchor)?.scrollIntoView({ block: "start" });
      }
    };
    scrollToPayment();
    window.addEventListener("hashchange", scrollToPayment);
    return () => window.removeEventListener("hashchange", scrollToPayment);
  }, [paymentTarget]);

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

          <div className="grid grid-cols-2 content-start gap-4">
            <div>
              <div className="text-muted-foreground">Units</div>
              <div className="font-medium">{order.units}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">
                <OrderStatusBadge name={order.status?.name} />
                {order.status?.name === "Installed" && Number(order.paymentSchedule?.balance) > 0 && <span className="ml-2 text-amber-700">Balance due</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-2">
          <OrderMaterialPanel order={order} />
          {installation ? (
            <OrderInstallationPanel
              paymentTarget={paymentTarget}
              order={order}
              initialJob={installation}
              isOwner={isOwner}
              cardSurchargeFraction={cardSurchargeFraction}
              canRecordManualPayment={canRecordManualPayment}
            />
          ) : (
            <section className="min-w-0 overflow-hidden rounded-lg border bg-white">
              <h2 className="bg-slate-50 px-4 py-3 text-sm font-semibold">
                Installation &amp; services
              </h2>
              <div className="flex items-center justify-between gap-4 p-4 text-sm">
                <span className="text-muted-foreground">Installation</span>
                <span className="font-medium">Not included</span>
              </div>
            </section>
          )}
        </div>
      </div>

      <OrderDeliveryPanel
        paymentTarget={paymentTarget}
        order={order}
        installation={installation}
        isOwner={isOwner}
        isPrivileged={isPrivileged}
        isAdmin={isAdmin}
        cardSurchargeFraction={cardSurchargeFraction}
        canRecordManualPayment={canRecordManualPayment}
      />

      {installation && installation.status !== "CANCELED" && (
        <OrderExtraChargesPanel
          paymentTarget={paymentTarget}
          order={order}
          isOwner={isOwner}
          isPrivileged={isPrivileged}
          cardSurchargeFraction={cardSurchargeFraction}
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
                  ? `${order.dealerModeSnapshot} DEALER`
                  : "DIRECT CLIENT"}
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
                Estimated material profit
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
              <div className="text-muted-foreground">Real material profit</div>
              <div className="font-medium">
                {order.netProfitReal === null ||
                order.netProfitReal === undefined
                  ? "Pending real factory cost"
                  : formatMoney(order.netProfitReal)}
              </div>
            </div>
          </div>

          <div className="border-t pt-3 text-xs text-muted-foreground">
            Payment: {order.payment?.paymentMethodLabel ?? (order.payment?.stripeSessionId ? "Stripe — pending verification" : order.payment?.paymentMethod ?? "Not recorded")}
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

      {<EstimatePaymentCard
        estimateId={order.idEst} estimateOwnerId={order.userId} ownerRole={order.user.role.name}
        estimateStatus="Ordered" order={order} materialPayments={order.estimate.payments ?? []}
        installationJob={installation} currentUserId={isOwner ? order.userId : 0}
        materialAmount={0} dealerMode={order.dealerModeSnapshot} paymentSchedule={order.paymentSchedule}
        cardSurchargeFraction={cardSurchargeFraction} canRecordManualPayment={canRecordManualPayment}
      />}
      <div id="order-additional-payments" ref={setPaymentTarget} className="scroll-mt-28 space-y-6 empty:hidden" />
    </div>
  );
}
