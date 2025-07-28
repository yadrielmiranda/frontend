"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderWithRelations, OrderStatus, UpdateOrderData } from "@/app/api/types";
import { updateOrder } from "@/app/api/orders.api";

interface OrderFormProps {
  order: OrderWithRelations;
  statuses: OrderStatus[];
}

export function OrderForm({ order, statuses }: OrderFormProps) {
  const router = useRouter();
  const { control, handleSubmit, formState: { isSubmitting, isDirty } } = useForm<UpdateOrderData>({
    defaultValues: {
      statusId: order.statusId,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateOrder(order.id, data);
      toast.success("Order status updated successfully!");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label htmlFor="statusId">Order Status</Label>
        <Controller
          name="statusId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
              <SelectTrigger id="statusId">
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.id} value={String(status.id)}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Status
        </Button>
      </div>
    </form>
  );
}