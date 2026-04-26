"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useForm,
  Controller,
  useFieldArray,
  type SubmitHandler,
} from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import type { Product, ConfigMuntinLayoutItem } from "@/lib/types";

interface ConfigBase {
  id?: number;
  conf: string;
  idProduct: number;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  muntinLayout?: ConfigMuntinLayoutItem[] | null;
}

type LayoutFormItem = {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
};

type FormValues = Omit<ConfigBase, "id" | "idProduct" | "muntinLayout"> & {
  idProduct: string;
  muntinLayout: LayoutFormItem[];
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

  const defaultLayout = useMemo<LayoutFormItem[]>(
    () =>
      (config?.muntinLayout ?? []).map((item, index) => ({
        panelIndex: Number(item.panelIndex ?? index + 1),
        panelCode: item.panelCode ?? "",
        panelLabel: item.panelLabel ?? "",
      })),
    [config?.muntinLayout],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
      muntinLayout: defaultLayout,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "muntinLayout",
  });

  const watchedLayout = watch("muntinLayout");

  const addPanel = () => {
    append({
      panelIndex: fields.length + 1,
      panelLabel: "",
      panelCode: "",
    });
  };

  const removePanel = (index: number) => {
    remove(index);

    const next = [...(watchedLayout ?? [])]
      .filter((_, i) => i !== index)
      .map((item, idx) => ({
        ...item,
        panelIndex: idx + 1,
      }));

    setValue("muntinLayout", next, { shouldDirty: true });
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const normalizedLayout = (data.muntinLayout ?? [])
        .map((item, index) => ({
          panelIndex: index + 1,
          panelCode: item.panelCode?.trim().toUpperCase() || undefined,
          panelLabel: item.panelLabel?.trim() || "",
        }))
        .filter((item) => item.panelLabel !== "");

      const payload = {
        conf: data.conf.trim(),
        idProduct: Number(data.idProduct),
        requiresWidth: Boolean(data.requiresWidth),
        requiresHeight: Boolean(data.requiresHeight),
        requiresHeightLeft: Boolean(data.requiresHeightLeft),
        requiresHeightRight: Boolean(data.requiresHeightRight),
        requiresLegHeight: Boolean(data.requiresLegHeight),
        muntinLayout: normalizedLayout,
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
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      console.error("Error saving config:", err);
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
          autoComplete="off"
          {...register("conf", { required: "Configuration name is required." })}
        />
        {errors.conf && (
          <p className="text-sm text-destructive">{errors.conf.message}</p>
        )}
      </div>

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

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Muntin Layout</p>
            <p className="text-sm text-muted-foreground">
              Define the panel structure for this configuration.
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addPanel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Panel
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No panels defined yet. Add the layout for this configuration.
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-3 items-end rounded-md border p-3"
              >
                <div className="col-span-2">
                  <Label>Index</Label>
                  <Input value={index + 1} disabled readOnly />
                </div>

                <div className="col-span-3">
                  <Label htmlFor={`muntinLayout.${index}.panelCode`}>
                    Panel Code
                  </Label>
                  <Input
                    id={`muntinLayout.${index}.panelCode`}
                    placeholder="X, O, T, B..."
                    {...register(`muntinLayout.${index}.panelCode` as const)}
                  />
                </div>

                <div className="col-span-5">
                  <Label htmlFor={`muntinLayout.${index}.panelLabel`}>
                    Panel Label
                  </Label>
                  <Input
                    id={`muntinLayout.${index}.panelLabel`}
                    placeholder="Left Sash, Right Fixed..."
                    {...register(`muntinLayout.${index}.panelLabel` as const)}
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePanel(index)}                    
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          Examples: XO = panel 1: X, panel 2: O. Single Hung = panel 1: T, panel
          2: B.
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={(!isDirty && !isEdit) || showLoadingState}
        >
          {showLoadingState && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
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
