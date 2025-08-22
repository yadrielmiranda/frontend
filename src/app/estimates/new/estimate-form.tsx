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
import { Loader2, Trash2, Pencil, Calculator, ChevronUp, ChevronDown } from "lucide-react";
import { createEstimate, updateEstimate, calculatePiece } from "@/app/api/estimates.api";
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
  UpdateEstimateData,
} from "@/app/api/types";
import { PieceDiagram } from "@/components/piece-diagram";
import { useAuth } from "@/contexts/AuthContext";

// --- Tipos para el Formulario ---
interface PieceFormValues extends CreatePieceData {
  id?: number;
  rate: number;
  price: number;
  subtotal: number;
  dealerMarkup: number;
  total: number;
  netProfitD: number;
}

interface EstimateFormValues {
  name: string;
  generalDealerMarkup: number;
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

// --- Componente de Pieza ---
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDealer: boolean;
}

const PieceItem = React.memo(
  ({
    index, control, register, setValue, remove, isLocked, onCalculateAndLock, onUnlock,
    productsWithBrands, systemsWithConfigs, frameColors, crystals, tints, coatings,
    isCollapsed, onToggleCollapse, isDealer
  }: PieceItemProps) => {
    const pieceValues = useWatch({ control, name: `pieces.${index}`});
    const { idProd, idConf, width, height, mark, qty, price, dealerMarkup } = pieceValues;

    useEffect(() => {
      if (isDealer && isLocked) {
        const piecePrice = Number(price) || 0;
        const pieceQty = Number(qty) || 0;
        const markupPercent = Number(dealerMarkup) / 100 || 0;
        const baseTotal = piecePrice * pieceQty;
        const dealerProfit = baseTotal * markupPercent;
        const finalTotal = baseTotal + dealerProfit;
        setValue(`pieces.${index}.netProfitD`, dealerProfit, { shouldDirty: true });
        setValue(`pieces.${index}.total`, finalTotal, { shouldDirty: true });
      }
    }, [price, qty, dealerMarkup, isLocked, isDealer, index, setValue]);

    const { productName } = useMemo(() => {
        const product = idProd ? productsWithBrands.find(p => p.id === Number(idProd)) : undefined;
        return { productName: product?.name };
    }, [idProd, productsWithBrands]);

    const [ brandId, systemId] = useWatch({ control, name: [ `pieces.${index}.idBrand`, `pieces.${index}.idSyst`] });
    const availableBrands = useMemo(() => {
      if (!idProd) return [];
      const selectedProduct = productsWithBrands.find(p => p.id === Number(idProd));
      return selectedProduct ? selectedProduct.brandProducts.map(bp => bp.brand) : [];
    }, [idProd, productsWithBrands]);
    const availableSystems = useMemo(() => {
      if (!idProd || !brandId) return [];
      return systemsWithConfigs.filter(system => system.idProduct === Number(idProd) && system.idBrand === Number(brandId));
    }, [idProd, brandId, systemsWithConfigs]);
    const availableConfigs = useMemo(() => {
      if (!systemId) return [];
      const selectedSystem = systemsWithConfigs.find(s => s.id === Number(systemId));
      return selectedSystem ? selectedSystem.sysconfs.map(sc => sc.config) : [];
    }, [systemId, systemsWithConfigs]);
    const { configuration } = useMemo(() => {
        const config = idConf ? availableConfigs.find(c => c.id === Number(idConf)) : undefined;
        return { configuration: config?.conf }
    }, [idConf, availableConfigs]);

    return (
        <div className={`p-6 border rounded-lg relative bg-white shadow-sm transition-all ${isLocked ? "border-green-200" : "border-blue-200"}`}>
            <div className="flex justify-between items-center">
                <div className="font-bold text-lg text-gray-700 truncate pr-4">
                    {isCollapsed && isLocked ? (<span>Piece #{index + 1}: {mark} - {productName} ({width}" x {height}") - Qty: {qty}</span>) : (<span>Piece #{index + 1}</span>)}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {isLocked && (<Button type="button" variant="ghost" size="icon" onClick={onToggleCollapse} title={isCollapsed ? "Expand" : "Collapse"}>{isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}</Button>)}
                    {isLocked ? (<Button type="button" variant="blue" size="icon" onClick={onUnlock} title="Edit Piece"><Pencil className="h-4 w-4" /></Button>) : (<Button type="button" variant="green" size="icon" onClick={onCalculateAndLock} title="Calculate & Save Piece"><Calculator className="h-4 w-4" /></Button>)}
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} title="Delete Piece"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>
            {!isCollapsed && (
                <div className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <fieldset disabled={isLocked} className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-70 col-span-1 md:col-span-2">
                            <div><Label>Mark</Label><Input {...register(`pieces.${index}.mark`, { required: true })} /></div>
                            <div><Label>Width</Label><Input {...register(`pieces.${index}.width`, { required: true })} /></div>
                            <div><Label>Height</Label><Input {...register(`pieces.${index}.height`, { required: true })} /></div>
                            <div><Label>Quantity</Label><Input type="number" {...register(`pieces.${index}.qty`, { required: true, valueAsNumber: true, min: 1 })} /></div>
                            <div><Label>Product</Label><Controller name={`pieces.${index}.idProd`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idBrand`, 0); setValue(`pieces.${index}.idSyst`, 0); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{productsWithBrands.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Brand</Label><Controller name={`pieces.${index}.idBrand`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idSyst`, 0); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")} disabled={!idProd}><SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger><SelectContent>{availableBrands.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>System</Label><Controller name={`pieces.${index}.idSyst`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => { field.onChange(Number(v)); setValue(`pieces.${index}.idConf`, 0); }} value={String(field.value || "0")} disabled={!brandId}><SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger><SelectContent>{availableSystems.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Configuration</Label><Controller name={`pieces.${index}.idConf`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")} disabled={!systemId}><SelectTrigger><SelectValue placeholder="Select system..." /></SelectTrigger><SelectContent>{availableConfigs.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.conf}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Frame Color</Label><Controller name={`pieces.${index}.idFC`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{frameColors.map((fc) => (<SelectItem key={fc.id} value={String(fc.id)}>{fc.color}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Glass</Label><Controller name={`pieces.${index}.idCryst`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{crystals.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.glass}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Tint</Label><Controller name={`pieces.${index}.idTint`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{tints.map((t) => (<SelectItem key={t.id} value={String(t.id)}>{t.color}</SelectItem>))}</SelectContent></Select>)} /></div>
                            <div><Label>Coating</Label><Controller name={`pieces.${index}.idCoat`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "0")}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{coatings.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent></Select>)} /></div>
                        </fieldset>
                        <div className="hidden md:flex items-center justify-center min-h-[250px]"><PieceDiagram width={Number(width) || 0} height={Number(height) || 0} productName={productName} configuration={configuration}/></div>
                    </div>
                    <div className="flex items-center space-x-6 pt-4">
                        <Controller name={`pieces.${index}.privacy`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`privacy-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`privacy-${index}`}>Privacy</Label></div>)} />
                        <Controller name={`pieces.${index}.screen`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`screen-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`screen-${index}`}>Screen</Label></div>)} />
                        <Controller name={`pieces.${index}.muntin`} control={control} render={({ field }) => (<div className="flex items-center space-x-2"><Checkbox id={`muntin-${index}`} checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /><Label htmlFor={`muntin-${index}`}>Muntin</Label></div>)} />
                    </div>
                    {isLocked && pieceValues.price > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                            <div className="flex justify-between items-center flex-wrap gap-4 text-sm">
                                <div><span className="font-semibold mr-2">Your Price (Unit):</span><strong className="font-mono text-base">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pieceValues.price)}</strong><span className="text-gray-600 italic ml-2">(Qty: {pieceValues.qty})</span></div>
                                <div><span className="font-semibold mr-2">Your Price (Total):</span><strong className="font-mono text-base">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pieceValues.price * pieceValues.qty)}</strong></div>
                            </div>
                            {isDealer && (
                                <div className="border-t border-green-200 pt-4 space-y-3">
                                    <h4 className="font-semibold text-gray-600">Dealer Pricing</h4>
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor={`dealerMarkup-${index}`} className="flex-shrink-0">Dealer Markup (%)</Label>
                                        <Input id={`dealerMarkup-${index}`} type="number" step="1" className="w-24" {...register(`pieces.${index}.dealerMarkup`, { valueAsNumber: true, min: 0 })} />
                                    </div>
                                    <div className="flex justify-between items-center text-sm"><span>Final Price (for your customer):</span><strong className="font-mono text-base">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pieceValues.total || 0)}</strong></div>
                                    <div className="flex justify-between items-center text-sm"><span>Your Net Profit:</span><strong className="font-mono text-base text-green-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pieceValues.netProfitD || 0)}</strong></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  }
);
PieceItem.displayName = "PieceItem";

