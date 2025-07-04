"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
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
import { createConfig, updateConfig } from "@/app/api/configs.api";
import { Loader2 } from "lucide-react";

type Product = { id: number; name: string };

// Nuevo tipo para los valores del formulario
type FormValues = {
  conf: string;
  idProduct: string;
};

interface ConfigFormProps {
  config?: FormValues & { id: number }; // Para el modo de edición
  products: Product[];
}

export function ConfigForm({ config, products }: ConfigFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      conf: config?.conf || "",
      idProduct: config ? String(config.idProduct) : "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const configData = {
        conf: data.conf,
        idProduct: Number(data.idProduct),
      };

      if (params.id) {
        await updateConfig(Number(params.id), configData);
      } else {
        await createConfig(configData);
      }
      router.push("/settings/configs");
    } catch (err: any) {
      console.error("Error al guardar la configuración:", err);
      // Aquí podrías usar toast.error() como vimos antes
      alert("Error al guardar la configuración.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="conf">Nombre de la Configuración</Label>
        <Input
          id="conf"
          placeholder="Ej: Standard, Premium, etc."
          {...register("conf", {
            required: "El nombre de la configuración es obligatorio",
          })}
        />
        {errors.conf && (
          <p className="text-sm text-red-500 mt-1">{errors.conf.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product">Producto</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "Debes seleccionar un producto" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecciona un producto" />
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
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={params.id ? "blue" : "green"}
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Guardando..." : params.id ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
