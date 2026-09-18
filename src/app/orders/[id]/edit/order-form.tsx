"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { updateOrder } from "@/app/api/orders.api";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

interface OrderFormProps {
  order: OrderWithRelations;
  statuses: OrderStatus[];
}

export function OrderForm({ order, statuses }: OrderFormProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateOrderData | null>(
    null,
  );
  const selectableStatuses = useMemo(() => {
    const nextByStatus: Record<string, string | null> = {
      Pending: "In production",
      "In production": "Ready to pick up",
      "Ready to pick up": null,
      "Picked up": null,
      Delivered: null,
      "Installation in progress": null,
      Installed: null,
    };
    const next = nextByStatus[order.status.name];
    return statuses.filter(
      (status) => status.id === order.statusId || status.name === next,
    );
  }, [order.status.name, order.statusId, statuses]);

  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<UpdateOrderData>({
    defaultValues: {
      statusId: order.statusId,
      poNumber: order.poNumber ?? "",
      rateReal: order.rateReal ?? null,
    },
  });

  // comentario en espanol: prepara payload y abre confirm dialog
  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: UpdateOrderData = {
        statusId: data.statusId,
        poNumber:
          data.poNumber === undefined
            ? undefined
            : String(data.poNumber || "").trim() || null,
        rateReal: data.rateReal,
      };

      setPendingPayload(payload);
      setShowConfirm(true);
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  // comentario en espanol: solo aqui realmente guardamos
  const confirmSave = async () => {
    if (!pendingPayload) {
      setShowConfirm(false);
      return;
    }

    try {
      await updateOrder(order.id, pendingPayload);
      toast.success("Order updated successfully!");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setShowConfirm(false);
      setPendingPayload(null);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Status */}
        <div>
          <Label htmlFor="statusId">Order Status</Label>
          <Controller
            name="statusId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select
                onValueChange={(v) => field.onChange(Number(v))}
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
        </div>

        {/* PO Number */}
        <div>
          <Label htmlFor="poNumber">PO Number (Factory)</Label>
          <Input
            id="poNumber"
            placeholder="e.g. PO-12345"
            autoComplete="off"
            maxLength={50}
            aria-invalid={Boolean(errors.poNumber)}
            aria-describedby="poNumber-help poNumber-error"
            {...register("poNumber", {
              validate: (value, values) => {
                if (value?.trim()) return true;
                const target = statuses.find((status) => status.id === values.statusId);
                if (values.statusId !== order.statusId && target && target.name !== "Pending") {
                  return `Enter the factory PO before moving the order to "${target.name}".`;
                }
                if (order.poNumber?.trim() && order.status.name !== "Pending") {
                  return "The factory PO cannot be removed after the order leaves Pending.";
                }
                if (Number(values.rateReal) > 0) {
                  return "Enter the factory PO before recording the real factory cost.";
                }
                return true;
              },
            })}
          />
          <p id="poNumber-help" className="text-xs text-muted-foreground mt-1">
            Required to move the order out of Pending or record the real factory cost.
          </p>
          {errors.poNumber && (
            <p id="poNumber-error" role="alert" className="mt-1 text-sm text-destructive">
              {errors.poNumber.message}
            </p>
          )}
        </div>

        {/* Rate Real */}
        <div>
          <Label htmlFor="rateReal">Rate Real (Factory Cost)</Label>
          <Controller
            name="rateReal"
            control={control}
            render={({ field }) => (
              <Input
                id="rateReal"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={
                  field.value === null || field.value === undefined
                    ? ""
                    : String(field.value)
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return field.onChange(null);
                  field.onChange(Number(raw));
                }}
              />
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Once entered, the real material profit is calculated automatically
            from this order&apos;s material sale subtotal. Installation profit
            is not included.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>

          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>

      <ConfirmActionDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setPendingPayload(null);
        }}
        onConfirm={confirmSave}
        title="Save changes?"
        description="You’re about to update this order. Please confirm to continue."
        confirmText="Yes, save"
        cancelText="Cancel"
      />
    </>
  );
}