// --- Componente Principal del Formulario ---
export function EstimateForm({
  estimate, taxRate, productsWithBrands, systemsWithConfigs,
  frameColors, crystals, tints, coatings,
}: EstimateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isDealer = user?.role?.name === 'dealer';
  const isEditMode = !!estimate;
  const [lockedPieceIds, setLockedPieceIds] = useState<Set<string>>(new Set());
  const [collapsedPieceIds, setCollapsedPieceIds] = useState<Set<string>>(new Set());
  const [isSuccess, setIsSuccess] = useState(false);
  const initialSetupDone = useRef(false);

  const {
    register, control, handleSubmit, setValue, getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EstimateFormValues>({
    defaultValues: isEditMode
      ? { name: estimate.name, generalDealerMarkup: 0, pieces: estimate.pieces.map((p: any) => ({ ...p, rate: p.rate || 0, price: p.price || 0, subtotal: p.subtotal || 0, dealerMarkup: (p.dealerMarkup || 0) * 100, total: 0, netProfitD: p.netProfitD || 0 })) }
      : { name: "", generalDealerMarkup: 0, pieces: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "pieces" });
  const watchedPieces = useWatch({ control, name: "pieces" });
  
  const generalMarkupValue = useWatch({ control, name: "generalDealerMarkup" });
  const prevGeneralMarkupRef = useRef(generalMarkupValue);

  useEffect(() => {
    if (!isDealer) return;
    const currentPieces = getValues("pieces");
    const prevGeneralMarkup = prevGeneralMarkupRef.current;
    if (generalMarkupValue !== prevGeneralMarkup) {
      currentPieces.forEach((piece, index) => {
        if (piece.dealerMarkup == prevGeneralMarkup) {
          setValue(`pieces.${index}.dealerMarkup`, generalMarkupValue, { shouldDirty: true });
        }
      });
    }
    prevGeneralMarkupRef.current = generalMarkupValue;
  }, [generalMarkupValue, getValues, setValue, isDealer]);
  
  const summary = useMemo(() => {
    if (!watchedPieces) { return { totalUnits: 0, subtotal: 0, taxAmount: 0, totalPayable: 0, dealerTotal: 0, dealerProfit: 0, pieceBreakdown: {} as Record<string, number> }; }
    const breakdown: Record<string, number> = {};
    const totals = watchedPieces.reduce((acc, piece, index) => {
      const pieceId = fields[index]?.id;
      const qty = Number(piece.qty) || 0;
      acc.totalUnits += qty;
      if (lockedPieceIds.has(pieceId)) {
        acc.subtotal += (Number(piece.price) || 0) * qty;
        acc.dealerTotal += (Number(piece.total) || 0);
        acc.dealerProfit += (Number(piece.netProfitD) || 0);
      }
      if (piece.idProd) {
        const product = productsWithBrands.find(p => p.id === Number(piece.idProd));
        if (product) { breakdown[product.name] = (breakdown[product.name] || 0) + qty; }
      }
      return acc;
    }, { totalUnits: 0, subtotal: 0, dealerTotal: 0, dealerProfit: 0 });
    const taxAmount = totals.subtotal * taxRate;
    const totalPayable = totals.subtotal + taxAmount;
    return { ...totals, taxAmount, totalPayable, pieceBreakdown: breakdown };
  }, [watchedPieces, lockedPieceIds, fields, productsWithBrands, taxRate]);

  useEffect(() => {
    if (isEditMode && !initialSetupDone.current) {
      const initialLockedIds = new Set(fields.map((field) => field.id));
      setLockedPieceIds(initialLockedIds);
      setCollapsedPieceIds(initialLockedIds);
      initialSetupDone.current = true;
    }
  }, [isEditMode, fields]);

  const handleToggleCollapse = (pieceId: string) => { setCollapsedPieceIds(prev => { const newSet = new Set(prev); newSet.has(pieceId) ? newSet.delete(pieceId) : newSet.add(pieceId); return newSet; }); };

  const handleCalculateAndLockPiece = async (index: number) => {
    try {
      const pieceValues = getValues(`pieces.${index}`);
      const calculatedMetrics = await calculatePiece(pieceValues);
      setValue(`pieces.${index}.rate`, Number(calculatedMetrics.rate), { shouldDirty: true });
      setValue(`pieces.${index}.price`, Number(calculatedMetrics.price), { shouldDirty: true });
      setValue(`pieces.${index}.subtotal`, Number(calculatedMetrics.price) * Number(pieceValues.qty), { shouldDirty: true });
      const pieceId = fields[index].id;
      setLockedPieceIds((prev) => new Set(prev).add(pieceId));
      toast.success("Piece calculated and saved.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleUnlockPiece = (index: number) => {
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    setCollapsedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    setValue(`pieces.${index}.rate`, 0); setValue(`pieces.${index}.price`, 0); setValue(`pieces.${index}.subtotal`, 0);
    setValue(`pieces.${index}.dealerMarkup`, getValues("generalDealerMarkup"));
    setValue(`pieces.${index}.total`, 0); setValue(`pieces.${index}.netProfitD`, 0);
    toast.info("Piece unlocked for editing.");
  };

  const handleRemovePiece = (index: number) => {
    const pieceId = fields[index].id;
    setLockedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    setCollapsedPieceIds((prev) => { const newSet = new Set(prev); newSet.delete(pieceId); return newSet; });
    remove(index);
    toast.error("Piece deleted.");
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const mapPiecesForApi = (p: PieceFormValues) => ({
        id: p.id, mark: p.mark, idProd: p.idProd, idBrand: p.idBrand, idSyst: p.idSyst, idConf: p.idConf, idFC: p.idFC,
        width: p.width, height: p.height, idCryst: p.idCryst, idTint: p.idTint, privacy: p.privacy, idCoat: p.idCoat,
        screen: p.screen, muntin: p.muntin, qty: p.qty, dealerMarkup: p.dealerMarkup,
      });
      if (isEditMode) {
        const updateData: UpdateEstimateData = { name: data.name, pieces: data.pieces.map(mapPiecesForApi) };
        await updateEstimate(estimate.id, updateData);
        toast.success("Estimate updated successfully!");
      } else {
        const createData: CreateEstimateData = { name: data.name, pieces: data.pieces.map(mapPiecesForApi) };
        await createEstimate(createData);
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
    setCollapsedPieceIds(new Set(lockedPieceIds));
    append({
      mark: "", idProd: 0, idBrand: 0, idSyst: 0, idConf: 0, idFC: 0, width: "", height: "",
      idCryst: 0, idTint: 0, privacy: false, idCoat: 0, screen: false, muntin: false, qty: 1,
      rate: 0, price: 0, subtotal: 0, 
      dealerMarkup: getValues("generalDealerMarkup"),
      total: 0, netProfitD: 0,
    });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  const canAddPiece = fields.length === lockedPieceIds.size;
  const showLoadingState = isSubmitting || isSuccess;
  const isCreateModeAndPiecesUnlocked = !isEditMode && !canAddPiece;
  const isSubmitDisabled = !isDirty || showLoadingState || isCreateModeAndPiecesUnlocked;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="p-6 border rounded-lg bg-slate-50">
        <h3 className="text-xl font-semibold mb-6">Estimate Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
                {isEditMode && (<div><Label>Estimate Number</Label><Input value={estimate.number} readOnly className="bg-gray-100 cursor-not-allowed border-dashed" /></div>)}
                <div>
                    <Label htmlFor="name">Estimate Name</Label>
                    <Input id="name" {...register("name", { required: "The name is required" })} />
                    {errors.name && (<p className="text-red-500 text-xs mt-1">{errors.name.message}</p>)}
                </div>
                {isDealer && (
                    <div>
                        <Label htmlFor="generalDealerMarkup">General Dealer Markup (%)</Label>
                        <Input id="generalDealerMarkup" type="number" step="1" {...register("generalDealerMarkup", { valueAsNumber: true, min: 0 })} />
                    </div>
                )}
            </div>
            <div className="border p-3 rounded-md bg-slate-100 space-y-2">
                <div className="flex justify-between items-center text-sm"><Label>Subtotal (Your Price)</Label><span className="font-semibold">{formatCurrency(summary.subtotal)}</span></div>
                <div className="flex justify-between items-center text-sm"><Label>Sales Tax ({ (taxRate * 100).toFixed(2) }%)</Label><span className="font-semibold">{formatCurrency(summary.taxAmount)}</span></div>
                <div className="flex justify-between items-center border-t pt-2 mt-2"><Label className="font-bold">Total Payable (To You)</Label><span className="font-bold text-lg text-blue-600">{formatCurrency(summary.totalPayable)}</span></div>
                {isDealer && (
                  <>
                    <div className="flex justify-between items-center border-t pt-2 mt-2"><Label className="font-bold text-green-700">Dealer Final Total</Label><span className="font-bold text-lg text-green-700">{formatCurrency(summary.dealerTotal)}</span></div>
                    <div className="flex justify-between items-center text-sm"><Label className="text-green-700">Dealer Net Profit</Label><span className="font-semibold text-green-700">{formatCurrency(summary.dealerProfit)}</span></div>
                  </>
                )}
            </div>
        </div>
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2"><Label>Pieces Breakdown</Label><div className="flex items-center gap-2"><Label className="text-sm font-medium">Qty</Label><Input value={summary.totalUnits} readOnly className="font-bold text-center cursor-not-allowed border-dashed bg-white w-20 h-8"/></div></div>
            <div className="p-3 border rounded-md bg-slate-100 min-h-[40px] text-sm font-mono flex items-center flex-wrap gap-x-4 gap-y-2">
                {Object.entries(summary.pieceBreakdown).length > 0 ? (Object.entries(summary.pieceBreakdown).map(([name, count]) => `${name}: ${count}`).join(' | ')) : (<span className="text-gray-500 italic">No calculated pieces yet.</span>)}
            </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center"><h3 className="text-xl font-semibold">Pieces</h3><Button type="button" variant={canAddPiece ? "green" : "outline"} onClick={addNewPiece} disabled={!canAddPiece}>+ Add Piece</Button></div>
        {fields.map((field, index) => (
          <PieceItem
            key={field.id} index={index} control={control} register={register} setValue={setValue}
            remove={handleRemovePiece} productsWithBrands={productsWithBrands} systemsWithConfigs={systemsWithConfigs}
            frameColors={frameColors} crystals={crystals} tints={tints} coatings={coatings}
            isLocked={lockedPieceIds.has(field.id)}
            onCalculateAndLock={() => handleCalculateAndLockPiece(index)}
            onUnlock={() => handleUnlockPiece(index)}
            isCollapsed={collapsedPieceIds.has(field.id)}
            onToggleCollapse={() => handleToggleCollapse(field.id)}
            isDealer={isDealer}
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