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

// Tipos de datos
type Product = { id: number; name: string };
type Brand = { id: number; name: string };

// Define la forma de los datos del formulario
type FormValues = {
  name: string;
  idBrand: string;
  idProduct: string;
};

interface SystemFormProps {
  system?: FormValues & { id: number }; // Para el modo edición
  brands: Brand[];
}

export function SystemForm({ system, brands }: SystemFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);

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
        console.error("Error al obtener productos para la marca:", err);
        setAvailableProducts([]);
      } finally {
        setIsProductLoading(false);
      }
    };

    fetchProductsForBrand();
    if (!system || (system && system.idBrand !== watchedBrandId)) {
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
      router.push("/settings/systems");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save the system.");
    }
  };

  const showLoadingState = isSubmitting || isProductLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Sistema</Label>
        <Input
          id="name"
          placeholder="Ej: Corrediza Serie 100"
          {...register("name", {
            required: "El nombre del sistema es obligatorio",
          })}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand">Marca</Label>
        <Controller
          name="idBrand"
          control={control}
          rules={{ required: "Debes seleccionar una marca" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="brand">
                <SelectValue placeholder="Selecciona una marca" />
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
        <Label htmlFor="product">Producto</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "Debes seleccionar un producto" }}
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
                      ? "Cargando..."
                      : watchedBrandId
                      ? "Selecciona un producto"
                      : "Primero selecciona una marca"
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
          disabled={showLoadingState}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={params.id ? "blue" : "green"}
          disabled={!isDirty || showLoadingState}
        >
          {showLoadingState && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isSubmitting ? "Guardando..." : params.id ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
