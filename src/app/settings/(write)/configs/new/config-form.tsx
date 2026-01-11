"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

import { createConfig, updateConfig } from "@/app/api/configs.api";
import type { Product } from "@/lib/types";

// --- Tipo base para Config con flags ---
interface ConfigBase {
  id?: number;
  conf: string;
  idProduct: number;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
}

// Valores del formulario (Select usa string)
type FormValues = Omit<ConfigBase, "id" | "idProduct"> & {
  idProduct: string;
};

interface ConfigFormProps {
  config?: ConfigBase;
  products: Product[];
}

export function ConfigForm({ config, products }: ConfigFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      conf: config?.conf || "",
      idProduct: config ? String(config.idProduct) : "",
      requiresWidth: config?.requiresWidth ?? false,
      requiresHeight: config?.requiresHeight ?? false,
      requiresHeightLeft: config?.requiresHeightLeft ?? false,
      requiresHeightRight: config?.requiresHeightRight ?? false,
      requiresLegHeight: config?.requiresLegHeight ?? false,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const payload = {
        ...data,
        idProduct: Number(data.idProduct),
      };

      if (isEdit && config?.id) {
        await updateConfig(config.id, payload);
        toast.success("Config updated successfully.");
      } else {
        await createConfig(payload);
        toast.success("Config created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/configs");      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      console.error("Error saving config:", err);
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="conf">Configuration Name</Label>
        <Input
          id="conf"
          placeholder="e.g., XO, Picture, Eyebrow Fixed"
          autoComplete="off"
          {...register("conf", { required: "Configuration name is required." })}
        />
        {errors.conf && (
          <p className="text-sm text-destructive">{errors.conf.message}</p>
        )}
      </div>

      {/* Product */}
      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Controller
          name="idProduct"
          control={control}
          rules={{ required: "You must select a product." }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
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

      {/* Required Dimensions */}
      <div className="space-y-3 rounded-md border p-4">
        <div>
          <p className="text-sm font-medium">Required Dimensions</p>
          <p className="text-sm text-muted-foreground">
            Select the dimensions needed to price this configuration.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <Controller
            name="requiresWidth"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresWidth"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="requiresWidth">Width</Label>
              </div>
            )}
          />

          <Controller
            name="requiresHeight"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresHeight"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="requiresHeight">Height</Label>
              </div>
            )}
          />

          <Controller
            name="requiresHeightLeft"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresHeightLeft"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="requiresHeightLeft">Height Left</Label>
              </div>
            )}
          />

          <Controller
            name="requiresHeightRight"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresHeightRight"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="requiresHeightRight">Height Right</Label>
              </div>
            )}
          />

          <Controller
            name="requiresLegHeight"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresLegHeight"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="requiresLegHeight">Leg Height</Label>
              </div>
            )}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button type="submit" disabled={(!isDirty && !isEdit) || showLoadingState}>
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState
            ? "Saving..."
            : isEdit
            ? "Save Changes"
            : "Create Config"}
        </Button>
      </div>
    </form>
  );
}
