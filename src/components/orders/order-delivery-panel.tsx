"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  MapPin,
  PackageCheck,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  DeliveryType,
  InstallationJob,
  OrderDelivery,
  OrderFulfillmentMethod,
  OrderWithRelations,
} from "@/lib/types";
import {
  completeOrderDelivery,
  completeOrderPickup,
  createOrderDelivery,
  scheduleOrderDelivery,
  selectOrderPickup,
} from "@/app/api/orders.api";
import {
  cancelCheckoutSession,
  createCheckoutSession,
} from "@/app/api/payments.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import { titleCase } from "@/lib/installation-flow";
import { ManualPaymentDialog } from "@/components/payments/manual-payment-dialog";
import { EstimatePaymentLinkActions } from "@/components/estimates/estimate-payment-link-actions";
import { CardFeeBreakdown } from "@/components/payments/card-fee-breakdown";
import { getCardPaymentBreakdown } from "@/lib/card-payment";

const deliveryName = (type: DeliveryType) => {
  if (type === "INSTALLATION_OVERRIDE") return "Delivery with installation";
  if (type === "PRE_DELIVERY") return "Separate pre-delivery";
  if (type === "REDELIVERY") return "Redelivery";
  return "Delivery";
};

const displayDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function OrderDeliveryPanel({
  order,
  installation,
  isOwner,
  isPrivileged,
  isAdmin,
  cardSurchargeFraction,
  canRecordManualPayment,
}: {
  order: OrderWithRelations;
  installation: InstallationJob | null;
  isOwner: boolean;
  isPrivileged: boolean;
  isAdmin: boolean;
  cardSurchargeFraction: number;
  canRecordManualPayment: boolean;
}) {
  const router = useRouter();
  const installationActive = Boolean(
    installation && installation.status !== "CANCELED",
  );
  const dealerCustomer = order.user.role?.name === "dealer";
  const initialAddress = useMemo(
    () => ({
      street: dealerCustomer
        ? (order.estimate.customerStreet ?? "")
        : (order.user.street ?? ""),
      city: dealerCustomer
        ? (order.estimate.customerCity ?? "")
        : (order.user.city ?? ""),
      state: dealerCustomer
        ? (order.estimate.customerState ?? "")
        : (order.user.state ?? ""),
      postalCode: dealerCustomer
        ? (order.estimate.customerPostalCode ?? "")
        : (order.user.postalCode ?? ""),
    }),
    [dealerCustomer, order.estimate, order.user],
  );

  const [deliveries, setDeliveries] = useState(order.deliveries ?? []);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<OrderFulfillmentMethod>(order.fulfillmentMethod);
  const [formType, setFormType] = useState<DeliveryType | null>(null);
  const [address, setAddress] = useState(initialAddress);
  const [internalReason, setInternalReason] = useState("");
  const [taxable, setTaxable] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const replaceDelivery = (updated: OrderDelivery) => {
    setDeliveries((current) =>
      current.map((delivery) =>
        delivery.id === updated.id ? updated : delivery,
      ),
    );
  };

  const choosePickup = async () => {
    setBusy(true);
    try {
      const result = await selectOrderPickup(order.id);
      if (result.canceledDelivery) {
        replaceDelivery(result.canceledDelivery);
      }
      setFulfillmentMethod("CUSTOMER_PICKUP");
      setFormType(null);
      toast.success("Customer pickup selected.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finishPickup = async () => {
    setBusy(true);
    try {
      await completeOrderPickup(order.id);
      toast.success("Customer pickup completed.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const calculateDelivery = async () => {
    if (!formType) return;
    if (
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.postalCode.trim()
    ) {
      toast.error("Complete the entire delivery address.");
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(address.state.trim())) {
      toast.error("Enter the two-letter state code, for example FL.");
      return;
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(address.postalCode.trim())) {
      toast.error("Enter a valid 5-digit ZIP code or ZIP+4.");
      return;
    }
    if (formType !== "STANDARD" && !internalReason.trim()) {
      toast.error("Enter the required internal reason.");
      return;
    }

    setBusy(true);
    try {
      const created = await createOrderDelivery(order.id, {
        type: formType,
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim().toUpperCase(),
        postalCode: address.postalCode.trim(),
        taxable: isAdmin ? taxable : undefined,
        internalReason:
          formType === "STANDARD" ? undefined : internalReason.trim(),
      });
      setDeliveries((current) => [...current, created]);
      if (formType !== "REDELIVERY") {
        setFulfillmentMethod(
          formType === "INSTALLATION_OVERRIDE"
            ? "INSTALLATION_DELIVERY"
            : "COMPANY_DELIVERY",
        );
      }
      setFormType(null);
      setInternalReason("");
      setTaxable(false);
      toast.success("Delivery address verified and charge added for payment.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const payDelivery = async (delivery: OrderDelivery) => {
    setBusy(true);
    try {
      const { url } = await createCheckoutSession(
        order.idEst,
        "DELIVERY",
        delivery.sequence,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  const cancelDeliveryPayment = async (delivery: OrderDelivery) => {
    setBusy(true);
    try {
      const result = await cancelCheckoutSession(
        order.idEst,
        "DELIVERY",
        delivery.sequence,
      );
      if (result.status === "paid") {
        toast.success("Delivery payment was already confirmed.");
        router.refresh();
        return;
      }

      if (delivery.payment) {
        replaceDelivery({
          ...delivery,
          payment: {
            ...delivery.payment,
            status: "CANCELED",
            stripeSessionId: null,
          },
        });
      }
      toast.success(
        "Payment attempt canceled. You can now change this order to pickup.",
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const schedule = async (delivery: OrderDelivery) => {
    const localDate = scheduledFor[delivery.id];
    if (!localDate || Number.isNaN(new Date(localDate).getTime())) {
      toast.error("Select a valid delivery date and time.");
      return;
    }
    setBusy(true);
    try {
      replaceDelivery(
        await scheduleOrderDelivery(
          delivery.id,
          new Date(localDate).toISOString(),
        ),
      );
      toast.success("Delivery scheduled.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async (delivery: OrderDelivery) => {
    setBusy(true);
    try {
      replaceDelivery(await completeOrderDelivery(delivery.id));
      toast.success("Delivery completed.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ready = order.status.name === "Ready to pick up";
  const activePrimaryDelivery = deliveries.some(
    (delivery) =>
      delivery.type !== "REDELIVERY" && delivery.status !== "CANCELED",
  );
  const canChoose = ready && (isOwner || isPrivileged);
  const canCreateStandard =
    canChoose && !installationActive && !activePrimaryDelivery;
  const canCreateSpecial =
    ready && installationActive && isAdmin && !activePrimaryDelivery;
  const canCreateRedelivery =
    isAdmin &&
    ["Delivered", "Installation in progress", "Installed"].includes(
      order.status.name,
    );

  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pickup &amp; Delivery</h2>
          <p className="text-sm text-muted-foreground">
            Pickup is free. A valid delivery address, including the correct ZIP
            code, is required for delivery.
          </p>
        </div>
        <Badge variant="secondary">Pickup truck</Badge>
      </div>

      {installationActive && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <strong className="block">Delivery included with installation</strong>
          <span>
            Materials travel with the installation crew at no additional
            delivery charge unless an administrator creates an exception or a
            separate pre-delivery.
          </span>
        </div>
      )}

      {ready && !installationActive && !activePrimaryDelivery && (
        <div className="mt-4 rounded-lg border p-4">
          {fulfillmentMethod === "CUSTOMER_PICKUP" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="flex items-center gap-2">
                  <Store className="h-4 w-4" /> Customer pickup selected
                </strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  No delivery charge applies.
                </p>
              </div>
              <div className="flex gap-2">
                {canCreateStandard && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setFormType("STANDARD")}
                  >
                    Change to delivery
                  </Button>
                )}
                {isPrivileged && (
                  <Button disabled={busy} onClick={() => void finishPickup()}>
                    <PackageCheck className="h-4 w-4" /> Complete pickup
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <strong>Choose how to receive this order</strong>
              <div className="mt-3 flex flex-wrap gap-2">
                {canChoose && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void choosePickup()}
                  >
                    <Store className="h-4 w-4" /> Free customer pickup
                  </Button>
                )}
                {canCreateStandard && (
                  <Button
                    disabled={busy}
                    onClick={() => setFormType("STANDARD")}
                  >
                    <Truck className="h-4 w-4" /> Calculate delivery
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {canCreateSpecial && formType === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setFormType("INSTALLATION_OVERRIDE")}
          >
            Charge delivery with installation
          </Button>
          <Button variant="outline" onClick={() => setFormType("PRE_DELIVERY")}>
            Add separate pre-delivery
          </Button>
        </div>
      )}

      {canCreateRedelivery && formType === null && (
        <div className="mt-4">
          <Button variant="outline" onClick={() => setFormType("REDELIVERY")}>
            Add redelivery charge
          </Button>
        </div>
      )}

      {formType && (
        <div className="mt-4 space-y-4 rounded-lg border border-dashed p-4">
          <div>
            <strong>{deliveryName(formType)}</strong>
            <p className="text-sm text-muted-foreground">
              Enter the complete delivery address, including the correct ZIP
              code. It must be verified before a delivery charge can be created.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="delivery-street">Street</Label>
              <Input
                id="delivery-street"
                value={address.street}
                autoComplete="street-address"
                onChange={(event) =>
                  setAddress((current) => ({
                    ...current,
                    street: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="delivery-city">City</Label>
              <Input
                id="delivery-city"
                value={address.city}
                autoComplete="address-level2"
                onChange={(event) =>
                  setAddress((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <div>
                <Label htmlFor="delivery-state">State</Label>
                <Input
                  id="delivery-state"
                  value={address.state}
                  maxLength={2}
                  autoComplete="address-level1"
                  onChange={(event) =>
                    setAddress((current) => ({
                      ...current,
                      state: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="delivery-zip">ZIP code</Label>
                <Input
                  id="delivery-zip"
                  value={address.postalCode}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="12345 or 12345-6789"
                  onChange={(event) =>
                    setAddress((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {formType !== "STANDARD" && (
            <div>
              <Label htmlFor="delivery-internal-reason">
                Internal reason (required)
              </Label>
              <Textarea
                id="delivery-internal-reason"
                value={internalReason}
                maxLength={1000}
                onChange={(event) => setInternalReason(event.target.value)}
                placeholder="Company-only explanation; the customer will not see it"
              />
            </div>
          )}

          {isAdmin && (
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={taxable}
                onCheckedChange={(checked) => setTaxable(Boolean(checked))}
                className="mt-0.5"
              />
              <span>
                <strong className="block">Apply sales tax</strong>
                Leave this off when the separately stated delivery charge is
                treated as non-taxable.
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setFormType(null);
                setInternalReason("");
                setTaxable(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void calculateDelivery()}>
              <MapPin className="h-4 w-4" /> Verify address &amp; create charge
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {deliveries.map((delivery) => {
          const activeCheckout = Boolean(
            delivery.payment?.status === "PENDING" &&
              delivery.payment.stripeSessionId,
          );
          const canReplaceWithPickup =
            canChoose &&
            !installationActive &&
            delivery.type === "STANDARD" &&
            delivery.status === "PAYMENT_DUE" &&
            !delivery.paidAt &&
            delivery.payment?.status !== "PAID" &&
            delivery.payment?.status !== "REFUNDED" &&
            !activeCheckout;
          const cardBreakdown = getCardPaymentBreakdown({
            baseAmount: Number(delivery.total),
            surchargeFraction: cardSurchargeFraction,
            payment: delivery.payment,
          });

          return (
            <div key={delivery.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {deliveryName(delivery.type)} #{delivery.sequence}
                </strong>
                <Badge
                  variant={
                    delivery.status === "COMPLETED" ? "default" : "secondary"
                  }
                >
                  {titleCase(delivery.status)}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">Destination</div>
                  <div className="font-medium">
                    {delivery.destinationStreet}, {delivery.destinationCity},{" "}
                    {delivery.destinationState} {delivery.destinationPostalCode}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Road distance</div>
                  <div className="font-medium">
                    {Number(delivery.roadMiles).toFixed(2)} one-way miles
                  </div>
                </div>
              </div>

              <div className="ml-auto mt-3 max-w-lg space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <span>
                    Base price · first {Number(delivery.includedMilesSnapshot)}{" "}
                    miles
                  </span>
                  <span>{formatMoney(Number(delivery.basePriceSnapshot))}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>
                    Additional miles ·{" "}
                    {Number(delivery.additionalMiles).toFixed(2)} ×{" "}
                    {formatMoney(Number(delivery.additionalMilePriceSnapshot))}
                  </span>
                  <span>
                    {formatMoney(
                      Number(delivery.additionalMiles) *
                        Number(delivery.additionalMilePriceSnapshot),
                    )}
                  </span>
                </div>
                {Number(delivery.tollAmount) > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>Tolls</span>
                    <span>{formatMoney(Number(delivery.tollAmount))}</span>
                  </div>
                )}
                {Number(delivery.taxAmount) > 0 && (
                  <div className="flex justify-between gap-3">
                    <span>Sales Tax</span>
                    <span>{formatMoney(Number(delivery.taxAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
                  <span>Delivery total</span>
                  <span>{formatMoney(Number(delivery.total))}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Additional mileage is prorated using the measured one-way road
                  distance. Return mileage is not charged automatically.
                </p>
              </div>

              {isAdmin && delivery.internalReason && (
                <p className="mt-3 rounded-md bg-slate-50 p-2 text-xs">
                  <strong>Internal reason:</strong> {delivery.internalReason}
                </p>
              )}

              {delivery.scheduledFor && (
                <p className="mt-3 text-sm">
                  <CalendarDays className="mr-1 inline h-4 w-4" /> Scheduled for{" "}
                  <strong>{displayDateTime(delivery.scheduledFor)}</strong>
                </p>
              )}

              {isOwner &&
                order.dealerModeSnapshot !== "INTERNAL" &&
                delivery.status === "PAYMENT_DUE" && (
                  <div className="mt-4 space-y-2">
                    <div className="ml-auto max-w-md rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3 font-semibold">
                        <span>Card charge total</span>
                        <span>{formatMoney(cardBreakdown.totalAmount)}</span>
                      </div>
                      <CardFeeBreakdown
                        breakdown={cardBreakdown}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={busy}
                      onClick={() => void payDelivery(delivery)}
                    >
                      <CreditCard className="h-4 w-4" />{" "}
                      {activeCheckout
                        ? "Resume delivery payment"
                        : "Pay delivery"}
                      {" · "}
                      {formatMoney(cardBreakdown.totalAmount)}
                    </Button>
                  </div>
                )}

              {isOwner &&
                order.dealerModeSnapshot === "INTERNAL" &&
                delivery.status === "PAYMENT_DUE" && (
                  <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <p>Send the payment link to the final customer.</p>
                    <EstimatePaymentLinkActions
                      estimateId={order.idEst}
                      estimateNumber={order.estimate.number}
                      showShare
                      size="sm"
                    />
                  </div>
                )}

              {activeCheckout && delivery.status === "PAYMENT_DUE" && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <strong className="block">Payment checkout is active</strong>
                  <p className="mt-1">
                    Cancel this payment attempt before changing the order to
                    free customer pickup. Returning to this page alone does not
                    cancel Stripe checkout.
                  </p>
                  {isOwner && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      disabled={busy}
                      onClick={() => void cancelDeliveryPayment(delivery)}
                    >
                      <XCircle className="h-4 w-4" /> Cancel payment attempt
                    </Button>
                  )}
                </div>
              )}

              {canReplaceWithPickup && (
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void choosePickup()}
                  >
                    <Store className="h-4 w-4" /> Change to free pickup
                  </Button>
                </div>
              )}

              {canRecordManualPayment && delivery.status === "PAYMENT_DUE" && (
                <div className="mt-4 flex justify-end">
                  <ManualPaymentDialog
                    estimateId={order.idEst}
                    type="DELIVERY"
                    sequence={delivery.sequence}
                    amount={Number(delivery.total)}
                    label="Record delivery payment"
                    onRecorded={(payment) => {
                      replaceDelivery({
                        ...delivery,
                        status: "READY_TO_SCHEDULE",
                        paidAt: payment.paidAt ?? new Date().toISOString(),
                        payment,
                      });
                      router.refresh();
                    }}
                  />
                </div>
              )}

              {isPrivileged &&
                delivery.type !== "INSTALLATION_OVERRIDE" &&
                ["READY_TO_SCHEDULE", "SCHEDULED"].includes(
                  delivery.status,
                ) && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-64 flex-1">
                        <Label htmlFor={`delivery-date-${delivery.id}`}>
                          Delivery date and time
                        </Label>
                        <Input
                          id={`delivery-date-${delivery.id}`}
                          type="datetime-local"
                          value={scheduledFor[delivery.id] ?? ""}
                          onChange={(event) =>
                            setScheduledFor((current) => ({
                              ...current,
                              [delivery.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void schedule(delivery)}
                      >
                        Schedule
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => void complete(delivery)}
                      >
                        Complete delivery
                      </Button>
                    </div>
                  </div>
                )}

              {delivery.type === "INSTALLATION_OVERRIDE" &&
                delivery.status === "READY_TO_SCHEDULE" && (
                  <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    Paid. This delivery uses the accepted installation
                    appointment and completes automatically when installation
                    starts.
                  </p>
                )}
            </div>
          );
        })}
      </div>

      {!ready && deliveries.length === 0 && !installationActive && (
        <p className="mt-4 text-sm text-muted-foreground">
          Pickup or delivery becomes available when production marks this order
          Ready to pick up.
        </p>
      )}
    </section>
  );
}
