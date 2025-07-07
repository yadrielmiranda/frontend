"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createBrand, updateBrand } from "@/app/api/brands.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/app/api/types";

type FormData = {
  name: string;
};

export function BrandForm({ brand }: { brand?: Brand }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

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
      if (params.id) {
        await updateBrand(Number(params.id), data);
        toast.success("Brand updated successfully!");
      } else {
        await createBrand(data);
        toast.success("Brand created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/brands");
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="name">Brand Name</Label>
          <Input
            id="name"
            placeholder="Enter brand name"
            {...register("name", {
              required: "The brand name is required",
            })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!isDirty || showLoadingState}
          >
            {showLoadingState && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showLoadingState
              ? "Saving..."
              : params.id
              ? "Update"
              : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
