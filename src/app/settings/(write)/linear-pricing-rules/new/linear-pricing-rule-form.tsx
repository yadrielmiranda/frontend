"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  Config,
  CreateLinearPricingRuleData,
  LinearPricingRule,
  ProductWithBrands,
  SystemWithConfigs,
} from "@/lib/types";
import {
  createLinearPricingRule,
  updateLinearPricingRule,
} from "@/app/api/linear-pricing-rules.api";
import { groupConfigsByCategory } from "@/lib/config-groups";

type FormValues = Omit<
  CreateLinearPricingRuleData,
  "costPerInch" | "minLengthIn" | "maxLengthIn"
> & {
  costPerInch: string;
  minLengthIn: string;
  maxLengthIn: string;
};

interface LinearPricingRuleFormProps {
  linearPricingRule?: LinearPricingRule;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
}

export function LinearPricingRuleForm({
  linearPricingRule,
  productsWithBrands,
  systemsWithConfigs,
}: LinearPricingRuleFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(linearPricingRule);

  const linearProducts = useMemo(
    () =>
      productsWithBrands.filter(
        (product) => product.kind === "LINEAR_MATERIAL",
      ),
    [productsWithBrands],
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      idBrand: linearPricingRule?.idBrand || 0,
      idProduct: linearPricingRule?.idProduct || 0,
      idSystem: linearPricingRule?.idSystem || 0,
      idConfig: linearPricingRule?.idConfig || 0,
      costPerInch: String(linearPricingRule?.costPerInch ?? "0.00"),
      minLengthIn: String(linearPricingRule?.minLengthIn ?? "20"),
      maxLengthIn: String(linearPricingRule?.maxLengthIn ?? "288"),
    },
  });

  const [productId, brandId, systemId] = watch([
    "idProduct",
    "idBrand",
    "idSystem",
  ]);

  const availableBrands = useMemo(() => {
    if (!productId) return [];

    const selectedProduct = linearProducts.find(
      (product) => product.id === Number(productId),
    );

    return selectedProduct
      ? selectedProduct.brandProducts.map((bp) => bp.brand)
      : [];
  }, [productId, linearProducts]);

  const availableSystems = useMemo(() => {
    if (!productId || !brandId) return [];

    return systemsWithConfigs.filter(
      (system) =>
        system.idProduct === Number(productId) &&
        system.idBrand === Number(brandId) &&
        system.brandProduct?.product?.kind === "LINEAR_MATERIAL",
    );
  }, [productId, brandId, systemsWithConfigs]);

  const availableConfigs = useMemo<Config[]>(() => {
    if (!systemId) return [];

    const selectedSystem = systemsWithConfigs.find(
      (system) => system.id === Number(systemId),
    );

    if (!selectedSystem) return [];

    return selectedSystem.sysconfs
      .filter(
        (sysconf) =>
          sysconf.requiresWidth === true &&
          sysconf.requiresHeight === false &&
          sysconf.allowScreen === false,
      )
      .map((sysconf) => sysconf.config)
      .filter((config): config is Config => Boolean(config));
  }, [systemId, systemsWithConfigs]);

  const groupedConfigs = useMemo(
    () => groupConfigsByCategory(availableConfigs),
    [availableConfigs],
  );

  const onSubmit = handleSubmit(async (data) => {
    const costPerInch = Number.parseFloat(data.costPerInch || "0");
    const minLengthIn = Number.parseFloat(data.minLengthIn || "20");
    const maxLengthIn = Number.parseFloat(data.maxLengthIn || "288");

    if (maxLengthIn <= minLengthIn) {
      toast.error("Max length must be greater than min length.");
      return;
    }

    const dataToSend: CreateLinearPricingRuleData = {
      idBrand: Number(data.idBrand),
      idProduct: Number(data.idProduct),
      idSystem: Number(data.idSystem),
      idConfig: Number(data.idConfig),
      costPerInch,
      minLengthIn,
      maxLengthIn,
    };

    try {
      if (isEditMode && linearPricingRule) {
        await updateLinearPricingRule(linearPricingRule.id, dataToSend);
        toast.success("Linear pricing rule updated successfully.");
      } else {
        await createLinearPricingRule(dataToSend);
        toast.success("Linear pricing rule created successfully.");
      }

      router.push("/settings/linear-pricing-rules");
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {linearProducts.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No Linear Material products found. Create a product with type Linear
          Material before adding linear pricing rules.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label>Product</Label>
          <Controller
            name="idProduct"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idBrand", 0);
                  setValue("idSystem", 0);
                  setValue("idConfig", 0);
                }}
                value={String(field.value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>

                <SelectContent>
                  {linearProducts.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label>Brand</Label>
          <Controller
            name="idBrand"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idSystem", 0);
                  setValue("idConfig", 0);
                }}
                value={String(field.value)}
                disabled={!productId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>

                <SelectContent>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label>System</Label>
          <Controller
            name="idSystem"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idConfig", 0);
                }}
                value={String(field.value)}
                disabled={!brandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand..." />
                </SelectTrigger>

                <SelectContent>
                  {availableSystems.map((system) => (
                    <SelectItem key={system.id} value={String(system.id)}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label>Configuration</Label>
          <Controller
            name="idConfig"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
                disabled={!systemId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system..." />
                </SelectTrigger>

                <SelectContent>
                  {!groupedConfigs.hasCategories ? (
                    availableConfigs.map((config) => (
                      <SelectItem key={config.id} value={String(config.id)}>
                        {config.conf}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      {groupedConfigs.uncategorized.map((config) => (
                        <SelectItem key={config.id} value={String(config.id)}>
                          {config.conf}
                        </SelectItem>
                      ))}

                      {groupedConfigs.groups.map((group) => (
                        <SelectGroup key={group.key}>
                          <SelectLabel className="font-bold text-slate-900">
                            {group.name}
                          </SelectLabel>

                          {group.items.map((config) => (
                            <SelectItem
                              key={config.id}
                              value={String(config.id)}
                            >
                              {config.conf}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label>Cost Per Inch</Label>
          <Controller
            name="costPerInch"
            control={control}
            rules={{
              required: true,
              min: 0,
            }}
            render={({ field }) => (
              <Input type="number" step="0.01" min="0" {...field} />
            )}
          />
        </div>

        <div>
          <Label>Min Length (in)</Label>
          <Controller
            name="minLengthIn"
            control={control}
            rules={{
              required: true,
              min: 0,
            }}
            render={({ field }) => (
              <Input type="number" step="0.01" min="0" {...field} />
            )}
          />
        </div>

        <div>
          <Label>Max Length (in)</Label>
          <Controller
            name="maxLengthIn"
            control={control}
            rules={{
              required: true,
              min: 0,
            }}
            render={({ field }) => (
              <Input type="number" step="0.01" min="0" {...field} />
            )}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          variant="green"
          disabled={!isValid || isSubmitting || linearProducts.length === 0}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Update Rule" : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}
