"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { createSystem, updateSystem } from "@/app/api/systems.api";
import { getBrandWithProducts } from "@/app/api/brands.api";
import type { Brand, Product, System } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = {
  name: string;
  idBrand: string;
  idProduct: string;
  isActive: boolean;
  allowHighBottom: boolean;
};

interface SystemFormProps {
  brands: Brand[];
  system?: System; // Si se pasa el sistema, el formulario se comporta como edit. Si no, como creación.
}

export function SystemForm({ brands, system }: SystemFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params?.id);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: system?.name ?? "",
      idBrand: system?.idBrand ? String(system.idBrand) : "",
      idProduct: system?.idProduct ? String(system.idProduct) : "",
      isActive: system?.isActive ?? true,
      allowHighBottom: system?.allowHighBottom ?? false,
    },
  });

  const watchedBrandId = watch("idBrand");
  const showLoadingState = isSubmitting || isSuccess;

  // Comentario en español: cacheamos el brand inicial para decidir cuándo resetear product
  const initialBrandId = useMemo(
    () => (system?.idBrand ? String(system.idBrand) : ""),
    [system?.idBrand],
  );

  useEffect(() => {
    const fetchProductsForBrand = async () => {
      if (!watchedBrandId) {
        setAvailableProducts([]);
        return;
      }

      setIsProductLoading(true);
      try {
        const brandWithProducts = await getBrandWithProducts(
          Number(watchedBrandId),
        );

        const products = brandWithProducts.brandProducts.map(
          (bp: any) => bp.product,
        );
        setAvailableProducts(products);
      } catch (err) {
        console.error("Error fetching products for brand:", err);
        setAvailableProducts([]);
      } finally {
        setIsProductLoading(false);
      }
    };

    fetchProductsForBrand();

    // Comentario en español: si cambió la marca (respecto a la inicial), reseteamos el producto
    if (watchedBrandId && watchedBrandId !== initialBrandId) {
      setValue("idProduct", "", { shouldDirty: true });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBrandId]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      name: data.name.trim(),
      idBrand: Number(data.idBrand),
      idProduct: Number(data.idProduct),
      allowHighBottom: Boolean(data.allowHighBottom),
      ...(isEdit ? { isActive: Boolean(data.isActive) } : {}),
    };

    try {
      if (isEdit) {
        await updateSystem(Number(params.id), payload);
        toast.success("System updated successfully.");
      } else {
        await createSystem(payload);
        toast.success("System created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/systems");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
      console.error(error);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name */}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="name">System Name</Label>
        <Input
          id="name"
          placeholder="e.g. Sliding Series 100"
          autoComplete="off"
          disabled={showLoadingState}
          {...register("name", { required: "System name is required." })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Brand */}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="brand">Brand</Label>
        <Controller
          name="idBrand"
          control={control}
          rules={{ required: "Brand is required." }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={showLoadingState}
            >
              <SelectTrigger id="brand">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.idBrand && (
          <p className="text-sm text-destructive">{errors.idBrand.message}</p>
        )}
      </div>

      {/* Product */}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="product">Product</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "Product is required." }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={showLoadingState || !watchedBrandId || isProductLoading}
            >
              <SelectTrigger id="product">
                <SelectValue
                  placeholder={
                    isProductLoading
                      ? "Loading..."
                      : watchedBrandId
                        ? "Select a product"
                        : "First select a brand"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.idProduct && (
          <p className="text-sm text-destructive">{errors.idProduct.message}</p>
        )}
      </div>

      <Controller
        name="allowHighBottom"
        control={control}
        render={({ field }) => (
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={showLoadingState}
            />

            <span className="space-y-0.5">
              <span className="block font-medium">Allow High Bottom</span>
              <span className="block text-xs text-muted-foreground">
                Enables the High Bottom option for all configurations in this
                system.
              </span>
            </span>
          </label>
        )}
      />

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

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={!isDirty || showLoadingState || isProductLoading}
        >
          {(showLoadingState || isProductLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {showLoadingState
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create System"}
        </Button>
      </div>
    </form>
  );
}
