"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/api/products.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Product } from "@/app/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";

type FormData = { name: string };

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const { user } = useAuth();
  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: { name: product?.name || "" },
  });

  const showLoadingState = isSubmitting || isSuccess;

  const onSubmit = handleSubmit(async (data) => {
    if (!canEdit) return;

    try {
      if (params.id) {
        await updateProduct(Number(params.id), data);
        toast.success("Product updated successfully!");
      } else {
        await createProduct(data);
        toast.success("Product created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/products");
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter product name"
            disabled={!canEdit || showLoadingState}
            {...register("name", { required: "The product name is required" })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!canEdit || !isDirty || showLoadingState}
          >
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : params.id ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
