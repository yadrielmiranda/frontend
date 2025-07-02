"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/api/products.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Product } from "@/app/api/products.api";

type FormData = Omit<Product, 'id'>;

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: product?.name || "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (params.id) {
        await updateProduct(Number(params.id), data);
      } else {
        await createProduct(data);
      }
      setIsSuccess(true);
      router.push("/settings/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter product name"
            {...register("name", {
              required: "The product name is required",
            })}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!isDirty || showLoadingState}
          >
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : (params.id ? "Update" : "Create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
