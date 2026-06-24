"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createBrand, updateBrand } from "@/app/api/brands.api";
import type { Brand } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  name: string;
  isActive: boolean;
  highBottomPercent: string;
};

function normalizeHighBottomPercent(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("High Bottom % must be a valid number.");
  }

  if (parsed < 0) {
    throw new Error("High Bottom % cannot be negative.");
  }

  return parsed;
}

export function BrandForm({ brand }: { brand?: Brand }) {
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
      name: brand?.name || "",
      isActive: brand?.isActive ?? true,
      highBottomPercent:
        brand?.highBottomPercent == null
          ? ""
          : String(Number(brand.highBottomPercent)),
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const highBottomPercent = normalizeHighBottomPercent(
        data.highBottomPercent,
      );

      if (isEdit) {
        await updateBrand(Number(params.id), {
          name: data.name,
          isActive: data.isActive,
          highBottomPercent,
        });

        toast.success("Brand updated successfully.");
      } else {
        await createBrand({
          name: data.name,
          highBottomPercent,
        });

        toast.success("Brand created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/brands");
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
          <Label htmlFor="name">Brand Name</Label>
          <Input
            id="name"
            placeholder="Enter brand name"
            autoComplete="off"
            {...register("name", {
              required: "Brand name is required.",
            })}
          />

          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="highBottomPercent">High Bottom %</Label>
          <Input
            id="highBottomPercent"
            type="number"
            min="0"
            step="0.01"
            placeholder="Example: 8"
            autoComplete="off"
            {...register("highBottomPercent", {
              validate: (value) => {
                if (!value.trim()) return true;

                const parsed = Number(value);

                if (!Number.isFinite(parsed)) {
                  return "High Bottom % must be a valid number.";
                }

                if (parsed < 0) {
                  return "High Bottom % cannot be negative.";
                }

                return true;
              },
            })}
          />

          {errors.highBottomPercent ? (
            <p className="text-sm text-destructive">
              {errors.highBottomPercent.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Leave empty when this brand does not have a High Bottom surcharge.
            </p>
          )}
        </div>

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
                : "Create Brand"}
          </Button>
        </div>
      </div>
    </form>
  );
}
