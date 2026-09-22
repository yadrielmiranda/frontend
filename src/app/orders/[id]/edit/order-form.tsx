"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  OrderWithRelations,
  OrderStatus,
  UpdateOrderData,
} from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import { updateOrder } from "@/app/api/orders.api";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

export function OrderForm({
  order,
  statuses,
  isAdmin,
}: {
  order: OrderWithRelations;
  statuses: OrderStatus[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<UpdateOrderData | null>(null);
  const selectableStatuses = useMemo(() => {
    const releaseCovered = order.paymentSchedule?.canRelease ?? true;
    let nextStatus: string | null = null;

    if (order.status.name === "Pending") nextStatus = "In production";
    if (order.status.name === "In production") {
      nextStatus = releaseCovered ? "Preparing for pickup" : "Awaiting release";
    }
    if (order.status.name === "Awaiting release" && releaseCovered) {
      nextStatus = "Preparing for pickup";
    }
    if (
      order.status.name === "Preparing for pickup" &&
      ["CUSTOMER_PICKUP", "FACTORY_PICKUP"].includes(order.fulfillmentMethod)
    ) {
      nextStatus = "Ready to pick up";
    }

    const currentStatus = statuses.find((status) => status.id === order.statusId);
    const followingStatus = nextStatus
      ? statuses.find((status) => status.name === nextStatus)
      : null;
    return [currentStatus, followingStatus].filter(
      (status): status is OrderStatus => Boolean(status),
    );
  }, [
    order.fulfillmentMethod,
    order.paymentSchedule?.canRelease,
    order.status.name,
    order.statusId,
    statuses,
  ]);
  const {
    control,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<UpdateOrderData>({ defaultValues: { statusId: order.statusId } });

  async function confirmSave() {
    if (!pending) return;
    try {
      await updateOrder(order.id, pending);
      toast.success("Order updated successfully!");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit((data) =>
          setPending({ statusId: data.statusId }),
        )}
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="statusId">Order Status</Label>
          <Controller
            name="statusId"
            control={control}
            rules={{
              required: true,
              validate: (value) =>
                value === order.statusId ||
                Boolean(order.poNumber?.trim()) ||
                "An administrator must import the factory order before moving it out of Pending.",
            }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? "")}
              >
                <SelectTrigger id="statusId">
                  <SelectValue placeholder="Select a status..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableStatuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.statusId && (
            <p role="alert" className="text-sm text-destructive">
              {errors.statusId.message}
            </p>
          )}
        </div>
        <div className="space-y-3 rounded-lg border bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Factory PO</span>
            <span className="font-medium">
              {order.poNumber || "Pending import"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Real factory cost</span>
            <span className="font-medium">
              {order.rateReal == null ? "—" : formatMoney(order.rateReal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            The factory PO and cost are loaded from the factory JSON by an
            administrator.
          </p>
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/orders/${order.id}/factory-import`}>
                Import factory order
              </Link>
            </Button>
          )}
        </div>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </form>
      <ConfirmActionDialog
        isOpen={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={confirmSave}
        title="Save changes?"
        description="You’re about to update this order. Please confirm to continue."
        confirmText="Yes, save"
        cancelText="Cancel"
      />
    </>
  );
}
