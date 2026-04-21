"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPreparationOption,
  updatePreparationOption,
} from "@/app/api/preparation-options.api";
import type { PreparationOption } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FormData = {
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export function PreparationOptionForm({
  preparationOption,
}: {
  preparationOption?: PreparationOption;
}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: preparationOption?.name || "",
      isActive: preparationOption?.isActive ?? true,
      sortOrder: preparationOption?.sortOrder ?? 0,
    },
  });

  const isActive = watch("isActive");

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        name: data.name,
        isActive: data.isActive,
        sortOrder: Number(data.sortOrder) || 0,
      };

      if (isEdit) {
        await updatePreparationOption(Number(params.id), payload);
        toast.success("Preparation option updated successfully.");
      } else {
        await createPreparationOption(payload);
        toast.success("Preparation option created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/preparation-options");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
      console.error(error);
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter option name"
            autoComplete="off"
            {...register("name", { required: "Name is required." })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            {...register("sortOrder", {
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Sort Order cannot be negative.",
              },
            })}
          />
          {errors.sortOrder && (
            <p className="text-sm text-destructive">
              {errors.sortOrder.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Active</Label>
            <p className="text-sm text-muted-foreground">
              Enable or disable this option.
            </p>
          </div>

          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) =>
              setValue("isActive", checked, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>

          <Button type="submit" disabled={!isDirty || showLoadingState}>
            {showLoadingState && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showLoadingState
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Create Preparation Option"}
          </Button>
        </div>
      </div>
    </form>
  );
}