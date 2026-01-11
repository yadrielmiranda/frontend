"use client";

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

interface OrderFormProps {
  order: OrderWithRelations;
  statuses: OrderStatus[];
}

export function OrderForm({ order, statuses }: OrderFormProps) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<UpdateOrderData>({
    defaultValues: {
      statusId: order.statusId,
      poNumber: order.poNumber ?? "",
      rateReal: order.rateReal ?? null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Normalización simple (para no mandar strings raros)
      const payload: UpdateOrderData = {
        statusId: data.statusId,
        poNumber:
          data.poNumber === undefined
            ? undefined
            : String(data.poNumber || "").trim() || null,
        rateReal: data.rateReal,
      };

      await updateOrder(order.id, payload);

      toast.success("Order updated successfully!");
      router.push("/orders");      
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  return (
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
                {statuses.map((status) => (
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
          {...register("poNumber")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional. Leave blank if you don&apos;t have it yet.
        </p>
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
          When you set Rate Real, Net Profit Real will be calculated
          automatically.
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
  );
}
