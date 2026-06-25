"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createConfigCategory,
  updateConfigCategory,
} from "@/app/api/config-categories.api";
import type { ConfigCategory, Product } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = {
  name: string;
  idProduct: string;
  sortOrder: string;
  isActive: boolean;
};

export function ConfigCategoryForm({
  category,
  products,
}: {
  category?: ConfigCategory;
  products: Product[];
}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: category?.name ?? "",
      idProduct: category ? String(category.idProduct) : "",
      sortOrder: String(category?.sortOrder ?? 0),
      isActive: category?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit && category?.id) {
        await updateConfigCategory(category.id, {
          name: data.name.trim(),
          sortOrder: Number(data.sortOrder || 0),
          isActive: Boolean(data.isActive),
        });

        toast.success("Config category updated successfully.");
      } else {
        await createConfigCategory({
          name: data.name.trim(),
          idProduct: Number(data.idProduct),
          sortOrder: Number(data.sortOrder || 0),
          isActive: true,
        });

        toast.success("Config category created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/config-categories");
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
          <Label htmlFor="name">Category Name</Label>
          <Input
            id="name"
            placeholder="e.g., 2 Track, 3 Track, Pocket Door"
            autoComplete="off"
            {...register("name", { required: "Category name is required." })}
          />

          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="product">Product</Label>

          <Controller
            name="idProduct"
            control={control}
            rules={{ required: "You must select a product." }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEdit}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>

                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Product cannot be changed after creation.
            </p>
          )}

          {errors.idProduct && (
            <p className="text-sm text-destructive">
              {errors.idProduct.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            {...register("sortOrder")}
          />
        </div>

        {isEdit && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                  id="isActive"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            )}
          />
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
                : "Create Category"}
          </Button>
        </div>
      </div>
    </form>
  );
}
