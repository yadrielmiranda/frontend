"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createProduct, updateProduct } from "@/app/api/products.api";
import type {
  DiagramFamily,
  PricingMode,
  Product,
  ProductKind,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  name: string;
  isActive: boolean;
  kind: ProductKind;
  diagramFamily: DiagramFamily;
};

const DIAGRAM_FAMILY_OPTIONS: ReadonlyArray<{
  value: DiagramFamily;
  label: string;
}> = [
  {
    value: "GENERIC",
    label: "Generic",
  },
  {
    value: "BIFOLD",
    label: "Bi-Fold Door",
  },
  {
    value: "CASEMENT",
    label: "Casement Window",
  },
  {
    value: "FIXED_SHAPE",
    label: "Fixed Window / Shape",
  },
  {
    value: "FRENCH_DOOR",
    label: "French Door",
  },
  {
    value: "GARAGE_DOOR",
    label: "Garage Door",
  },
  {
    value: "HORIZONTAL_SLIDER",
    label: "Horizontal Rolling Window",
  },
  {
    value: "LINEAR_MATERIAL",
    label: "Linear Material",
  },
  {
    value: "PIVOT_DOOR",
    label: "Pivot Door",
  },
  {
    value: "SINGLE_HUNG",
    label: "Single Hung Window",
  },
  {
    value: "SLIDING_DOOR",
    label: "Sliding Glass Door",
  },
  {
    value: "WINDOW_WALL",
    label: "Window Wall / Store Front",
  },
];

function getPricingModeFromKind(kind: ProductKind): PricingMode {
  return kind === "LINEAR_MATERIAL" ? "LINEAR_INCH" : "AREA_PERIMETER";
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: product?.name ?? "",
      isActive: product?.isActive ?? true,
      kind: product?.kind ?? "GLAZED_UNIT",
      diagramFamily: product?.diagramFamily ?? "GENERIC",
    },
  });

  const selectedKind = watch("kind");

  const pricingMode = useMemo(
    () => getPricingModeFromKind(selectedKind),
    [selectedKind],
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        kind: data.kind,
        pricingMode: getPricingModeFromKind(data.kind),
        diagramFamily: data.diagramFamily,
      };

      if (isEdit) {
        await updateProduct(Number(params.id), {
          ...payload,
          isActive: data.isActive,
        });

        toast.success("Product updated successfully.");
      } else {
        await createProduct(payload);

        toast.success("Product created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/products");
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
          <Label htmlFor="name">Product Name</Label>

          <Input
            id="name"
            placeholder="Enter product name"
            autoComplete="off"
            {...register("name", {
              required: "Product name is required.",
              validate: (value) =>
                value.trim().length > 0 || "Product name is required.",
            })}
          />

          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="kind">Product Type</Label>

          <select
            id="kind"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("kind", {
              required: true,
            })}
          >
            <option value="GLAZED_UNIT">Glazed Unit</option>

            <option value="LINEAR_MATERIAL">Linear Material</option>
          </select>

          <p className="text-xs text-muted-foreground">
            Pricing mode:{" "}
            <span className="font-medium">
              {pricingMode === "LINEAR_INCH"
                ? "Linear Inch"
                : "Area + Perimeter"}
            </span>
          </p>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="diagramFamily">Diagram Family</Label>

          <select
            id="diagramFamily"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("diagramFamily", {
              required: true,
            })}
          >
            {DIAGRAM_FAMILY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <p className="text-xs text-muted-foreground">
            Selects the renderer used to draw pieces for this product. Generic
            uses the basic fallback diagram.
          </p>
        </div>

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
                : "Create Product"}
          </Button>
        </div>
      </div>
    </form>
  );
}
