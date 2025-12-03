"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Importar Checkbox
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createConfig, updateConfig } from "@/app/api/configs.api";
import { Loader2 } from "lucide-react";
import { Product } from "@/app/api/types";
import { useState } from "react";
import { toast } from "sonner";

// --- Tipo base para Config con las flags ---
interface ConfigBase {
    id?: number;
    conf: string;
    idProduct: number; // Mantenido como número aquí
    requiresWidth?: boolean;
    requiresHeight?: boolean;
    requiresHeightLeft?: boolean;
    requiresHeightRight?: boolean;
    requiresLegHeight?: boolean;
}

// Tipo para los valores del formulario (idProduct como string para el Select)
type FormValues = Omit<ConfigBase, 'id' | 'idProduct'> & {
    idProduct: string;
};


interface ConfigFormProps {
  config?: ConfigBase; // Recibe el tipo con flags
  products: Product[];
}

export function ConfigForm({ config, products }: ConfigFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      conf: config?.conf || "",
      idProduct: config ? String(config.idProduct) : "", // Convertir a string para Select
      // Valores por defecto para los checkboxes
      requiresWidth: config?.requiresWidth ?? false,
      requiresHeight: config?.requiresHeight ?? false,
      requiresHeightLeft: config?.requiresHeightLeft ?? false,
      requiresHeightRight: config?.requiresHeightRight ?? false,
      requiresLegHeight: config?.requiresLegHeight ?? false,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      // Convertir idProduct de nuevo a número antes de enviar
      const configData = {
        ...data,
        idProduct: Number(data.idProduct),
      };

      if (params.id && config?.id) { // Asegurarse que config.id existe para editar
        await updateConfig(config.id, configData);
        toast.success("Configuration updated successfully!");
      } else {
        await createConfig(configData);
        toast.success("Configuration created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/configs");
      router.refresh(); // Añadir refresh para asegurar que la tabla se actualice
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration.");
      console.error("Error saving configuration:", err);
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="conf">Configuration Name</Label>
        <Input
          id="conf"
          placeholder="e.g., XO, Picture, Eyebrow Fixed"
          {...register("conf", {
            required: "The configuration name is required",
          })}
        />
        {errors.conf && (
          <p className="text-sm text-red-500 mt-1">{errors.conf.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "You must select a product" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
        {errors.idProduct && (
          <p className="text-sm text-red-500 mt-1">
            {errors.idProduct.message}
          </p>
        )}
      </div>

      {/* --- NUEVA SECCIÓN DE CHECKBOXES --- */}
      <div className="space-y-4 rounded-md border p-4">
          <Label className="text-base font-medium">Required Dimensions</Label>
          <p className="text-sm text-muted-foreground">
              Select the dimensions needed to calculate the price for this specific configuration.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
              <Controller name="requiresWidth" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id="requiresWidth" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="requiresWidth">Width</Label></div>)} />
              <Controller name="requiresHeight" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id="requiresHeight" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="requiresHeight">Height</Label></div>)} />
              <Controller name="requiresHeightLeft" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id="requiresHeightLeft" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="requiresHeightLeft">Height Left</Label></div>)} />
              <Controller name="requiresHeightRight" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id="requiresHeightRight" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="requiresHeightRight">Height Right</Label></div>)} />
              <Controller name="requiresLegHeight" control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id="requiresLegHeight" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="requiresLegHeight">Leg Height</Label></div>)} />
              {/* Añade más checkboxes si definiste más campos booleanos en el schema */}
          </div>
      </div>
      {/* --- FIN NUEVA SECCIÓN --- */}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={showLoadingState}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={params.id ? "blue" : "green"}
          // Permitir guardar incluso si no se cambia nada (puede que solo se cambien checkboxes)
          disabled={showLoadingState}
          // disabled={!isDirty || showLoadingState} // Descomentar si prefieres requerir cambios
        >
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Saving..." : params.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}