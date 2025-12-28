"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Calculator,
  AlertTriangle,
} from "lucide-react";

import { calculatePiece, validatePiece } from "@/app/api/estimates.api";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DialogFooter } from "@/components/ui/dialog";

import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Config,
  CalculatePiecePayload,
} from "@/app/api/types";

import { PieceDiagram } from "@/components/piece-diagram";
import {
  // normalizar inputs
  normalizeInchesToEighthStep,
  DimensionParseError,
  // formatear
  formatPsf,
} from "@/lib/dimensions";
import { roundMoney } from "@/lib/money";

import type { PieceFormValues } from "./types";

// --- SUB-COMPONENTE: FORMULARIO DE PIEZA DENTRO DEL MODAL ---
export interface PieceFormProps {
  initialData: PieceFormValues;
  onSubmit: (data: PieceFormValues) => void;
  onCancel: () => void;
  index: number;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];

  isDealer: boolean;
}

export function PieceForm({
  onSubmit,
  onCancel,
  initialData,
  index,
  ...props
}: PieceFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PieceFormValues>({
    defaultValues: {
      ...initialData,
      width: initialData.width ?? "",
      height: initialData.height ?? "",
      heightLeft: initialData.heightLeft ?? "",
      heightRight: initialData.heightRight ?? "",
      legHeight: initialData.legHeight ?? "",

      // métricas/valores por si vienen vacíos
      rate: initialData.rate ?? 0,
      price: initialData.price ?? 0,
      subtotal: initialData.subtotal ?? 0,
      dealerMarkup: initialData.dealerMarkup ?? 0,
      total: initialData.total ?? 0,
      netProfitD: initialData.netProfitD ?? 0,
      customerPrice: initialData.customerPrice ?? 0,
      customerSubtotal: initialData.customerSubtotal ?? 0,
      dpPosPsf: initialData.dpPosPsf ?? null,
      dpNegPsf: initialData.dpNegPsf ?? null,
    },
  });

  const [isLocked, setIsLocked] = useState(
    !!initialData.price && initialData.price > 0
  );

  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>(
    () => {
      const defaultItems = [
        "item-frame",
        "item-size",
        "item-glass",
        "item-options",
        "item-details",
      ];
      if (initialData.price > 0) return [...defaultItems, "item-results"];
      return defaultItems;
    }
  );

  // flag para saber si el dealer cambió el % y no ha aplicado
  const [hasPendingDealerMarkup, setHasPendingDealerMarkup] = useState(false);

  const pieceValues = useWatch({ control });

  const { idProd, idConf, width, height, price } = pieceValues;

  const { productName } = useMemo(() => {
    const product = idProd
      ? props.productsWithBrands.find((p) => p.id === Number(idProd))
      : undefined;
    return { productName: product?.name };
  }, [idProd, props.productsWithBrands]);

  const [brandId, systemId] = useWatch({
    control,
    name: ["idBrand", "idSyst"],
  });

  const availableBrands = useMemo(() => {
    if (!idProd) return [];
    const selectedProduct = props.productsWithBrands.find(
      (p) => p.id === Number(idProd)
    );
    return selectedProduct
      ? selectedProduct.brandProducts.map((bp) => bp.brand)
      : [];
  }, [idProd, props.productsWithBrands]);

  const availableSystems = useMemo(() => {
    if (!idProd || !brandId) return [];
    return props.systemsWithConfigs.filter(
      (system) =>
        system.idProduct === Number(idProd) &&
        system.idBrand === Number(brandId)
    );
  }, [idProd, brandId, props.systemsWithConfigs]);

  const availableConfigs = useMemo(() => {
    if (!systemId) return [];
    const selectedSystem = props.systemsWithConfigs.find(
      (s) => s.id === Number(systemId)
    );
    return (
      selectedSystem?.sysconfs
        ?.map((sc) => sc.config)
        .filter((c): c is Config => !!c) ?? []
    );
  }, [systemId, props.systemsWithConfigs]);

  const selectedConfig = useMemo(() => {
    if (!idConf) return null;
    return availableConfigs.find((c) => c.id === Number(idConf)) ?? null;
  }, [idConf, availableConfigs]);

  const { configuration } = useMemo(() => {
    return { configuration: selectedConfig?.conf };
  }, [selectedConfig]);

  const dealerMarkupField = register("dealerMarkup", {
    valueAsNumber: true,
    min: 0,
  });

  const handleCalculate = async () => {
    try {
      const currentValues = getValues();

      if (!selectedConfig) {
        toast.error("Please select a configuration first.");
        return;
      }

      // 1) Normalizar dimensiones según lo que requiera la config
      const widthNorm = selectedConfig.requiresWidth
        ? normalizeInchesToEighthStep(currentValues.width, "Width", 1)
        : undefined;

      const heightNorm = selectedConfig.requiresHeight
        ? normalizeInchesToEighthStep(currentValues.height, "Height", 1)
        : undefined;

      const heightLeftNorm = selectedConfig.requiresHeightLeft
        ? normalizeInchesToEighthStep(currentValues.heightLeft, "Height Left", 1)
        : undefined;

      const heightRightNorm = selectedConfig.requiresHeightRight
        ? normalizeInchesToEighthStep(
            currentValues.heightRight,
            "Height Right",
            1
          )
        : undefined;

      const legHeightNorm = selectedConfig.requiresLegHeight
        ? normalizeInchesToEighthStep(currentValues.legHeight, "Leg Height", 1)
        : undefined;

      // 2) Reflejar en el form (texto normalizado)
      if (widthNorm !== undefined) setValue("width", String(widthNorm));
      if (heightNorm !== undefined) setValue("height", String(heightNorm));
      if (heightLeftNorm !== undefined)
        setValue("heightLeft", String(heightLeftNorm));
      if (heightRightNorm !== undefined)
        setValue("heightRight", String(heightRightNorm));
      if (legHeightNorm !== undefined)
        setValue("legHeight", String(legHeightNorm));

      // 3) DTO para /calculate-piece
      const pieceDtoToSend: CalculatePiecePayload = {
        mark: currentValues.mark,
        idProd: Number(currentValues.idProd),
        idBrand: Number(currentValues.idBrand),
        idSyst: Number(currentValues.idSyst),
        idConf: Number(currentValues.idConf),
        idFC: Number(currentValues.idFC),

        width: widthNorm !== undefined ? String(widthNorm) : undefined,
        height: heightNorm !== undefined ? String(heightNorm) : undefined,
        heightLeft:
          heightLeftNorm !== undefined ? String(heightLeftNorm) : undefined,
        heightRight:
          heightRightNorm !== undefined ? String(heightRightNorm) : undefined,
        legHeight:
          legHeightNorm !== undefined ? String(legHeightNorm) : undefined,

        idCryst: Number(currentValues.idCryst),
        idTint: Number(currentValues.idTint),
        privacy: currentValues.privacy,
        idCoat: Number(currentValues.idCoat),
        screen: currentValues.screen,
        muntin: currentValues.muntin,
        qty: Number(currentValues.qty),
        dealerMarkup: props.isDealer
          ? Number(currentValues.dealerMarkup || 0)
          : undefined,
      };

      // 4) PRE-CHECK NOA
      const precheck = await validatePiece({
        idSyst: pieceDtoToSend.idSyst,
        idConf: pieceDtoToSend.idConf,
        idCryst: pieceDtoToSend.idCryst,
        width: widthNorm ?? 0,
        height: heightNorm ?? 0,
        heightLeft: heightLeftNorm,
        heightRight: heightRightNorm,
        legHeight: legHeightNorm,
      });

      if (!precheck.ok) {
        if (precheck.reason === "NOT_RATED") {
          toast.error(
            "No hay política de dimensiones para esta combinación (System + Config + Crystal)."
          );
        } else if (precheck.reason === "OVERSIZE") {
          const belowMin = precheck.belowMinimum;
          if (belowMin) {
            const minW =
              precheck.suggestion?.minWidthIn ??
              precheck.suggestion?.maxWidthIn ??
              null;
            const minH =
              precheck.suggestion?.minHeightIn ??
              precheck.suggestion?.maxHeightIn ??
              null;
            const sW = minW != null ? `${minW}″` : "—";
            const sH = minH != null ? `${minH}″` : "—";
            toast.error(
              `Revise las dimensiones. Tamaño mínimo permitido: W=${sW}, H=${sH}.`
            );
          } else {
            const maxW = precheck.suggestion?.maxWidthIn ?? null;
            const maxH = precheck.suggestion?.maxHeightIn ?? null;
            const sW = maxW != null ? `${maxW}″` : "—";
            const sH = maxH != null ? `${maxH}″` : "—";
            toast.error(
              `Revise las dimensiones. Tamaño máximo permitido: W=${sW}, H=${sH}.`
            );
          }
        } else {
          toast.error("Validación de dimensiones falló.");
        }
        return;
      }

      // 5) Cálculo REAL
      const calculated = await calculatePiece(pieceDtoToSend);

      const unitPrice = roundMoney(Number(calculated.price) || 0);
      const lineSubtotal = roundMoney(Number(calculated.subtotal) || 0);
      const dealerProfitLine = roundMoney(Number(calculated.netProfitD) || 0);
      const customerSubtotalLine = roundMoney(
        Number(calculated.customerSubtotal) || 0
      );
      const customerUnitPrice = roundMoney(Number(calculated.customerPrice) || 0);

      setValue("price", unitPrice);
      setValue("subtotal", lineSubtotal);
      setValue("netProfitD", dealerProfitLine);
      setValue("customerSubtotal", customerSubtotalLine);
      setValue("customerPrice", customerUnitPrice);

      // total (line) = customerSubtotal
      setValue("total", customerSubtotalLine);

      // presiones (dpPosPsf / dpNegPsf)
      const dpPos =
        calculated.dpPosPsf === null || calculated.dpPosPsf === undefined
          ? null
          : Number(calculated.dpPosPsf);

      const dpNeg =
        calculated.dpNegPsf === null || calculated.dpNegPsf === undefined
          ? null
          : Number(calculated.dpNegPsf);

      setValue("dpPosPsf", dpPos);
      setValue("dpNegPsf", dpNeg);

      // mantenemos dealerMarkup en % en el form
      if (props.isDealer) {
        setValue("dealerMarkup", Number(currentValues.dealerMarkup || 0));
      }

      setIsLocked(true);
      if (!activeAccordionItems.includes("item-results")) {
        setActiveAccordionItems((prev) => [...prev, "item-results"]);
      }

      setHasPendingDealerMarkup(false);
      toast.success("Piece calculated successfully.");
    } catch (error) {
      toast.error((error as Error).message ?? "Error during calculation");
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setActiveAccordionItems((prev) =>
      prev.filter((item) => item !== "item-results")
    );
  };

  const recalcDealerTotals = () => {
  if (!props.isDealer) return;

  const v = getValues();
  const qtyN = Number(v.qty) || 0;
  const markupPercent = (Number(v.dealerMarkup) || 0) / 100;

  // ✅ usa tu line subtotal actual como base (backend truth)
  const baseLine = roundMoney(Number(v.subtotal) || 0);

  const dealerProfitLine = roundMoney(baseLine * markupPercent);
  const customerLine = roundMoney(baseLine + dealerProfitLine);

  const customerUnit = qtyN > 0 ? roundMoney(customerLine / qtyN) : 0;

  setValue("netProfitD", dealerProfitLine, { shouldDirty: true });
  setValue("total", customerLine, { shouldDirty: true });
  setValue("customerSubtotal", customerLine, { shouldDirty: true });
  setValue("customerPrice", customerUnit, { shouldDirty: true });

  setHasPendingDealerMarkup(false);
};


  const dpPlusText =
    pieceValues.dpPosPsf == null ? "—" : formatPsf(pieceValues.dpPosPsf, 1);
  const dpMinusText =
    pieceValues.dpNegPsf == null ? "—" : formatPsf(pieceValues.dpNegPsf, 1);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 p-1">
        <div className="md:col-span-3">
          <Accordion
            type="multiple"
            value={activeAccordionItems}
            onValueChange={setActiveAccordionItems}
            className="w-full"
          >
            {/* Frame */}
            <AccordionItem value="item-frame">
              <AccordionTrigger className="font-semibold text-base">
                Frame
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label>Product</Label>
                    <Controller
                      name="idProd"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idBrand", 0);
                            setValue("idSyst", 0);
                            setValue("idConf", 0);
                          }}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {props.productsWithBrands.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idProd && (
                      <p className="text-red-500 text-xs mt-1">
                        Product required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Brand</Label>
                    <Controller
                      name="idBrand"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !idProd}
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idSyst", 0);
                            setValue("idConf", 0);
                          }}
                          value={String(field.value || "0")}
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
                    {errors.idBrand && (
                      <p className="text-red-500 text-xs mt-1">
                        Brand required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>System</Label>
                    <Controller
                      name="idSyst"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !brandId}
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idConf", 0);
                          }}
                          value={String(field.value || "0")}
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
                    {errors.idSyst && (
                      <p className="text-red-500 text-xs mt-1">
                        System required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Configuration</Label>
                    <Controller
                      name="idConf"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !systemId}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
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
                    {errors.idConf && (
                      <p className="text-red-500 text-xs mt-1">
                        Config required
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label>Frame Color</Label>
                    <Controller
                      name="idFC"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {props.frameColors.map((fc) => (
                              <SelectItem key={fc.id} value={String(fc.id)}>
                                {fc.color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idFC && (
                      <p className="text-red-500 text-xs mt-1">
                        Color required
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Size */}
            <AccordionItem value="item-size">
              <AccordionTrigger className="font-semibold text-base">
                Size
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-2 gap-4 pt-2 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  {selectedConfig?.requiresWidth && (
                    <div>
                      <Label>Width</Label>
                      <Input
                        autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        {...register("width", { required: "Width is required" })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Width",
                              1
                            );
                            setValue("width", String(v), {
                              shouldValidate: true,
                            });
                          } catch (err) {
                            if (err instanceof DimensionParseError) {
                              toast.error(err.message);
                            }
                          }
                        }}
                      />
                      {errors.width && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.width.message}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedConfig?.requiresHeight && (
                    <div>
                      <Label>Height</Label>
                      <Input
                        autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        {...register("height", {
                          required: "Height is required",
                        })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Height",
                              1
                            );
                            setValue("height", String(v), {
                              shouldValidate: true,
                            });
                          } catch (err) {
                            if (err instanceof DimensionParseError) {
                              toast.error(err.message);
                            }
                          }
                        }}
                      />
                      {errors.height && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.height.message}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedConfig?.requiresHeightLeft && (
                    <div>
                      <Label>Height Left</Label>
                      <Input
                        autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        {...register("heightLeft", {
                          required: "Height Left is required",
                        })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Height Left",
                              1
                            );
                            setValue("heightLeft", String(v), {
                              shouldValidate: true,
                            });
                          } catch (err) {
                            if (err instanceof DimensionParseError) {
                              toast.error(err.message);
                            }
                          }
                        }}
                      />
                      {errors.heightLeft && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.heightLeft.message}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedConfig?.requiresHeightRight && (
                    <div>
                      <Label>Height Right</Label>
                      <Input
                        autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        {...register("heightRight", {
                          required: "Height Right is required",
                        })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Height Right",
                              1
                            );
                            setValue("heightRight", String(v), {
                              shouldValidate: true,
                            });
                          } catch (err) {
                            if (err instanceof DimensionParseError) {
                              toast.error(err.message);
                            }
                          }
                        }}
                      />
                      {errors.heightRight && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.heightRight.message}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedConfig?.requiresLegHeight && (
                    <div>
                      <Label>Leg Height</Label>
                      <Input
                        autoComplete="off"
                        type="text"
                        disabled={isLocked}
                        {...register("legHeight", {
                          required: "Leg Height is required",
                        })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Leg Height",
                              1
                            );
                            setValue("legHeight", String(v), {
                              shouldValidate: true,
                            });
                          } catch (err) {
                            if (err instanceof DimensionParseError) {
                              toast.error(err.message);
                            }
                          }
                        }}
                      />
                      {errors.legHeight && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.legHeight.message}
                        </p>
                      )}
                    </div>
                  )}

                  {Number(idConf) > 0 &&
                    !selectedConfig?.requiresWidth &&
                    !selectedConfig?.requiresHeight &&
                    !selectedConfig?.requiresHeightLeft &&
                    !selectedConfig?.requiresHeightRight &&
                    !selectedConfig?.requiresLegHeight && (
                      <p className="text-sm text-muted-foreground col-span-2">
                        This configuration does not require specific dimensions
                        for calculation.
                      </p>
                    )}

                  {!idConf && (
                    <p className="text-sm text-muted-foreground col-span-2">
                      Select a configuration to see required dimensions.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Glass */}
            <AccordionItem value="item-glass">
              <AccordionTrigger className="font-semibold text-base">
                Glass
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label>Type</Label>
                    <Controller
                      name="idCryst"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {props.crystals.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.glass}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idCryst && (
                      <p className="text-red-500 text-xs mt-1">Type required</p>
                    )}
                  </div>

                  <div>
                    <Label>Tint</Label>
                    <Controller
                      name="idTint"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {props.tints.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idTint && (
                      <p className="text-red-500 text-xs mt-1">Tint required</p>
                    )}
                  </div>

                  <div>
                    <Label>Coating</Label>
                    <Controller
                      name="idCoat"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {props.coatings.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idCoat && (
                      <p className="text-red-500 text-xs mt-1">
                        Coating required
                      </p>
                    )}
                  </div>

                  <div className="flex items-end pb-2">
                    <Controller
                      name="privacy"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`privacy-${index}`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLocked}
                          />
                          <Label htmlFor={`privacy-${index}`}>Privacy</Label>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Options */}
            <AccordionItem value="item-options">
              <AccordionTrigger className="font-semibold text-base">
                Options
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`flex items-center space-x-6 pt-4 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <Controller
                    name="screen"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`screen-${index}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLocked}
                        />
                        <Label htmlFor={`screen-${index}`}>Screen</Label>
                      </div>
                    )}
                  />
                  <Controller
                    name="muntin"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`muntin-${index}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLocked}
                        />
                        <Label htmlFor={`muntin-${index}`}>Muntin</Label>
                      </div>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Details */}
            <AccordionItem value="item-details">
              <AccordionTrigger className="font-semibold text-base">
                Details & Qty
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label>Mark</Label>
                    <Input
                      disabled={isLocked}
                      {...register("mark", { required: "Mark is required" })}
                    />
                    {errors.mark && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.mark.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      disabled={isLocked}
                      {...register("qty", {
                        required: "Qty is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Min qty is 1" },
                      })}
                    />
                    {errors.qty && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.qty.message}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Results */}
            {Number(price || 0) > 0 && (
              <AccordionItem value="item-results">
                <AccordionTrigger className="font-semibold text-base text-green-700">
                  Results
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-green-50 border-t space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4 text-sm">
                      <div>
                        <span className="font-semibold mr-2">
                          Your Price (Unit):
                        </span>
                        <strong className="font-mono text-base">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(pieceValues.price || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold mr-2">
                          Your Price (Line):
                        </span>
                        <strong className="font-mono text-base">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(pieceValues.subtotal || 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Design Pressures */}
                    <div className="bg-white border rounded-md p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Design Pressures
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">DP +:</span>
                          <span className="font-mono font-semibold">
                            {dpPlusText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">DP -:</span>
                          <span className="font-mono font-semibold">
                            {dpMinusText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {props.isDealer && (
                      <div className="border-t border-green-200 pt-4 space-y-3">
                        <h4 className="font-semibold text-gray-600">
                          Dealer Pricing
                        </h4>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`dealerMarkup-${index}`}
                              className="flex-shrink-0"
                            >
                              Dealer Markup (%)
                            </Label>
                            <Input
                              id={`dealerMarkup-${index}`}
                              type="number"
                              step="1"
                              className="w-24"
                              {...dealerMarkupField}
                              onChange={(e) => {
                                dealerMarkupField.onChange(e);
                                setHasPendingDealerMarkup(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={recalcDealerTotals}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Apply Markup
                            </Button>
                            {hasPendingDealerMarkup && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                Changes not applied
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Customer Price (Unit):</span>
                          <strong className="font-mono text-base">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.customerPrice || 0)}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Customer Subtotal (Line):</span>
                          <strong className="font-mono text-base">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.customerSubtotal || 0)}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Your Net Profit (Line):</span>
                          <strong className="font-mono text-base text-green-700">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.netProfitD || 0)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        {/* Preview */}
        <div className="hidden md:col-span-2 md:block">
          <div className="sticky top-8">
            <Label className="text-center block mb-2 font-semibold text-gray-600">
              Preview
            </Label>
            <div className="p-4 border rounded-lg bg-slate-50 min-h-[400px] flex items-center justify-center">
              <PieceDiagram
                width={Number(width) || 0}
                height={Number(height) || 0}
                productName={productName}
                configuration={configuration}
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-8">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        {isLocked ? (
          <Button type="button" variant="secondary" onClick={handleUnlock}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={handleCalculate}>
            <Calculator className="mr-2 h-4 w-4" /> Calculate
          </Button>
        )}

        <Button
          type="submit"
          variant="green"
          disabled={!isLocked || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Piece
        </Button>
      </DialogFooter>
    </form>
  );
}
