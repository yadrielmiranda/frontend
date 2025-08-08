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
import { Loader2, Trash2, Pencil, Calculator } from "lucide-react";
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
  CreatePieceData,
  EstimateWithRelations,
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Config,
} from "@/app/api/types";
import { PieceDiagram } from "@/components/piece-diagram";


// --- Tipos para el Formulario ---
interface PieceFormValues extends CreatePieceData {
  id?: number;
  price: number;
  subtotal: number;
}

interface EstimateFormValues {
  name: string;
  pieces: PieceFormValues[];
}

// --- Props del Componente ---
interface EstimateFormProps {
  estimate?: EstimateWithRelations;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
}

interface PieceItemProps {
  index: number;
  control: Control<EstimateFormValues>;
  register: UseFormRegister<EstimateFormValues>;
  setValue: UseFormSetValue<EstimateFormValues>;
  remove: (index: number) => void;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  isLocked: boolean;
  onCalculateAndLock: () => void;
  onUnlock: () => void;
}

const PieceItem = React.memo(
  ({
    index,
    control,
    register,
    setValue,
    remove,
    isLocked,
    onCalculateAndLock,
    onUnlock,
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
  }: PieceItemProps) => {
    const pieceSubtotal = useWatch({
      control,
      name: `pieces.${index}.subtotal`,
    });

    const [pieceWidth, pieceHeight, productId, brandId, systemId, configId] = useWatch({
      control,
      name: [
        `pieces.${index}.width`,
        `pieces.${index}.height`,
        `pieces.${index}.idProd`,
        `pieces.${index}.idBrand`,
        `pieces.${index}.idSyst`,
        `pieces.${index}.idConf`,
      ],
    });

    const availableBrands = useMemo(() => {
        if (!productId) return [];
        const selectedProduct = productsWithBrands.find(p => p.id === Number(productId));
        return selectedProduct ? selectedProduct.brandProducts.map(bp => bp.brand) : [];
    }, [productId, productsWithBrands]);

    const availableSystems = useMemo(() => {
        if (!productId || !brandId) return [];
        return systemsWithConfigs.filter(system => system.idProduct === Number(productId) && system.idBrand === Number(brandId));
    }, [productId, brandId, systemsWithConfigs]);

    const availableConfigs = useMemo(() => {
      if (!systemId) return [];
      const selectedSystem = systemsWithConfigs.find(s => s.id === Number(systemId));
      return selectedSystem ? selectedSystem.sysconfs.map(sc => sc.config) : [];
    }, [systemId, systemsWithConfigs]);

    const { productName, configuration } = useMemo(() => {
        const product = productId ? productsWithBrands.find(p => p.id === Number(productId)) : undefined;
        const config = configId ? availableConfigs.find(c => c.id === Number(configId)) : undefined;
        return {
            productName: product?.name,
            configuration: config?.conf
        }
    }, [productId, configId, productsWithBrands, availableConfigs]);


    return (
      <div
        className={`p-6 border rounded-lg relative space-y-6 bg-white shadow-sm transition-all ${
          isLocked ? "border-green-200" : "border-blue-200"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-lg text-gray-700">
            Piece #{index + 1}
          </h4>
          <div className="flex gap-2">
            {isLocked ? (
              <Button type="button" variant="blue" size="icon" onClick={onUnlock} title="Edit Piece">
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" variant="green" size="icon" onClick={onCalculateAndLock} title="Calculate & Save Piece">
                <Calculator className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} title="Delete Piece">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <fieldset
              disabled={isLocked}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-70 col-span-1 md:col-span-2"
            >
              <div><Label>Mark</Label><Input {...register(`pieces.${index}.mark`, { required: true })} /></div>
              <div><Label>Width</Label><Input {...register(`pieces.${index}.width`, { required: true })} /></div>
              <div><Label>Height</Label><Input {...register(`pieces.${index}.height`, { required: true })} /></div>
              <div><Label>Quantity</Label><Input type="number" {...register(`pieces.${index}.qty`, { required: true, valueAsNumber: true, min: 1 })} /></div>

              <div><Label>Product</Label><Controller name={`pieces.${index}.idProd`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idBrand`, 0); setValue(`pieces.${index}.idSyst`, 0); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{productsWithBrands.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Brand</Label><Controller name={`pieces.${index}.idBrand`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idSyst`, 0); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")} disabled={!productId}><SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger><SelectContent>{availableBrands.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>System</Label><Controller name={`pieces.${index}.idSyst`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")} disabled={!brandId}><SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger><SelectContent>{availableSystems.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Configuration</Label><Controller name={`pieces.${index}.idConf`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")} disabled={!systemId}><SelectTrigger><SelectValue placeholder="Select system..." /></SelectTrigger><SelectContent>{availableConfigs.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.conf}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Frame Color</Label><Controller name={`pieces.${index}.idFC`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{frameColors.map((fc) => (<SelectItem key={fc.id} value={String(fc.id)}>{fc.color}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Glass</Label><Controller name={`pieces.${index}.idCryst`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{crystals.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.glass}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Tint</Label><Controller name={`pieces.${index}.idTint`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{tints.map((t) => (<SelectItem key={t.id} value={String(t.id)}>{t.color}</SelectItem>))}</SelectContent></Select>)} /></div>
              <div><Label>Coating</Label><Controller name={`pieces.${index}.idCoat`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{coatings.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent></Select>)} /></div>
            </fieldset>

            <div className="hidden md:flex items-center justify-center min-h-[250px]">
                <PieceDiagram
                    width={Number(pieceWidth) || 0} 
                    height={Number(pieceHeight) || 0}
                    productName={productName}
                    configuration={configuration}
                />
            </div>
        </div>

        <div className="flex items-center space-x-6 pt-4">
          <Controller name={`pieces.${index}.privacy`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`privacy-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`privacy-${index}`}>Privacy</Label></div>)} />
          <Controller name={`pieces.${index}.screen`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`screen-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`screen-${index}`}>Screen</Label></div>)} />
          <Controller name={`pieces.${index}.muntin`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`muntin-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`muntin-${index}`}>Muntin</Label></div>)} />
        </div>
        
        {isLocked && pieceSubtotal > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p>Calculated Cost: <strong className="font-mono">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pieceSubtotal)}</strong></p>
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
  const [isSuccess, setIsSuccess] = useState(false);
  const initialSetupDone = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EstimateFormValues>({
    defaultValues: isEditMode
      ? { name: estimate.name, pieces: estimate.pieces.map((p) => ({ ...p, price: p.price || 0, subtotal: p.subtotal || 0 })) }
      : { name: "", pieces: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "pieces" });

  useEffect(() => {
    if (isEditMode && !initialSetupDone.current) {
      const initialLockedIds = new Set(fields.map((field) => field.id));
      setLockedPieceIds(initialLockedIds);
      initialSetupDone.current = true;
    }
  }, [isEditMode, fields]);

  const handleCalculateAndLockPiece = (index: number) => {
    const pieceValues = getValues(`pieces.${index}`);
    let priceNumber = 100.0;
    if (pieceValues.screen) priceNumber += 20;
    if (pieceValues.muntin) priceNumber += 15;
    const subtotalNumber = priceNumber * (pieceValues.qty || 1);
    setValue(`pieces.${index}.price`, priceNumber, { shouldDirty: true });
    setValue(`pieces.${index}.subtotal`, subtotalNumber, { shouldDirty: true });
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => new Set(prev).add(pieceId));
    toast.success("Piece calculated and saved.");
  };

  const handleUnlockPiece = (index: number) => {
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    setValue(`pieces.${index}.price`, 0);
    setValue(`pieces.${index}.subtotal`, 0);
    toast.info("Piece unlocked for editing.");
  };

  const handleRemovePiece = (index: number) => {
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    remove(index);
    toast.error("Piece deleted.");
  };

  const onSubmit = handleSubmit(async (data) => {
    const dataToSend = { ...data, pieces: data.pieces.map(({ price, subtotal, ...piece }) => piece) };
    try {
      if (isEditMode) {
        await updateEstimate(estimate.id, dataToSend);
        toast.success("Estimate updated successfully!");
      } else {
        await createEstimate(dataToSend as CreateEstimateData);
        toast.success("Estimate created successfully!");
      }
      setIsSuccess(true);
      router.push("/estimates");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  });

  const addNewPiece = () => {
    append({
      mark: "", idProd: 0, idBrand: 0, idSyst: 0, idConf: 0, idFC: 0, width: "", height: "",
      idCryst: 0, idTint: 0, privacy: false, idCoat: 0, screen: false, muntin: false, qty: 1,
      price: 0, subtotal: 0,
    });
  };

  const canAddPiece = fields.length === lockedPieceIds.size;
  const showLoadingState = isSubmitting || isSuccess;
  const isCreateModeAndPiecesUnlocked = !isEditMode && !canAddPiece;
  const isSubmitDisabled = !isDirty || showLoadingState || isCreateModeAndPiecesUnlocked;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="p-6 border rounded-lg bg-slate-50">
        <h3 className="text-xl font-semibold mb-6">Estimate Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><Label>Estimate Number</Label><Input value={isEditMode ? estimate.number : "Will be generated upon saving"} readOnly className="bg-gray-100 cursor-not-allowed border-dashed" /></div>
          <div><Label htmlFor="name">Estimate Name</Label><Input id="name" {...register("name", { required: "The name is required" })} />{errors.name && (<p className="text-red-500 text-xs mt-1">{errors.name.message}</p>)}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Pieces</h3>
          <Button type="button" variant={canAddPiece ? "green" : "outline"} onClick={addNewPiece} disabled={!canAddPiece}>+ Add Piece</Button>
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
            onCalculateAndLock={() => handleCalculateAndLockPiece(index)}
            onUnlock={() => handleUnlockPiece(index)}
          />
        ))}
        {fields.length === 0 && (<p className="text-center text-gray-500 py-4">No pieces have been added yet.</p>)}
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant="green" disabled={isSubmitDisabled}>
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Saving..." : isEditMode ? "Update Estimate" : "Create Estimate"}
        </Button>
      </div>
    </form>
  );
}