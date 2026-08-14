"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCoating, updateCoating } from "@/app/api/coatings.api";
import type { Coating } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  name: string;
  globalSortOrder: string;
  isActive: boolean;
  isGlobal: boolean;
};

export function CoatingForm({ coating }: { coating?: Coating }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: coating?.name || "",
      globalSortOrder:
        coating?.globalSortOrder == null ? "" : String(coating.globalSortOrder),
      isActive: coating?.isActive ?? true,
      isGlobal: coating?.isGlobal ?? false,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = isEdit
        ? {
            name: data.name.trim(),
            isActive: data.isActive,
            isGlobal: data.isGlobal,
            ...(data.globalSortOrder === ""
              ? {}
              : { globalSortOrder: Number(data.globalSortOrder) }),
          }
        : {
            name: data.name.trim(),
            isGlobal: data.isGlobal,
            ...(data.globalSortOrder === ""
              ? {}
              : { globalSortOrder: Number(data.globalSortOrder) }),
          };

      if (isEdit) {
        await updateCoating(Number(params.id), payload);
        toast.success("Coating updated successfully.");
      } else {
        await createCoating(payload);
        toast.success("Coating created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/coatings");
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
          <Label htmlFor="name">Coating Name</Label>
          <Input
            id="name"
            placeholder="Enter coating name"
            autoComplete="off"
            {...register("name", { required: "Coating name is required." })}
          />

          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="globalSortOrder">Global Order</Label>
          <Input
            id="globalSortOrder"
            type="number"
            min="0"
            step="1"
            placeholder="Automatic"
            autoComplete="off"
            {...register("globalSortOrder", {
              validate: (value) =>
                value === "" ||
                (/^\d+$/.test(value) && Number(value) >= 0) ||
                "Global Order must be a whole number of zero or greater.",
            })}
          />
          <p className="text-xs text-muted-foreground">
            Controls the Estimate-level default selector. Brand-specific order
            is configured under each Brand.
          </p>
          {errors.globalSortOrder && (
            <p className="text-sm text-destructive">
              {errors.globalSortOrder.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            {...register("isGlobal")}
          />
          <span>Global Estimate default option</span>
        </label>

        {isEdit && (
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("isActive")}
            />
            <span>Active</span>
          </label>
        )}

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
                : "Create Coating"}
          </Button>
        </div>
      </div>
    </form>
  );
}
