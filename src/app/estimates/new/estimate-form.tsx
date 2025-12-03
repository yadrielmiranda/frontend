// src/app/estimates/new/estimate-form.tsx

"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  Pencil,
  Calculator,
  Eye,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  createEstimate,
  updateEstimate,
  calculatePiece,
  validatePiece,
} from "@/app/api/estimates.api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreateEstimateData,
  CreatePieceData,
  EstimateWithRelations,
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  UpdateEstimateData,
  Config, // Asegúrate de importar Config desde tus tipos API
  CalculatePiecePayload,
} from "@/app/api/types";
import { PieceDiagram } from "@/components/piece-diagram";
import { useAuth } from "@/contexts/AuthContext";
import {
  normalizeInchesToEighthStep,
  DimensionParseError,
} from "@/lib/dimensions";

// --- Tipos para el Formulario ---
interface PieceFormValues extends CreatePieceData {
  id?: number;
  rate: number;
  price: number;
  subtotal: number;
  dealerMarkup: number; // Mantenemos como porcentaje en el estado del formulario
  total: number;
  netProfitD: number;
  // Añadimos las dimensiones opcionales que pueden venir del backend o ser null/undefined
  heightLeft?: string | undefined;
  heightRight?: string | undefined;
  legHeight?: string | undefined;
}

interface EstimateFormValues {
  name: string;
  generalDealerMarkup: number;
  defaultFrameColorId: number;
  pieces: PieceFormValues[];
}

// --- Props del Componente ---
interface EstimateFormProps {
  estimate?: EstimateWithRelations;
  taxRate: number;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
}

