"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import {
  createPricingRange,
  getAvailablePricingRangeCrystals,
  updatePricingRange,
} from "@/app/api/pricing-ranges.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { groupConfigsByCategory } from "@/lib/config-groups";
import type {
  Config,
  CreatePricingRangeData,
  Crystal,
  PricingRange,
  ProductWithBrands,
  SystemWithConfigs,
} from "@/lib/types";

const DIMENSION_DECIMAL_PATTERN = /^\d{1,7}(?:\.\d{1,3})?$/;
const PRICING_DECIMAL_PATTERN = /^-?\d{1,4}(?:\.\d{1,20})?$/;
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

type PricingRangeRuleFormValue = {
  idCrystal: number;
  costoA: string;
  costoB: string;
  costoC: string;
};

type PricingRangeFormValues = {
  idProduct: number;
  idBrand: number;
  idSystem: number;
  idConfig: number;
  code: string;

  minWidthIn: string;
  minWidthInclusive: boolean;
  maxWidthIn: string;
  maxWidthInclusive: boolean;

  minHeightIn: string;
  minHeightInclusive: boolean;
  maxHeightIn: string;
  maxHeightInclusive: boolean;

  sortOrder: number;
  isActive: boolean;
  rules: PricingRangeRuleFormValue[];
};

