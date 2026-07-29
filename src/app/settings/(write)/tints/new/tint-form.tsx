"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createTint, updateTint } from "@/app/api/tints.api";
import type { Tint } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  color: string;
  hexCode: string;
  isActive: boolean;
};

export function TintForm({ tint }: { tint?: Tint }) {
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
      color: tint?.color || "",
      hexCode: tint?.hexCode ?? "#F7FBFF",
      isActive: tint?.isActive ?? true,
    },
  });

  const hexCode = watch("hexCode");

  const pickerHex = /^#[0-9A-Fa-f]{6}$/.test(hexCode ?? "")
    ? hexCode.toLowerCase()
    : "#f7fbff";

  const onSubmit = handleSubmit(async (data) => {
    try {
      const normalizedData = {
        color: data.color.trim(),
        hexCode: data.hexCode.trim().toUpperCase(),
      };

      if (isEdit) {
        await updateTint(Number(params.id), {
          ...normalizedData,
          isActive: data.isActive,
        });

        toast.success("Tint updated successfully.");
      } else {
        await createTint(normalizedData);
        toast.success("Tint created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/tints");
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
          <Label htmlFor="hexCode">Glass Tone</Label>

          <div className="flex gap-3">
            <Input
              type="color"
              aria-label="Choose glass tone"
              className="h-10 w-16 cursor-pointer p-1"
              value={pickerHex}
              onChange={(event) =>
                setValue("hexCode", event.target.value.toUpperCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />

            <Input
              id="hexCode"
              placeholder="#F7FBFF"
              maxLength={7}
              autoComplete="off"
              {...register("hexCode", {
                required: "Glass tone is required.",
                pattern: {
                  value: /^#[0-9A-Fa-f]{6}$/,
                  message: "Use the format #RRGGBB.",
                },
              })}
            />
          </div>

          {errors.hexCode && (
            <p className="text-sm text-destructive">{errors.hexCode.message}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="Enter tint color"
            autoComplete="off"
            {...register("color", { required: "Tint color is required." })}
          />

          {errors.color && (
            <p className="text-sm text-destructive">{errors.color.message}</p>
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
                : "Create Tint"}
          </Button>
        </div>
      </div>
    </form>
  );
}
