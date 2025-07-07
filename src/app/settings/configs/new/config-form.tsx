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
import { Product } from "@/app/api/types";
import { useState } from "react";
import { toast } from "sonner";

type FormValues = {
  conf: string;
  idProduct: string;
};

interface ConfigFormProps {
  config?: FormValues & { id: number };
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
        toast.success("Configuration updated successfully!");
      } else {
        await createConfig(configData);
        toast.success("Configuration created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/configs");
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
          placeholder="e.g., Standard, Premium, etc."
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
          disabled={!isDirty || showLoadingState}
        >
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Saving..." : params.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
