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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreatePricingRuleData,
  PricingRule,
  ProductWithBrands,
  SystemWithConfigs,
  Crystal,
} from "@/lib/types"; // Asegúrate de que tu /api/types tenga PricingRule
import {
  createPricingRule,
  updatePricingRule,
} from "@/app/api/pricing-rules.api";

// --- Tipos y Props ---
type PricingRuleFormValues = Omit<
  CreatePricingRuleData,
  "costoA" | "costoB" | "costoC"
> & {
  costoA: string;
  costoB: string;
  costoC: string;
};

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
    formState: { errors, isSubmitting, isValid },
  } = useForm<PricingRuleFormValues>({
    mode: "onBlur",
    defaultValues: {
      idBrand: pricingRule?.idBrand || 0,
      idProduct: pricingRule?.idProduct || 0,
      idSystem: pricingRule?.idSystem || 0,
      idConfig: pricingRule?.idConfig || 0,
      idCrystal: pricingRule?.idCrystal || 0,
      costoA: String(pricingRule?.costoA || "0.00"),
      costoB: String(pricingRule?.costoB || "0.00"),
      costoC: String(pricingRule?.costoC || "0.00"),
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
      (p) => p.id === Number(productId)
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
        system.idBrand === Number(brandId)
    );
  }, [productId, brandId, systemsWithConfigs]);

  const availableConfigs = useMemo(() => {
    if (!systemId) return [];
    const selectedSystem = systemsWithConfigs.find(
      (s) => s.id === Number(systemId)
    );
    return selectedSystem ? selectedSystem.sysconfs.map((sc) => sc.config) : [];
  }, [systemId, systemsWithConfigs]);

  const onSubmit = handleSubmit(async (data) => {
    const dataToSend = {
      ...data,
      costoA: Number.parseFloat(data.costoA || "0"),
      costoB: Number.parseFloat(data.costoB || "0"),
      costoC: Number.parseFloat(data.costoC || "0"),
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
        {/* SELECTS */}
        <div>
          <Label>Product</Label>
          <Controller
            name="idProduct"
            control={control}
            rules={{ min: 1 }}
            render={({ field }) => (
              <Select
                onValueChange={(v) => {
                  field.onChange(Number(v));
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
                  {productsWithBrands.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
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
                onValueChange={(v) => {
                  field.onChange(Number(v));
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
                  {availableBrands.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
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
                onValueChange={(v) => {
                  field.onChange(Number(v));
                  setValue("idConfig", 0);
                }}
                value={String(field.value)}
                disabled={!brandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSystems.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
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
                onValueChange={(v) => field.onChange(Number(v))}
                value={String(field.value)}
                disabled={!systemId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system..." />
                </SelectTrigger>
                <SelectContent>
                  {availableConfigs.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.conf}
                    </SelectItem>
                  ))}
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
                onValueChange={(v) => field.onChange(Number(v))}
                value={String(field.value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {crystals.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.glass}
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
              rules={{ required: true }}
              render={({ field }) => (
                <Input type="number" step="0.01" {...field} />
              )}
            />
          </div>
          <div>
            <Label>Perimeter Cost</Label>
            <Controller
              name="costoB"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input type="number" step="0.01" {...field} />
              )}
            />
          </div>
          <div>
            <Label>Fixed Cost</Label>
            <Controller
              name="costoC"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input type="number" step="0.01" {...field} />
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
