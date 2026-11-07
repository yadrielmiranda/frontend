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
  sortOrder: string;
  idBrand: string;
  idProduct: string;
  isActive: boolean;
  isDefault: boolean;
  allowHighBottom: boolean;
  allowDesign: boolean;
};

interface SystemFormProps {
  brands: Brand[];
  system?: System;
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
      sortOrder: system?.sortOrder == null ? "" : String(system.sortOrder),
      idBrand: system?.idBrand ? String(system.idBrand) : "",
      idProduct: system?.idProduct ? String(system.idProduct) : "",
      isActive: system?.isActive ?? true,
      isDefault: system?.isDefault ?? false,
      allowHighBottom: system?.allowHighBottom ?? false,
      allowDesign: system?.allowDesign ?? false,
    },
  });

  const watchedBrandId = watch("idBrand");
  const watchedProductId = watch("idProduct");
  const watchedAllowHighBottom = watch("allowHighBottom");

  const showLoadingState = isSubmitting || isSuccess;

  const selectedProduct = useMemo(() => {
    const productId = Number(watchedProductId);
    if (!productId) return null;

    return (
      availableProducts.find((product) => product.id === productId) ??
      (system?.idProduct === productId ? system.brandProduct?.product : null) ??
      null
    );
  }, [
    availableProducts,
    watchedProductId,
    system?.idProduct,
    system?.brandProduct?.product,
  ]);

  const isLinearMaterial = selectedProduct?.kind === "LINEAR_MATERIAL";
  const isFrenchDoor = selectedProduct?.kind === "GLAZED_UNIT" && selectedProduct.diagramFamily === "FRENCH_DOOR";

  useEffect(() => {
    let current = true;
    const fetchProductsForBrand = async () => {
      if (!watchedBrandId) {
        setAvailableProducts([]);
        setIsProductLoading(false);
        return;
      }

      setIsProductLoading(true);

      try {
        const brandWithProducts = await getBrandWithProducts(
          Number(watchedBrandId),
        );

        if (current) setAvailableProducts(brandWithProducts.brandProducts.map(item => item.product));
      } catch (err) {
        if (!current) return;
        console.error("Error fetching products for brand:", err);
        setAvailableProducts([]);
      } finally {
        if (current) setIsProductLoading(false);
      }
    };

    fetchProductsForBrand();

    return () => { current = false; };
  }, [watchedBrandId]);

  useEffect(() => {
    if (isLinearMaterial && watchedAllowHighBottom) {
      setValue("allowHighBottom", false, { shouldDirty: true });
    }
  }, [isLinearMaterial, watchedAllowHighBottom, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      name: data.name.trim(),
      ...(data.sortOrder === "" ? {} : { sortOrder: Number(data.sortOrder) }),
      idBrand: Number(data.idBrand),
      idProduct: Number(data.idProduct),
      isDefault: system?.isDefault === true ? true : data.isDefault,
      allowHighBottom: isLinearMaterial ? false : Boolean(data.allowHighBottom),
      ...(isFrenchDoor ? { allowDesign: data.allowDesign } : {}),
      ...(isEdit
        ? {
            isActive:
              system?.isDefault === true ? true : Boolean(data.isActive),
          }
        : {}),
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
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="name">System Name</Label>
        <Input
          id="name"
          placeholder="e.g. Sliding Series 100"
          autoComplete="off"
          disabled={showLoadingState}
          {...register("name", {
            required: "System name is required.",
            validate: (value) =>
              value.trim().length > 0 || "System name is required.",
          })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="sortOrder">Order</Label>
        <Input
          id="sortOrder"
          type="number"
          min="0"
          step="1"
          placeholder="Automatic"
          autoComplete="off"
          disabled={showLoadingState}
          {...register("sortOrder", {
            validate: (value) =>
              value === "" ||
              (/^\d+$/.test(value) && Number(value) >= 0) ||
              "Order must be a whole number of zero or greater.",
          })}
        />
        <p className="text-xs text-muted-foreground">
          Applied within the selected Brand and Product. Leave blank on creation
          to place it last.
        </p>
        {errors.sortOrder && (
          <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
        )}
      </div>

      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="brand">Brand</Label>
        <Controller
          name="idBrand"
          control={control}
          rules={{ required: "Brand is required." }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={value => {
                if (field.value === value) return;
                setValue("idProduct", "", { shouldDirty: true });
                setValue("allowDesign", false, { shouldDirty: true });
                field.onChange(value);
              }}
              disabled={showLoadingState || system?.isDefault === true}
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

      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="product">Product</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "Product is required." }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={value => {
                if (field.value !== value) setValue("allowDesign", false, { shouldDirty: true });
                field.onChange(value);
              }}
              disabled={
                showLoadingState ||
                system?.isDefault === true ||
                !watchedBrandId ||
                isProductLoading
              }
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

        {isLinearMaterial && (
          <p className="text-xs text-muted-foreground">
            Linear Material systems do not support High Bottom.
          </p>
        )}
      </div>

      <Controller
        name="isDefault"
        control={control}
        render={({ field }) => (
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={showLoadingState || system?.isDefault === true}
            />

            <span className="space-y-0.5">
              <span className="block font-medium">Default System</span>
              <span className="block text-xs text-muted-foreground">
                {system?.isDefault
                  ? "This is the current default for its Product and Brand. Set another System as default to replace it."
                  : "Selects this System automatically for the chosen Product and Brand."}
              </span>
            </span>
          </label>
        )}
      />

      {!isLinearMaterial && (
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
      )}

      {isFrenchDoor && (
        <Controller
          name="allowDesign"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <Checkbox id="allowDesign" checked={field.value} disabled={showLoadingState}
                onCheckedChange={checked => field.onChange(checked === true)} />
              <span className="space-y-0.5">
                <span className="block font-medium">Allow Door Designs</span>
                <span className="block text-xs text-muted-foreground">
                  Offer priced catalog designs on single and double doors in this series.
                </span>
              </span>
            </label>
          )}
        />
      )}

      {isEdit && (
        <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            disabled={showLoadingState || system?.isDefault === true}
            {...register("isActive")}
          />
          <span>Active</span>
        </label>
      )}

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