// --- SUB-COMPONENTE: FORMULARIO DE PIEZA DENTRO DEL MODAL ---
interface PieceFormProps {
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

const PieceForm = ({
  onSubmit,
  onCancel,
  initialData,
  index,
  ...props
}: PieceFormProps) => {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PieceFormValues>({
    // Aseguramos que los valores iniciales para las dimensiones opcionales sean strings vacíos si son null/undefined
    defaultValues: {
      ...initialData,
      width: initialData.width ?? "",
      height: initialData.height ?? "",
      heightLeft: initialData.heightLeft ?? "",
      heightRight: initialData.heightRight ?? "",
      legHeight: initialData.legHeight ?? "",
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
      if (initialData.price > 0) {
        return [...defaultItems, "item-results"];
      }
      return defaultItems;
    }
  );

  const pieceValues = useWatch({ control });
  // Incluimos las nuevas dimensiones en la desestructuración
  const {
    idProd,
    idConf,
    width,
    height,
    heightLeft,
    heightRight,
    legHeight,
    price,
    qty,
    dealerMarkup,
  } = pieceValues;

  const { productName } = useMemo(() => {
    const product = idProd
      ? props.productsWithBrands.find((p) => p.id === Number(idProd))
      : undefined;
    return { productName: product?.name };
  }, [idProd, props.productsWithBrands]);

  const [brandId, systemId] = useWatch({
    control,
    name: [`idBrand`, `idSyst`],
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
    // Aseguramos que sysconfs y config existen antes de mapear
    return (
      selectedSystem?.sysconfs
        ?.map((sc) => sc.config)
        .filter((c): c is Config => !!c) ?? []
    );
  }, [systemId, props.systemsWithConfigs]);

  // LÓGICA PARA OBTENER LA CONFIG SELECCIONADA
  const selectedConfig = useMemo(() => {
    if (!idConf) return null;
    return availableConfigs.find((c) => c.id === Number(idConf));
  }, [idConf, availableConfigs]);

  const { configuration } = useMemo(() => {
    return { configuration: selectedConfig?.conf };
  }, [selectedConfig]);

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
        ? normalizeInchesToEighthStep(
            currentValues.heightLeft,
            "Height Left",
            1
          )
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

      // 2) Escribir los valores normalizados al form (para que el usuario vea los enteros / 1/8)
      if (widthNorm !== undefined) setValue("width", String(widthNorm));
      if (heightNorm !== undefined) setValue("height", String(heightNorm));
      if (heightLeftNorm !== undefined)
        setValue("heightLeft", String(heightLeftNorm));
      if (heightRightNorm !== undefined)
        setValue("heightRight", String(heightRightNorm));
      if (legHeightNorm !== undefined)
        setValue("legHeight", String(legHeightNorm));

      // 3) DTO para /calculate-piece (como ya lo tenías)
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
          ? Number(currentValues.dealerMarkup || 0) / 100
          : undefined,
      };

      // 4) PRE-CHECK NOA: usar el nuevo validatePiece (POST /preview-dimension)
      const precheck = await validatePiece({
        idSyst: pieceDtoToSend.idSyst,
        idConf: pieceDtoToSend.idConf,
        idCryst: pieceDtoToSend.idCryst,
        width: widthNorm ?? 0,
        height: heightNorm ?? 0,       // altura recta (0 si no aplica)
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
            // Debajo del mínimo permitido
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
            // Por encima del máximo permitido
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
        return; // 🚫 No calcules si no pasa el NOA
      }

      // 5) Si pasó el pre-check, calcula normalmente
      const calculatedMetrics = await calculatePiece(pieceDtoToSend);
      setValue("rate", Number(calculatedMetrics.rate));
      setValue("price", Number(calculatedMetrics.price));
      setValue(
        "subtotal",
        Number(calculatedMetrics.price) * Number(currentValues.qty)
      );

      const piecePrice = Number(calculatedMetrics.price) || 0;
      const pieceQty = Number(currentValues.qty) || 0;
      const markupPercent = Number(currentValues.dealerMarkup) / 100 || 0;
      const baseTotal = piecePrice * pieceQty;
      const dealerProfit = baseTotal * markupPercent;
      const finalTotal = baseTotal + dealerProfit;

      setValue("netProfitD", dealerProfit);
      setValue("total", finalTotal);

      setIsLocked(true);
      if (!activeAccordionItems.includes("item-results")) {
        setActiveAccordionItems((prev) => [...prev, "item-results"]);
      }
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
            {/* --- AccordionItem Frame --- */}
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
                            setValue(`idBrand`, 0);
                            setValue(`idSyst`, 0);
                            setValue(`idConf`, 0);
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
                            setValue(`idSyst`, 0);
                            setValue(`idConf`, 0);
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
                            setValue(`idConf`, 0);
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
            {/* --- AccordionItem Size (con lógica condicional) --- */}
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
                        step="0.01"
                        disabled={isLocked}
                        {...register(`width`, {
                          required: "Width is required",
                        })}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (!raw) return;
                          try {
                            const v = normalizeInchesToEighthStep(
                              raw,
                              "Width",
                              1
                            ); // 👈 mínimo 1"
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
                        step="0.01"
                        disabled={isLocked}
                        {...register(`height`, {
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
                            ); // 👈 mínimo 1"
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
                        step="0.01"
                        disabled={isLocked}
                        {...register(`heightLeft`, {
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
                            ); // 👈 mínimo 1"
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
                        step="0.01"
                        disabled={isLocked}
                        {...register(`heightRight`, {
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
                            ); // 👈 mínimo 1"
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
                        step="0.01"
                        disabled={isLocked}
                        {...register(`legHeight`, {
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
                            ); // 👈 mínimo 1"
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
                  {/* Mensaje si no se requiere ninguna dimensión específica */}
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
                  {/* Mensaje si aún no se ha seleccionado config */}
                  {!idConf && (
                    <p className="text-sm text-muted-foreground col-span-2">
                      Select a configuration to see required dimensions.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            {/* --- AccordionItem Glass --- */}
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
            {/* --- AccordionItem Options --- */}
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
            {/* --- AccordionItem Details & Qty --- */}
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
                      {...register(`mark`, { required: "Mark is required" })}
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
                      {...register(`qty`, {
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
            {/* --- AccordionItem Results (condicional) --- */}
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
                          }).format(price || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold mr-2">
                          Your Price (Total):
                        </span>
                        <strong className="font-mono text-base">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format((price || 0) * (qty || 0))}
                        </strong>
                      </div>
                    </div>
                    {props.isDealer && (
                      <div className="border-t border-green-200 pt-4 space-y-3">
                        <h4 className="font-semibold text-gray-600">
                          Dealer Pricing
                        </h4>
                        <div className="flex items-center gap-4">
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
                            {...register(`dealerMarkup`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                          />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Final Price (for your customer):</span>
                          <strong className="font-mono text-base">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.total || 0)}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Your Net Profit:</span>
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
        {/* --- Columna Derecha: Diagrama --- */}
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
                // heightLeft={Number(heightLeft) || undefined}
                // heightRight={Number(heightRight) || undefined}
                // legHeight={Number(legHeight) || undefined}
              />
            </div>
          </div>
        </div>
      </div>
      {/* --- Footer del Modal --- */}
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
};

// --- COMPONENTE PRINCIPAL: FORMULARIO DEL ESTIMADO ---
export function EstimateForm({
  estimate,
  taxRate,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
}: EstimateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isDealer = user?.role?.name === "dealer";
  const isEditMode = !!estimate;

  const [isPieceModalOpen, setIsPieceModalOpen] = useState(false);
  const [editingPieceIndex, setEditingPieceIndex] = useState<number | null>(
    null
  );
  const [showColorUpdateAlert, setShowColorUpdateAlert] = useState(false);
  const [pendingColorId, setPendingColorId] = useState<number | null>(null);
  const previousColorIdRef = useRef<number>(0);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EstimateFormValues>({
    defaultValues: isEditMode
      ? {
          name: estimate.name,
          generalDealerMarkup: 0,
          pieces: estimate.pieces.map((p: any) => ({
            ...p,
            width: p.width ?? "", // Usar string vacío si es null
            height: p.height ?? "",
            heightLeft: p.heightLeft ?? "",
            heightRight: p.heightRight ?? "",
            legHeight: p.legHeight ?? "",
            rate: p.rate || 0,
            price: p.price || 0,
            subtotal: p.subtotal || 0,
            dealerMarkup: (p.dealerMarkup || 0) * 100, // Convertir a %
            total: p.total || 0,
            netProfitD: p.netProfitD || 0,
          })),
          defaultFrameColorId: 0,
        }
      : {
          name: "",
          generalDealerMarkup: 0,
          pieces: [],
          defaultFrameColorId: 0,
        },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "pieces",
  });
  const watchedPieces = useWatch({ control, name: "pieces" });

  const handleDefaultColorChange = (colorIdStr: string) => {
    const newColorId = Number(colorIdStr);
    const currentColorId = getValues("defaultFrameColorId");

    if (newColorId === 0) {
      setValue("defaultFrameColorId", 0, { shouldDirty: true });
      return;
    }

    if (fields.length > 0 && newColorId !== currentColorId) {
      previousColorIdRef.current = currentColorId;
      setPendingColorId(newColorId);
      setShowColorUpdateAlert(true);
    } else {
      setValue("defaultFrameColorId", newColorId, { shouldDirty: true });
    }
  };

  const updateAllPiecesColor = () => {
    if (pendingColorId === null) return;
    fields.forEach((_, index) => {
      setValue(`pieces.${index}.idFC`, pendingColorId, { shouldDirty: true });
    });
    setValue("defaultFrameColorId", pendingColorId, { shouldDirty: true });
    setShowColorUpdateAlert(false);
    setPendingColorId(null);
    toast.success("All pieces have been updated to the new default color.");
  };

  const setNewColorForFuturePieces = () => {
    if (pendingColorId === null) return;
    setValue("defaultFrameColorId", pendingColorId, { shouldDirty: true });
    setShowColorUpdateAlert(false);
    setPendingColorId(null);
  };

  const handleCancelColorChange = () => {
    setValue("defaultFrameColorId", previousColorIdRef.current);
    setShowColorUpdateAlert(false);
    setPendingColorId(null);
  };

  const generalMarkupValue = useWatch({ control, name: "generalDealerMarkup" });
  const prevGeneralMarkupRef = useRef(generalMarkupValue);

  useEffect(() => {
    if (!isDealer) return;
    const currentPieces = getValues("pieces");
    const prevGeneralMarkup = prevGeneralMarkupRef.current;
    if (generalMarkupValue !== prevGeneralMarkup) {
      currentPieces.forEach((piece, index) => {
        if (piece.dealerMarkup == prevGeneralMarkup) {
          setValue(`pieces.${index}.dealerMarkup`, generalMarkupValue, {
            shouldDirty: true,
          });
          // Recalcular total y netProfitD si el markup general cambia
          const piecePrice = Number(piece.price) || 0;
          const pieceQty = Number(piece.qty) || 0;
          const newMarkupPercent = Number(generalMarkupValue) / 100 || 0;
          const baseTotal = piecePrice * pieceQty;
          const newDealerProfit = baseTotal * newMarkupPercent;
          const newFinalTotal = baseTotal + newDealerProfit;
          setValue(`pieces.${index}.netProfitD`, newDealerProfit, {
            shouldDirty: true,
          });
          setValue(`pieces.${index}.total`, newFinalTotal, {
            shouldDirty: true,
          });
        }
      });
    }
    prevGeneralMarkupRef.current = generalMarkupValue;
  }, [generalMarkupValue, getValues, setValue, isDealer]);

  // --- CÁLCULO DEL SUMMARY (CON CORRECCIÓN) ---
  const summary = useMemo(() => {
    if (!watchedPieces) {
      return {
        totalUnits: 0,
        subtotal: 0,
        taxAmount: 0,
        totalPayable: 0,
        dealerTotal: 0,
        dealerProfit: 0,
        pieceBreakdown: {} as Record<string, number>,
      };
    }
    const breakdown: Record<string, number> = {};
    const totals = watchedPieces.reduce(
      (acc, piece) => {
        // --- ¡AÑADIR ESTA COMPROBACIÓN! ---
        // Si la pieza no existe o no tiene un idProd válido, sáltala.
        if (
          !piece ||
          piece.idProd === undefined ||
          piece.idProd === null ||
          Number(piece.idProd) <= 0
        ) {
          console.warn(
            "Skipping piece in summary calculation due to invalid data:",
            piece
          );
          return acc; // Devuelve el acumulador sin modificar
        }
        // ------------------------------------

        const qty = Number(piece.qty) || 0;
        const unitPrice = Number(piece.price) || 0;
        const unitSubtotal = unitPrice * qty;
        acc.totalUnits += qty;
        acc.subtotal += unitSubtotal;

        const markupPercent = Number(piece.dealerMarkup) / 100 || 0;
        const dealerProfitForPiece = unitSubtotal * markupPercent;
        const finalTotalForPiece = unitSubtotal + dealerProfitForPiece;

        acc.dealerTotal += finalTotalForPiece;
        acc.dealerProfit += dealerProfitForPiece;

        // --- AÑADIR COMPROBACIÓN ANTES DEL FIND ---
        const productIdNumber = Number(piece.idProd);
        if (!isNaN(productIdNumber) && productIdNumber > 0) {
          const product = productsWithBrands.find(
            (p) => p.id === productIdNumber
          );
          if (product) {
            // Solo añadir si se encontró el producto
            breakdown[product.name] = (breakdown[product.name] || 0) + qty;
          }
        }
        // -----------------------------------------
        return acc;
      },
      { totalUnits: 0, subtotal: 0, dealerTotal: 0, dealerProfit: 0 }
    );

    const taxAmount = totals.subtotal * taxRate;
    const totalPayable = totals.subtotal + taxAmount;
    return { ...totals, taxAmount, totalPayable, pieceBreakdown: breakdown };
  }, [watchedPieces, productsWithBrands, taxRate]);
  // --- FIN CÁLCULO DEL SUMMARY ---

  const handleAddNewPiece = () => {
    setEditingPieceIndex(null);
    setIsPieceModalOpen(true);
  };

  const handleEditPiece = (index: number) => {
    setEditingPieceIndex(index);
    setIsPieceModalOpen(true);
  };

  const handleDuplicatePiece = (index: number) => {
    const pieceToDuplicate = getValues(`pieces.${index}`);
    const newPiece = {
      ...pieceToDuplicate,
      id: undefined,
      mark: "",
      rate: 0,
      price: 0,
      subtotal: 0,
      total: 0, // Recalcular
      netProfitD: 0, // Recalcular
    };
    append(newPiece);
    setEditingPieceIndex(fields.length);
    setIsPieceModalOpen(true);
    toast.info("Piece duplicated. Please enter a new mark and recalculate.");
  };

  const handleSavePiece = (data: PieceFormValues) => {
    // Recalcular total y netProfitD antes de guardar, basado en el markup actual de la pieza
    const piecePrice = Number(data.price) || 0;
    const pieceQty = Number(data.qty) || 0;
    const markupPercent = Number(data.dealerMarkup) / 100 || 0;
    const baseTotal = piecePrice * pieceQty;
    const dealerProfit = baseTotal * markupPercent;
    const finalTotal = baseTotal + dealerProfit;
    data.netProfitD = dealerProfit;
    data.total = finalTotal;
    data.subtotal = baseTotal; // Aseguramos que subtotal sea price*qty

    if (editingPieceIndex !== null) {
      update(editingPieceIndex, data);
    } else {
      append(data);
    }
    setIsPieceModalOpen(false);
    setEditingPieceIndex(null);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Función mapPiecesForApi (CORREGIDA para no enviar dealerMarkup y manejar ID)
      const mapPiecesForApi = (
        p: PieceFormValues
      ): CreatePieceData & { id?: number } => {
        const pieceData: CreatePieceData & { id?: number } = {
          ...(p.id !== undefined && { id: p.id }),
          mark: p.mark,
          idProd: Number(p.idProd),
          idBrand: Number(p.idBrand),
          idSyst: Number(p.idSyst),
          idConf: Number(p.idConf),
          idFC: Number(p.idFC),
          width: p.width ? String(p.width) : null,
          height: p.height ? String(p.height) : null,
          heightLeft: p.heightLeft ? String(p.heightLeft) : null,
          heightRight: p.heightRight ? String(p.heightRight) : null,
          legHeight: p.legHeight ? String(p.legHeight) : null,
          idCryst: Number(p.idCryst),
          idTint: Number(p.idTint),
          privacy: p.privacy,
          idCoat: Number(p.idCoat),
          screen: p.screen,
          muntin: p.muntin,
          qty: Number(p.qty),
          // dealerMarkup NO se incluye aquí
        };
        return pieceData;
      };

      if (isEditMode && estimate?.id) {
        const updateData: UpdateEstimateData = {
          name: data.name,
          pieces: data.pieces.map(mapPiecesForApi),
        };
        await updateEstimate(estimate.id, updateData);
        toast.success("Estimate updated successfully!");
      } else {
        const createData: CreateEstimateData = {
          name: data.name,
          // Aseguramos que el tipo coincida con lo esperado por CreateEstimateData
          pieces: data.pieces.map((p) => {
            const mapped = mapPiecesForApi(p);
            // Quitamos el ID explícitamente si existe, aunque mapPiecesForApi ya lo hace opcional
            const { id, ...rest } = mapped;
            return rest as CreatePieceData; // Afirmamos el tipo sin ID
          }),
        };
        await createEstimate(createData);
        toast.success("Estimate created successfully!");
      }
      router.push("/estimates");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "An unexpected error occurred.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  const showLoadingState = isSubmitting;
  const isSubmitDisabled = !isDirty || showLoadingState || fields.length === 0; // Deshabilitar si no hay piezas

  // Lógica para datos iniciales del modal
  const editingPieceData = useMemo(() => {
    if (
      editingPieceIndex !== null &&
      watchedPieces &&
      watchedPieces[editingPieceIndex]
    ) {
      // Añadir check para watchedPieces
      return getValues(`pieces.${editingPieceIndex}`);
    }
    // Valores por defecto para una nueva pieza
    return {
      mark: "",
      idProd: 0,
      idBrand: 0,
      idSyst: 0,
      idConf: 0,
      idFC: getValues("defaultFrameColorId") || 0,
      width: "",
      height: "",
      heightLeft: "",
      heightRight: "",
      legHeight: "", // Incluir todos
      idCryst: 0,
      idTint: 0,
      privacy: false,
      idCoat: 0,
      screen: false,
      muntin: false,
      qty: 1,
      rate: 0,
      price: 0,
      subtotal: 0,
      dealerMarkup: getValues("generalDealerMarkup"), // Usar markup general como default
      total: 0,
      netProfitD: 0,
    };
  }, [editingPieceIndex, getValues, watchedPieces]); // Añadir watchedPieces a dependencias

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-8">
        {/* --- Estimate Details Section --- */}
        <div className="p-6 border rounded-lg bg-slate-50">
          <h3 className="text-xl font-semibold mb-6">Estimate Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              {isEditMode && estimate && (
                <div>
                  <Label>Estimate Number</Label>
                  <Input
                    value={estimate.number}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed border-dashed"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="name">Estimate Name</Label>
                <Input
                  id="name"
                  {...register("name", { required: "The name is required" })}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <Controller
                name="defaultFrameColorId"
                control={control}
                render={({ field }) => (
                  <div>
                    <Label>Default Frame Color</Label>
                    <Select
                      onValueChange={(value) => {
                        handleDefaultColorChange(value);
                      }}
                      value={String(field.value || "0")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a default color..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {frameColors.map((fc) => (
                          <SelectItem key={fc.id} value={String(fc.id)}>
                            {fc.color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              {isDealer && (
                <div>
                  <Label htmlFor="generalDealerMarkup">
                    General Dealer Markup (%)
                  </Label>
                  <Input
                    id="generalDealerMarkup"
                    type="number"
                    step="1"
                    {...register("generalDealerMarkup", {
                      valueAsNumber: true,
                      min: 0,
                    })}
                  />
                </div>
              )}
            </div>
            <div className="border p-3 rounded-md bg-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <Label>Subtotal (Your Price)</Label>
                <span className="font-semibold">
                  {formatCurrency(summary.subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <Label>Sales Tax ({(Number(taxRate) * 100).toFixed(2)}%)</Label>
                <span className="font-semibold">
                  {formatCurrency(summary.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <Label className="font-bold">Total Payable (To You)</Label>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(summary.totalPayable)}
                </span>
              </div>
              {isDealer && (
                <>
                  <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <Label className="font-bold text-green-700">
                      Dealer Final Total
                    </Label>
                    <span className="font-bold text-lg text-green-700">
                      {formatCurrency(summary.dealerTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <Label className="text-green-700">Dealer Net Profit</Label>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(summary.dealerProfit)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Pieces Breakdown</Label>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Qty</Label>
                <Input
                  value={summary.totalUnits}
                  readOnly
                  className="font-bold text-center cursor-not-allowed border-dashed bg-white w-20 h-8"
                />
              </div>
            </div>
            <div className="p-3 border rounded-md bg-slate-100 min-h-[40px] text-sm font-mono flex items-center flex-wrap gap-x-4 gap-y-2">
              {Object.entries(summary.pieceBreakdown).length > 0 ? (
                Object.entries(summary.pieceBreakdown)
                  .map(([name, count]) => `${name}: ${count}`)
                  .join(" | ")
              ) : (
                <span className="text-gray-500 italic">
                  No calculated pieces yet.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- Pieces Section --- */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Pieces</h3>
            <Button type="button" variant="green" onClick={handleAddNewPiece}>
              + Add Piece
            </Button>
          </div>
          <div className="border rounded-lg">
            {fields.map((field, index) => {
              // CORRECCIÓN: Comprobar si watchedPieces[index] existe antes de usarlo
              const currentPieceData = watchedPieces?.[index];
              if (!currentPieceData) return null; // No renderizar si los datos aún no están listos

              const product = productsWithBrands.find(
                (p) => p.id === Number(currentPieceData.idProd)
              );
              const frameColor = frameColors.find(
                (fc) => fc.id === Number(currentPieceData.idFC)
              );
              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 border-b last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {currentPieceData.mark || `Piece #${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product?.name} - {currentPieceData.width || "?"} W x{" "}
                      {currentPieceData.height || "?"} H{" "}
                      {/* Mostrar dimensiones */}
                      {currentPieceData.heightLeft &&
                        ` / ${currentPieceData.heightLeft} HL`}
                      {currentPieceData.heightRight &&
                        ` / ${currentPieceData.heightRight} HR`}
                      {currentPieceData.legHeight &&
                        ` / ${currentPieceData.legHeight} LegH`}
                      - {frameColor?.color} (Qty: {currentPieceData.qty})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Muestra tu precio total (subtotal) */}
                    <p className="font-mono text-right text-sm w-28">
                      {formatCurrency(currentPieceData.subtotal || 0)}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleDuplicatePiece(index)}
                      title="Duplicate Piece"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditPiece(index)}
                      title="Edit Piece"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      title="Delete Piece"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {fields.length === 0 && (
              <p className="text-center text-gray-500 py-6">
                No pieces have been added yet.
              </p>
            )}
          </div>
        </div>

        {/* --- Form Footer --- */}
        <div className="flex justify-end gap-4 mt-8">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="green" disabled={isSubmitDisabled}>
            {showLoadingState && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showLoadingState
              ? "Saving..."
              : isEditMode
              ? "Update Estimate"
              : "Create Estimate"}
          </Button>
        </div>
      </form>

      {/* --- Modal para añadir/editar pieza --- */}
      <Dialog open={isPieceModalOpen} onOpenChange={setIsPieceModalOpen}>
        <DialogContent
          className="max-w-[90vw] lg:max-w-screen-xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingPieceIndex !== null
                ? `Edit Piece - ${
                    editingPieceData.mark || `#${editingPieceIndex + 1}`
                  }`
                : "Add New Piece"}
            </DialogTitle>
          </DialogHeader>
          {/* Añadimos Key prop para asegurar que el formulario se reinicie/actualice */}
          <PieceForm
            key={editingPieceIndex ?? "new"}
            initialData={editingPieceData}
            onSubmit={handleSavePiece}
            onCancel={() => setIsPieceModalOpen(false)}
            index={editingPieceIndex ?? fields.length}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
            frameColors={frameColors}
            crystals={crystals}
            tints={tints}
            coatings={coatings}
            isDealer={isDealer}
          />
        </DialogContent>
      </Dialog>

      {/* --- AlertDialog para confirmar cambio de color --- */}
      <AlertDialog
        open={showColorUpdateAlert}
        onOpenChange={setShowColorUpdateAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 text-yellow-500" />
              Update Frame Color?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have changed the default frame color. Do you want to apply
              this new color to all existing pieces in this estimate?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelColorChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="outline" onClick={setNewColorForFuturePieces}>
                For New Pieces Only
              </Button>
            </AlertDialogAction>
            <AlertDialogAction onClick={updateAllPiecesColor}>
              Yes, Update All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
