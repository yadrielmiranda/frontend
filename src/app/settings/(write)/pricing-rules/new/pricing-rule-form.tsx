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

import {
  CreatePricingRuleData,
  PricingRule,
  ProductWithBrands,
  SystemWithConfigs,
  Crystal,
  Config,
} from "@/lib/types";
import {
  createPricingRule,
  updatePricingRule,
} from "@/app/api/pricing-rules.api";
import { groupConfigsByCategory } from "@/lib/config-groups";

type PricingRuleFormValues = CreatePricingRuleData;

const PRICING_DECIMAL_PATTERN = /^-?\d{1,4}(?:\.\d{1,20})?$/;

interface PricingRuleFormProps {
  pricingRule?: PricingRule;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  crystals: Crystal[];
}

export function PricingRuleForm({
  pricingRule,
  productsWithBrands,
  systemsWithConfigs,
  crystals,
}: PricingRuleFormProps) {
  const router = useRouter();
  const isEditMode = !!pricingRule;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isValid },
  } = useForm<PricingRuleFormValues>({
    mode: "onBlur",
    defaultValues: {
      idBrand: pricingRule?.idBrand || 0,
      idProduct: pricingRule?.idProduct || 0,
      idSystem: pricingRule?.idSystem || 0,
      idConfig: pricingRule?.idConfig || 0,
      idCrystal: pricingRule?.idCrystal || 0,
      costoA: pricingRule?.costoA?.toString() ?? "0.00",
      costoB: pricingRule?.costoB?.toString() ?? "0.00",
      costoC: pricingRule?.costoC?.toString() ?? "0.00",
    },
  });

  const [productId, brandId, systemId] = watch([
    "idProduct",
    "idBrand",
    "idSystem",
  ]);

  const availableBrands = useMemo(() => {
    if (!productId) return [];

    const selectedProduct = productsWithBrands.find(
      (product) => product.id === Number(productId),
    );

    return selectedProduct
      ? selectedProduct.brandProducts.map((bp) => bp.brand)
      : [];
  }, [productId, productsWithBrands]);

  const availableSystems = useMemo(() => {
    if (!productId || !brandId) return [];

    return systemsWithConfigs.filter(
      (system) =>
        system.idProduct === Number(productId) &&
        system.idBrand === Number(brandId),
    );
  }, [productId, brandId, systemsWithConfigs]);

  const availableConfigs = useMemo<Config[]>(() => {
    if (!systemId) return [];

    const selectedSystem = systemsWithConfigs.find(
      (system) => system.id === Number(systemId),
    );

    return selectedSystem
      ? selectedSystem.sysconfs
          .filter((sysconf) => (sysconf.pricingComponents?.length ?? 0) === 0)
          .map((sysconf) => sysconf.config)
          .filter((config): config is Config => Boolean(config))
      : [];
  }, [systemId, systemsWithConfigs]);

  const groupedConfigs = useMemo(
    () => groupConfigsByCategory(availableConfigs),
    [availableConfigs],
  );

  const onSubmit = handleSubmit(async (data) => {
    const dataToSend: CreatePricingRuleData = {
      ...data,

      // conservar los coeficientes como strings
      // para no perder precisión antes de enviarlos al backend.
      costoA: data.costoA.trim(),
      costoB: data.costoB.trim(),
      costoC: data.costoC.trim(),
    };

    try {
      if (isEditMode) {
        await updatePricingRule(pricingRule.id, dataToSend);
        toast.success("Pricing rule updated successfully!");
      } else {
        await createPricingRule(dataToSend);
        toast.success("Pricing rule created successfully!");
      }

      router.push("/settings/pricing-rules");
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  {productsWithBrands.map((product) => (
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
          <Label>Crystal</Label>
          <Controller
            name="idCrystal"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>

                <SelectContent>
                  {crystals.map((crystal) => (
                    <SelectItem key={crystal.id} value={String(crystal.id)}>
                      {crystal.glass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          <div>
            <Label>Area Cost</Label>

            <Controller
              name="costoA"
              control={control}
              rules={{
                required: "Area Cost is required.",
                pattern: {
                  value: PRICING_DECIMAL_PATTERN,
                  message:
                    "Area Cost must contain at most 4 integer digits and 20 decimal digits.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00000000000000000000"
                    {...field}
                  />

                  {fieldState.error && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div>
            <Label>Perimeter Cost</Label>

            <Controller
              name="costoB"
              control={control}
              rules={{
                required: "Perimeter Cost is required.",
                pattern: {
                  value: PRICING_DECIMAL_PATTERN,
                  message:
                    "Perimeter Cost must contain at most 4 integer digits and 20 decimal digits.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00000000000000000000"
                    {...field}
                  />

                  {fieldState.error && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div>
            <Label>Fixed Cost</Label>

            <Controller
              name="costoC"
              control={control}
              rules={{
                required: "Fixed Cost is required.",
                pattern: {
                  value: PRICING_DECIMAL_PATTERN,
                  message:
                    "Fixed Cost must contain at most 4 integer digits and 20 decimal digits.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00000000000000000000"
                    {...field}
                  />

                  {fieldState.error && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          variant="green"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Update Rule" : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}
