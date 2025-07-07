"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
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
import { createSystem, updateSystem } from "@/app/api/systems.api";
import { getBrandWithProducts } from "@/app/api/brands.api";
import { Loader2 } from "lucide-react";
import { Brand, Product } from "@/app/api/types";

type FormValues = {
  name: string;
  idBrand: string;
  idProduct: string;
};

interface SystemFormProps {
  system?: FormValues & { id: number };
  brands: Brand[];
}

export function SystemForm({ system, brands }: SystemFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: system?.name || "",
      idBrand: system ? String(system.idBrand) : "",
      idProduct: system ? String(system.idProduct) : "",
    },
  });

  const watchedBrandId = watch("idBrand");

  useEffect(() => {
    const fetchProductsForBrand = async () => {
      if (!watchedBrandId) {
        setAvailableProducts([]);
        return;
      }
      setIsProductLoading(true);
      try {
        const brandWithProducts = await getBrandWithProducts(
          Number(watchedBrandId)
        );
        const products = brandWithProducts.brandProducts.map(
          (bp: any) => bp.product
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
    if (!system || (system && String(system.idBrand) !== watchedBrandId)) {
      setValue("idProduct", "", { shouldDirty: true });
    }
  }, [watchedBrandId, setValue, system]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const systemData = {
      name: data.name,
      idBrand: Number(data.idBrand),
      idProduct: Number(data.idProduct),
    };

    try {
      if (params.id) {
        await updateSystem(Number(params.id), systemData);
        toast.success("System updated successfully.");
      } else {
        await createSystem(systemData);
        toast.success("System created successfully.");
      }
      setIsSuccess(true);
      router.push("/settings/systems");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save the system.");
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">System Name</Label>
        <Input
          id="name"
          placeholder="e.g., Sliding Series 100"
          {...register("name", {
            required: "The system name is required",
          })}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        <Controller
          name="idBrand"
          control={control}
          rules={{ required: "You must select a brand" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          <p className="text-sm text-red-500 mt-1">{errors.idBrand.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "You must select a product" }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!watchedBrandId || isProductLoading}
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
          <p className="text-sm text-red-500 mt-1">
            {errors.idProduct.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={showLoadingState || isProductLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={params.id ? "blue" : "green"}
          disabled={!isDirty || showLoadingState || isProductLoading}
        >
          {(showLoadingState || isProductLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {showLoadingState ? "Saving..." : (params.id ? "Update" : "Create")}
        </Button>
      </div>
    </form>
  );
}
