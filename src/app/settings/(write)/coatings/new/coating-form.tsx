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
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        await updateCoating(Number(params.id), data);
        toast.success("Coating updated successfully.");
      } else {
        await createCoating(data);
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