function decimalToInput(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function normalizeDimension(value: string) {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function emptyRule(idCrystal = 0): PricingRangeRuleFormValue {
  return {
    idCrystal,
    costoA: "0",
    costoB: "0",
    costoC: "0",
  };
}

export function PricingRangeForm({
  pricingRange,
  productsWithBrands,
  systemsWithConfigs,
}: {
  pricingRange?: PricingRange;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
}) {
  const router = useRouter();
  const isEditMode = Boolean(pricingRange);

  const initialSystem = systemsWithConfigs.find(
    (system) => system.id === pricingRange?.idSystem,
  );

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PricingRangeFormValues>({
    mode: "onChange",
    defaultValues: {
      idProduct: initialSystem?.idProduct ?? 0,
      idBrand: initialSystem?.idBrand ?? 0,
      idSystem: pricingRange?.idSystem ?? 0,
      idConfig: pricingRange?.idConfig ?? 0,
      code: pricingRange?.code ?? "",

      minWidthIn: decimalToInput(pricingRange?.minWidthIn),
      minWidthInclusive: pricingRange?.minWidthInclusive ?? true,
      maxWidthIn: decimalToInput(pricingRange?.maxWidthIn),
      maxWidthInclusive: pricingRange?.maxWidthInclusive ?? true,

      minHeightIn: decimalToInput(pricingRange?.minHeightIn),
      minHeightInclusive: pricingRange?.minHeightInclusive ?? true,
      maxHeightIn: decimalToInput(pricingRange?.maxHeightIn),
      maxHeightInclusive: pricingRange?.maxHeightInclusive ?? true,

      sortOrder: pricingRange?.sortOrder ?? 0,
      isActive: pricingRange?.isActive ?? true,
      rules:
        pricingRange?.rules.map((rule) => ({
          idCrystal: rule.idCrystal,
          costoA: decimalToInput(rule.costoA),
          costoB: decimalToInput(rule.costoB),
          costoC: decimalToInput(rule.costoC),
        })) ?? [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "rules",
  });

  const productId = useWatch({ control, name: "idProduct" });
  const brandId = useWatch({ control, name: "idBrand" });
  const systemId = useWatch({ control, name: "idSystem" });
  const configId = useWatch({ control, name: "idConfig" });
  const selectedRules = useWatch({ control, name: "rules" }) ?? [];

  const [availableCrystals, setAvailableCrystals] = useState<Crystal[]>([]);
  const [isLoadingCrystals, setIsLoadingCrystals] = useState(false);
  const [rulePendingRemoval, setRulePendingRemoval] = useState<{
    index: number;
    crystalName: string;
  } | null>(null);

  const availableBrands = useMemo(() => {
    if (!productId) return [];

    const selectedProduct = productsWithBrands.find(
      (product) => product.id === Number(productId),
    );

    return selectedProduct
      ? selectedProduct.brandProducts.map((brandProduct) => brandProduct.brand)
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

  useEffect(() => {
    let cancelled = false;

    if (!systemId || !configId) {
      setAvailableCrystals([]);
      setIsLoadingCrystals(false);
      return;
    }

    setIsLoadingCrystals(true);

    void getAvailablePricingRangeCrystals(Number(systemId), Number(configId))
      .then((crystals) => {
        if (cancelled) return;

        // Mantener visibles las reglas guardadas al editar datos existentes.
        const savedCrystals =
          pricingRange?.idSystem === Number(systemId) &&
          pricingRange.idConfig === Number(configId)
            ? pricingRange.rules.map((rule) => rule.crystal)
            : [];

        const crystalsById = new Map<number, Crystal>();

        for (const crystal of [...crystals, ...savedCrystals]) {
          crystalsById.set(crystal.id, crystal);
        }

        setAvailableCrystals(
          Array.from(crystalsById.values()).sort((a, b) =>
            a.glass.localeCompare(b.glass),
          ),
        );
      })
      .catch((error) => {
        if (cancelled) return;

        setAvailableCrystals([]);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load available crystals.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCrystals(false);
      });

    return () => {
      cancelled = true;
    };
  }, [systemId, configId, pricingRange]);

  const selectedCrystalIds = useMemo(
    () => new Set(selectedRules.map((rule) => Number(rule.idCrystal))),
    [selectedRules],
  );

  const addableCrystals = useMemo(
    () =>
      availableCrystals.filter(
        (crystal) => !selectedCrystalIds.has(crystal.id),
      ),
    [availableCrystals, selectedCrystalIds],
  );

  const validateAxis = (
    minimum: string | null,
    maximum: string | null,
    minimumInclusive: boolean,
    maximumInclusive: boolean,
    axis: "width" | "height",
  ) => {
    if (minimum == null || maximum == null) return true;

    const min = Number(minimum);
    const max = Number(maximum);

    if (min > max) {
      setError(axis === "width" ? "maxWidthIn" : "maxHeightIn", {
        type: "validate",
        message: `Maximum ${axis} cannot be less than minimum ${axis}.`,
      });
      return false;
    }

    if (min === max && (!minimumInclusive || !maximumInclusive)) {
      setError(axis === "width" ? "maxWidthIn" : "maxHeightIn", {
        type: "validate",
        message: `Equal ${axis} boundaries must both be inclusive.`,
      });
      return false;
    }

    return true;
  };

  const onSubmit = handleSubmit(async (data) => {
    clearErrors();

    const minWidthIn = normalizeDimension(data.minWidthIn);
    const maxWidthIn = normalizeDimension(data.maxWidthIn);
    const minHeightIn = normalizeDimension(data.minHeightIn);
    const maxHeightIn = normalizeDimension(data.maxHeightIn);

    if (
      minWidthIn == null &&
      maxWidthIn == null &&
      minHeightIn == null &&
      maxHeightIn == null
    ) {
      setError("root.range", {
        type: "validate",
        message:
          "Define at least one minimum or maximum width or height boundary.",
      });
      return;
    }

    const widthIsValid = validateAxis(
      minWidthIn,
      maxWidthIn,
      data.minWidthInclusive,
      data.maxWidthInclusive,
      "width",
    );

    const heightIsValid = validateAxis(
      minHeightIn,
      maxHeightIn,
      data.minHeightInclusive,
      data.maxHeightInclusive,
      "height",
    );

    if (!widthIsValid || !heightIsValid) return;

    if (data.rules.length === 0) {
      setError("root.rules", {
        type: "validate",
        message: "Add at least one crystal rule.",
      });
      return;
    }

    const crystalIds = data.rules.map((rule) => Number(rule.idCrystal));

    if (new Set(crystalIds).size !== crystalIds.length) {
      setError("root.rules", {
        type: "validate",
        message: "The same crystal cannot be added more than once.",
      });
      return;
    }

    const availableCrystalIds = new Set(
      availableCrystals.map((crystal) => crystal.id),
    );

    if (crystalIds.some((idCrystal) => !availableCrystalIds.has(idCrystal))) {
      setError("root.rules", {
        type: "validate",
        message:
          "One of the selected crystals is no longer available for this combination.",
      });
      return;
    }

    const dataToSend: CreatePricingRangeData = {
      idSystem: Number(data.idSystem),
      idConfig: Number(data.idConfig),
      code: data.code.trim(),

      minWidthIn,
      minWidthInclusive: data.minWidthInclusive,
      maxWidthIn,
      maxWidthInclusive: data.maxWidthInclusive,

      minHeightIn,
      minHeightInclusive: data.minHeightInclusive,
      maxHeightIn,
      maxHeightInclusive: data.maxHeightInclusive,

      sortOrder: Number(data.sortOrder),
      isActive: data.isActive,
      rules: data.rules.map((rule) => ({
        idCrystal: Number(rule.idCrystal),
        // Conservar los coeficientes como strings para no perder precisión.
        costoA: rule.costoA.trim(),
        costoB: rule.costoB.trim(),
        costoC: rule.costoC.trim(),
      })),
    };

    try {
      if (pricingRange) {
        const {
          idSystem: _idSystem,
          idConfig: _idConfig,
          ...updateData
        } = dataToSend;

        await updatePricingRange(pricingRange.id, updateData);
        toast.success("Pricing range updated successfully!");
      } else {
        await createPricingRange(dataToSend);
        toast.success("Pricing range created successfully!");
      }

      router.push("/settings/pricing-ranges");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save range.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Product</Label>
          <Controller
            name="idProduct"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                disabled={isEditMode || isSubmitting}
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idBrand", 0, { shouldValidate: true });
                  setValue("idSystem", 0, { shouldValidate: true });
                  setValue("idConfig", 0, { shouldValidate: true });
                  replace([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
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

        <div className="space-y-2">
          <Label>Brand</Label>
          <Controller
            name="idBrand"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                disabled={isEditMode || !productId || isSubmitting}
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idSystem", 0, { shouldValidate: true });
                  setValue("idConfig", 0, { shouldValidate: true });
                  replace([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product first..." />
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

        <div className="space-y-2">
          <Label>System</Label>
          <Controller
            name="idSystem"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                disabled={isEditMode || !brandId || isSubmitting}
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  setValue("idConfig", 0, { shouldValidate: true });
                  replace([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand first..." />
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

        <div className="space-y-2">
          <Label>Configuration</Label>
          <Controller
            name="idConfig"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                disabled={isEditMode || !systemId || isSubmitting}
                onValueChange={(value) => {
                  field.onChange(Number(value));
                  replace([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system first..." />
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

        <div className="space-y-2">
          <Label htmlFor="pricing-range-code">Range Code</Label>
          <Controller
            name="code"
            control={control}
            rules={{
              required: "Range Code is required.",
              maxLength: {
                value: 30,
                message: "Range Code cannot exceed 30 characters.",
              },
              pattern: {
                value: CODE_PATTERN,
                message: "Use only letters, numbers, hyphens, and underscores.",
              },
            }}
            render={({ field, fieldState }) => (
              <>
                <Input
                  id="pricing-range-code"
                  autoComplete="off"
                  placeholder="SMALL_01"
                  disabled={isSubmitting}
                  {...field}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-range-sort-order">Sort Order</Label>
          <Controller
            name="sortOrder"
            control={control}
            rules={{ min: 0 }}
            render={({ field }) => (
              <Input
                id="pricing-range-sort-order"
                type="number"
                min={0}
                step={1}
                disabled={isSubmitting}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Width Range</h3>
            <p className="text-sm text-muted-foreground">
              Leave a boundary empty when that side has no limit.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Width (in)</Label>
              <Controller
                name="minWidthIn"
                control={control}
                rules={{
                  validate: (value) =>
                    value.trim() === "" ||
                    (DIMENSION_DECIMAL_PATTERN.test(value.trim()) &&
                      Number(value) > 0) ||
                    "Use a positive value with up to 3 decimals.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="No minimum"
                      disabled={isSubmitting}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />

              <Controller
                name="minWidthInclusive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="min-width-inclusive"
                      checked={field.value}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <Label
                      htmlFor="min-width-inclusive"
                      className="font-normal"
                    >
                      Include minimum
                    </Label>
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Width (in)</Label>
              <Controller
                name="maxWidthIn"
                control={control}
                rules={{
                  validate: (value) =>
                    value.trim() === "" ||
                    (DIMENSION_DECIMAL_PATTERN.test(value.trim()) &&
                      Number(value) > 0) ||
                    "Use a positive value with up to 3 decimals.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="No maximum"
                      disabled={isSubmitting}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />

              <Controller
                name="maxWidthInclusive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="max-width-inclusive"
                      checked={field.value}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <Label
                      htmlFor="max-width-inclusive"
                      className="font-normal"
                    >
                      Include maximum
                    </Label>
                  </div>
                )}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Height Range</h3>
            <p className="text-sm text-muted-foreground">
              Leave a boundary empty when that side has no limit.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Height (in)</Label>
              <Controller
                name="minHeightIn"
                control={control}
                rules={{
                  validate: (value) =>
                    value.trim() === "" ||
                    (DIMENSION_DECIMAL_PATTERN.test(value.trim()) &&
                      Number(value) > 0) ||
                    "Use a positive value with up to 3 decimals.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="No minimum"
                      disabled={isSubmitting}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />

              <Controller
                name="minHeightInclusive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="min-height-inclusive"
                      checked={field.value}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <Label
                      htmlFor="min-height-inclusive"
                      className="font-normal"
                    >
                      Include minimum
                    </Label>
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Height (in)</Label>
              <Controller
                name="maxHeightIn"
                control={control}
                rules={{
                  validate: (value) =>
                    value.trim() === "" ||
                    (DIMENSION_DECIMAL_PATTERN.test(value.trim()) &&
                      Number(value) > 0) ||
                    "Use a positive value with up to 3 decimals.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="No maximum"
                      disabled={isSubmitting}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />

              <Controller
                name="maxHeightInclusive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="max-height-inclusive"
                      checked={field.value}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <Label
                      htmlFor="max-height-inclusive"
                      className="font-normal"
                    >
                      Include maximum
                    </Label>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {errors.root?.range && (
        <p className="text-sm text-destructive">{errors.root.range.message}</p>
      )}

      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Crystal Rules</h3>
            <p className="text-sm text-muted-foreground">
              Add the A, B, and C coefficients used inside this range.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              !systemId ||
              !configId ||
              isLoadingCrystals ||
              isSubmitting ||
              addableCrystals.length === 0
            }
            onClick={() => {
              const crystal = addableCrystals[0];
              append(emptyRule(crystal?.id ?? 0));
              clearErrors("root.rules");
            }}
          >
            {isLoadingCrystals ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Crystal Rule
          </Button>
        </div>

        {!systemId || !configId ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Select a system and configuration first.
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {isLoadingCrystals
              ? "Loading crystals..."
              : availableCrystals.length === 0
                ? "No crystals are available for this combination."
                : "Add at least one crystal rule."}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))_44px] gap-3 px-3 text-sm font-medium text-muted-foreground lg:grid">
              <span>Crystal</span>
              <span>Area Cost (A)</span>
              <span>Perimeter Cost (B)</span>
              <span>Fixed Cost (C)</span>
              <span />
            </div>

            {fields.map((ruleField, index) => {
              const currentCrystalId = Number(
                selectedRules[index]?.idCrystal ?? 0,
              );

              const rowCrystals = availableCrystals.filter(
                (crystal) =>
                  crystal.id === currentCrystalId ||
                  !selectedCrystalIds.has(crystal.id),
              );

              return (
                <div
                  key={ruleField.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))_44px]"
                >
                  <div className="space-y-1">
                    <Label className="lg:hidden">Crystal</Label>
                    <Controller
                      name={`rules.${index}.idCrystal`}
                      control={control}
                      rules={{ min: 1 }}
                      render={({ field, fieldState }) => (
                        <>
                          <Select
                            value={field.value ? String(field.value) : ""}
                            disabled={isSubmitting}
                            onValueChange={(value) =>
                              field.onChange(Number(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select crystal..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rowCrystals.map((crystal) => (
                                <SelectItem
                                  key={crystal.id}
                                  value={String(crystal.id)}
                                >
                                  {crystal.glass}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.error && (
                            <p className="text-sm text-destructive">
                              Select a crystal.
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {(["costoA", "costoB", "costoC"] as const).map(
                    (coefficient, coefficientIndex) => (
                      <div key={coefficient} className="space-y-1">
                        <Label className="lg:hidden">
                          {coefficientIndex === 0
                            ? "Area Cost (A)"
                            : coefficientIndex === 1
                              ? "Perimeter Cost (B)"
                              : "Fixed Cost (C)"}
                        </Label>
                        <Controller
                          name={`rules.${index}.${coefficient}`}
                          control={control}
                          rules={{
                            required: "Required.",
                            pattern: {
                              value: PRICING_DECIMAL_PATTERN,
                              message:
                                "Use up to 4 integer and 20 decimal digits.",
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <>
                              <Input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                placeholder="0.00000000000000000000"
                                disabled={isSubmitting}
                                {...field}
                              />
                              {fieldState.error && (
                                <p className="text-sm text-destructive">
                                  {fieldState.error.message}
                                </p>
                              )}
                            </>
                          )}
                        />
                      </div>
                    ),
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label="Remove crystal rule"
                    disabled={isSubmitting}
                    onClick={() => {
                      const crystalId = Number(
                        selectedRules[index]?.idCrystal ?? 0,
                      );

                      const crystalName =
                        availableCrystals.find(
                          (crystal) => crystal.id === crystalId,
                        )?.glass ?? "selected crystal";

                      setRulePendingRemoval({
                        index,
                        crystalName,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {errors.root?.rules && (
          <p className="text-sm text-destructive">
            {errors.root.rules.message}
          </p>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={rulePendingRemoval !== null}
        onClose={() => setRulePendingRemoval(null)}
        onConfirm={() => {
          if (!rulePendingRemoval) return;

          remove(rulePendingRemoval.index);
          clearErrors("root.rules");
          setRulePendingRemoval(null);
        }}
        title="Remove crystal rule?"
        description={
          isEditMode
            ? `The rule for ${
                rulePendingRemoval?.crystalName ?? "the selected crystal"
              } will be removed when you update the pricing range.`
            : `The rule for ${
                rulePendingRemoval?.crystalName ?? "the selected crystal"
              } will be removed from this pricing range.`
        }
        confirmText="Remove rule"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="pricing-range-active"
                checked={field.value}
                disabled={isSubmitting}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="pricing-range-active">Active</Label>
            </div>
          )}
        />

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.back()}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="green"
            disabled={
              isSubmitting || isLoadingCrystals || (isEditMode && !isDirty)
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Range" : "Create Range"}
          </Button>
        </div>
      </div>
    </form>
  );
}
