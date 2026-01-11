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

type FormData = { color: string };

export function TintForm({ tint }: { tint?: Tint }) {
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
      color: tint?.color || "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        await updateTint(Number(params.id), data);
        toast.success("Tint updated successfully.");
      } else {
        await createTint(data);
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
