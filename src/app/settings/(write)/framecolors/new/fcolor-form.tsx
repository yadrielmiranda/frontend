"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createFColor, updateFColor } from "@/app/api/fcolors.api";
import type { FrameColor } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  color: string;
  isActive: boolean;
};

export function FcolorForm({ fcolor }: { fcolor?: FrameColor }) {
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
      color: fcolor?.color || "",
      isActive: fcolor?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        await updateFColor(Number(params.id), {
          color: data.color.trim(),
          isActive: data.isActive,
        });
        toast.success("Frame color updated successfully.");
      } else {
        await createFColor({
          color: data.color.trim(),
        });
        toast.success("Frame color created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/framecolors");
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
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="Enter color name"
            autoComplete="off"
            {...register("color", { required: "Color is required." })}
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
                : "Create Color"}
          </Button>
        </div>
      </div>
    </form>
  );
}
