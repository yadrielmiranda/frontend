"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  useWatch,
  Control,
  UseFormSetValue,
  UseFormRegister,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Save, Pencil, Calculator } from "lucide-react";
import { createEstimate, updateEstimate } from "@/app/api/estimates.api";
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
  CreateEstimateData,
  EstimateWithRelations,
  ProductWithBrands,
  SystemWithConfigs,
  Config,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Brand,
} from "@/app/api/types";

type FormValues = Omit<CreateEstimateData, "idUser" | "number">;

interface PieceItemProps {
  index: number;
  control: Control<any>; // Se usa 'any' para flexibilidad con useFieldArray
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  remove: (index: number) => void;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  isLocked: boolean;
  onLockToggle: () => void;
  calculatedData?: { price: number; subtotal: number };
  onCalculate: () => void;
}

interface EstimateFormProps {
  estimate?: EstimateWithRelations;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
}

const PieceItem = React.memo(
  ({
    index,
    control,
    register,
    setValue,
    remove,
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
    isLocked,
    onLockToggle,
    calculatedData,
    onCalculate,
  }: PieceItemProps) => {
    const [productId, brandId, systemId] = useWatch({
      control,
      name: [
        `pieces.${index}.idProd`,
        `pieces.${index}.idBrand`,
        `pieces.${index}.idSyst`,
      ],
    });

    const availableBrands = useMemo(() => {
      if (!productId) return [];
      setValue(`pieces.${index}.idBrand`, 0, { shouldValidate: true });
      const selectedProduct = productsWithBrands.find(
        (p) => p.id === Number(productId)
      );
      return selectedProduct
        ? selectedProduct.brandProducts.map((bp) => bp.brand)
        : [];
    }, [productId, productsWithBrands, setValue, index]);

    const availableSystems = useMemo(() => {
      if (!productId || !brandId) return [];
      setValue(`pieces.${index}.idSyst`, 0, { shouldValidate: true });
      return systemsWithConfigs.filter(
        (system) =>
          system.idProduct === Number(productId) &&
          system.idBrand === Number(brandId)
      );
    }, [productId, brandId, systemsWithConfigs, setValue, index]);

    const availableConfigs = useMemo(() => {
      if (!systemId) return [];
      setValue(`pieces.${index}.idConf`, 0, { shouldValidate: true });
      const selectedSystem = systemsWithConfigs.find(
        (s) => s.id === Number(systemId)
      );
      return selectedSystem
        ? selectedSystem.sysconfs.map((sc) => sc.config)
        : [];
    }, [systemId, systemsWithConfigs, setValue, index]);

    return (
      <div
        className={`p-6 border rounded-lg relative space-y-6 bg-white shadow-sm transition-all ${
          isLocked ? "border-green-200" : "border-blue-200"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-lg text-gray-700">
            Pieza #{index + 1}
          </h4>
          <div className="flex gap-2">
            {isLocked ? (
              <Button
                type="button"
                variant="blue"
                size="icon"
                onClick={onLockToggle}
                title="Editar Pieza"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : calculatedData ? (
              <Button
                type="button"
                variant="green"
                size="icon"
                onClick={onLockToggle}
                title="Guardar Pieza"
              >
                <Save className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onCalculate}
                title="Calcular Costo"
              >
                <Calculator className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => remove(index)}
              title="Eliminar Pieza"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <fieldset
          disabled={isLocked}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 disabled:opacity-70"
        >
          <div>
            <Label>Mark</Label>
            <Input {...register(`pieces.${index}.mark`, { required: true })} />
          </div>
          <div>
            <Label>Ancho</Label>
            <Input {...register(`pieces.${index}.width`, { required: true })} />
          </div>
          <div>
            <Label>Alto</Label>
            <Input
              {...register(`pieces.${index}.height`, { required: true })}
            />
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              {...register(`pieces.${index}.qty`, {
                required: true,
                valueAsNumber: true,
                min: 1,
              })}
            />
          </div>

          <div>
            <Label>Producto</Label>
            <Controller
              name={`pieces.${index}.idProd`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
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
            <Label>Marca</Label>
            <Controller
              name={`pieces.${index}.idBrand`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                  disabled={!productId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto..." />
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
            <Label>Sistema</Label>
            <Controller
              name={`pieces.${index}.idSyst`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                  disabled={!brandId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca..." />
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
            <Label>Configuración</Label>
            <Controller
              name={`pieces.${index}.idConf`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                  disabled={!systemId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sistema..." />
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
            <Label>Color de Marco</Label>
            <Controller
              name={`pieces.${index}.idFC`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {frameColors.map((fc) => (
                      <SelectItem key={fc.id} value={String(fc.id)}>
                        {fc.color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Cristal</Label>
            <Controller
              name={`pieces.${index}.idCryst`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
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
          <div>
            <Label>Tinte</Label>
            <Controller
              name={`pieces.${index}.idTint`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tints.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Recubrimiento</Label>
            <Controller
              name={`pieces.${index}.idCoat`}
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={String(field.value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coatings.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </fieldset>
        <div className="flex items-center space-x-6 pt-4">
          <Controller
            name={`pieces.${index}.privacy`}
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`privacy-${index}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLocked}
                />
                <Label htmlFor={`privacy-${index}`}>Privacidad</Label>
              </div>
            )}
          />
          <Controller
            name={`pieces.${index}.screen`}
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`screen-${index}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLocked}
                />
                <Label htmlFor={`screen-${index}`}>Malla</Label>
              </div>
            )}
          />
          <Controller
            name={`pieces.${index}.muntin`}
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
        {calculatedData && !isLocked && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p>
              Costo Calculado:{" "}
              <strong className="font-mono">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(calculatedData.subtotal)}
              </strong>
            </p>
          </div>
        )}
      </div>
    );
  }
);
PieceItem.displayName = "PieceItem";

export function EstimateForm({
  estimate,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
}: EstimateFormProps) {
  const router = useRouter();
  const isEditMode = !!estimate;
  const [lockedPieceIds, setLockedPieceIds] = useState<Set<string>>(new Set());
  const [calculatedPieceData, setCalculatedPieceData] = useState<{
    [id: string]: { price: number; subtotal: number };
  }>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const initialSetupDone = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: isEditMode
      ? {
          name: estimate.name,
          pieces: estimate.pieces,
        }
      : {
          name: "",
          pieces: [],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "pieces" });

  useEffect(() => {
    if (isEditMode && !initialSetupDone.current) {
      const initialLockedIds = new Set(fields.map((field) => field.id));
      setLockedPieceIds(initialLockedIds);
      initialSetupDone.current = true;
    }
  }, [isEditMode, fields]);

  const handleCalculatePiece = (index: number) => {
    const pieceValues = getValues(`pieces.${index}`);
    let priceNumber = 100.0;
    if (pieceValues.screen) priceNumber += 20;
    if (pieceValues.muntin) priceNumber += 15;
    const subtotalNumber = priceNumber * (pieceValues.qty || 1);

    const pieceId = fields[index].id;
    setCalculatedPieceData((prev) => ({
      ...prev,
      [pieceId]: { price: priceNumber, subtotal: subtotalNumber },
    }));
    toast.info("Costo de la pieza calculado.");
  };

  const handleLockToggle = (id: string) => {
    setLockedPieceIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        setCalculatedPieceData((currentData) => {
          const newData = { ...currentData };
          delete newData[id];
          return newData;
        });
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleRemovePiece = (index: number) => {
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pieceId);
      return newSet;
    });
    setCalculatedPieceData((currentData) => {
      const newData = { ...currentData };
      delete newData[pieceId];
      return newData;
    });
    remove(index);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEditMode) {
        await updateEstimate(estimate.id, data);
        toast.success("Estimate updated successfully!");
      } else {
        await createEstimate(data as CreateEstimateData);
        toast.success("Estimate created successfully!");
      }

      setIsSuccess(true);
      router.push("/estimates");
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  const addNewPiece = () => {
    append({
      mark: "",
      idProd: 0,
      idBrand: 0,
      idSyst: 0,
      idConf: 0,
      idFC: 0,
      width: "",
      height: "",
      idCryst: 0,
      idTint: 0,
      privacy: false,
      idCoat: 0,
      screen: false,
      muntin: false,
      qty: 1,
    });
  };

  const canAddPiece = fields.length === lockedPieceIds.size;
  const showLoadingState = isSubmitting || isSuccess;
  const isSubmitDisabled =
    (!isDirty && isEditMode) || showLoadingState || !canAddPiece;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="p-6 border rounded-lg bg-slate-50">
        <h3 className="text-xl font-semibold mb-6">Detalles del Presupuesto</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Número de Presupuesto</Label>
            <Input
              value={isEditMode ? estimate.number : "Se generará al guardar"}
              readOnly
              className="bg-gray-100 cursor-not-allowed border-dashed"
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre del Presupuesto</Label>
            <Input
              id="name"
              {...register("name", { required: "El nombre es requerido" })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Piezas</h3>
          <Button
            type="button"
            variant={canAddPiece ? "green" : "outline"}
            onClick={addNewPiece}
            disabled={!canAddPiece}
          >
            + Añadir Pieza
          </Button>
        </div>
        {fields.map((field, index) => (
          <PieceItem
            key={field.id}
            index={index}
            control={control}
            register={register}
            setValue={setValue}
            remove={handleRemovePiece}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
            frameColors={frameColors}
            crystals={crystals}
            tints={tints}
            coatings={coatings}
            isLocked={lockedPieceIds.has(field.id)}
            onLockToggle={() => handleLockToggle(field.id)}
            calculatedData={calculatedPieceData[field.id]}
            onCalculate={() => handleCalculatePiece(index)}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            Aún no se han añadido piezas.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="green" disabled={isSubmitDisabled}>
          {showLoadingState && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {showLoadingState
            ? "Guardando..."
            : isEditMode
            ? "Actualizar Presupuesto"
            : "Crear Presupuesto"}
        </Button>
      </div>
    </form>
  );
}
