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
};

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
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Creamos o actualizamos según si estamos en modo edición
      if (isEdit) {
        await updateBrand(Number(params.id), data);
        toast.success("Brand updated successfully.");
      } else {
        await createBrand(data);
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
