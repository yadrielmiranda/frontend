"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createEstimate, updateEstimate } from "@/app/api/estimates.api";
import type {
  CreateEstimateData,
  CreatePieceData,
  UpdateEstimateData,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { roundMoney } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

import type {
  EstimateFormProps,
  EstimateFormValues,
  PieceFormValues,
} from "./types";

import { ColorUpdateAlertDialog } from "./color-update-alert-dialog";
import { EstimateDetailsLeft } from "./estimate-details-left";
import { EstimateTotalsCard } from "./estimate-totals-card";
import { PiecesBreakdownBar } from "./pieces-breakdown-bar";
import { PiecesDealerTable } from "./pieces-dealer-table";
import { PiecesClientList } from "./pieces-client-list";
import { PieceModal } from "./piece-modal";
import { CustomerDetailsCard } from "./customer-details-card";
import { lookupZip } from "@/app/api/geo.api";
import { normalizeUSZip, isValidUSZip } from "@/lib/validators-zip";
import { canSetCustomerOnEstimate, isDealerRole } from "@/lib/rbac";

export function EstimateForm({
  estimate,
  taxRate,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  muntinPatterns,
  muntinTypes,
}: EstimateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role?.name ?? null;

  const showCustomerSection = canSetCustomerOnEstimate(role);
  const isDealer = isDealerRole(role);
  const isEditMode = !!estimate;

  const [isPieceModalOpen, setIsPieceModalOpen] = useState(false);
  const [editingPieceIndex, setEditingPieceIndex] = useState<number | null>(
    null,
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EstimateFormValues>({
    defaultValues: isEditMode
      ? {
          name: estimate!.name,
          customerFirstName: estimate!.customerFirstName ?? "",
          customerLastName: estimate!.customerLastName ?? "",
          customerEmail: estimate!.customerEmail ?? "",
          customerPhone: estimate!.customerPhone ?? "",
          customerStreet: estimate!.customerStreet ?? "",
          customerCity: estimate!.customerCity ?? "",
          customerState: estimate!.customerState ?? "",
          customerPostalCode: estimate!.customerPostalCode ?? "",
          generalDealerMarkup: 0,
          customerTaxRate: roundMoney(
            Number(estimate!.customerTaxRate || 0) * 100,
            2,
          ),
          pieces: estimate!.pieces.map((p) => ({
            ...p,
            width: p.width ?? "",
            height: p.height ?? "",
            heightLeft: p.heightLeft ?? "",
            heightRight: p.heightRight ?? "",
            legHeight: p.legHeight ?? "",

            rate: Number(p.rate) || 0,
            price: Number(p.price) || 0,
            subtotal: Number(p.subtotal) || 0,

            dealerMarkup: (Number(p.dealerMarkup) || 0) * 100,
            total: Number(p.customerSubtotal) || 0,
            netProfitD: Number(p.netProfitD) || 0,

            customerPrice: Number(p.customerPrice) || 0,
            customerSubtotal: Number(p.customerSubtotal) || 0,

            dpPosPsf:
              p.dpPosPsf === null || p.dpPosPsf === undefined
                ? null
                : Number(p.dpPosPsf),
            dpNegPsf:
              p.dpNegPsf === null || p.dpNegPsf === undefined
                ? null
                : Number(p.dpNegPsf),

            muntin: p.muntin ?? null,
          })),
          defaultFrameColorId: 0,
        }
      : {
          name: "",
          customerFirstName: "",
          customerLastName: "",
          customerEmail: "",
          customerPhone: "",
          customerStreet: "",
          customerCity: "",
          customerState: "",
          customerPostalCode: "",
          generalDealerMarkup: 0,
          customerTaxRate: 0,
          pieces: [],
          defaultFrameColorId: 0,
        },
  });

  const zip = useWatch({ control, name: "customerPostalCode" });
  const defaultFrameColorId = useWatch({
    control,
    name: "defaultFrameColorId",
  });

  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;
        setValue("customerCity", res.city, { shouldDirty: true });
        setValue("customerState", res.state, { shouldDirty: true });
      })
      .catch(() => {});
  }, [zip, setValue]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "pieces",
  });

  const watchedPieces = useWatch({ control, name: "pieces" });
  const customerTaxRatePercent = useWatch({ control, name: "customerTaxRate" });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

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

  const handleApplyGeneralMarkup = () => {
    if (!isDealer) return;

    const gm = Number(getValues("generalDealerMarkup")) || 0;
    const pieces = getValues("pieces");

    pieces.forEach((piece, index) => {
      const unitPrice = Number(piece.price) || 0;
      const qty = Number(piece.qty) || 0;
      const markupPercent = gm / 100;

      const baseTotal = roundMoney(unitPrice * qty);
      const dealerProfitTotal = roundMoney(baseTotal * markupPercent);
      const finalTotal = roundMoney(baseTotal + dealerProfitTotal);
      const customerUnit = qty > 0 ? roundMoney(finalTotal / qty) : 0;

      setValue(`pieces.${index}.dealerMarkup`, gm, { shouldDirty: true });
      setValue(`pieces.${index}.netProfitD`, dealerProfitTotal, {
        shouldDirty: true,
      });
      setValue(`pieces.${index}.total`, finalTotal, { shouldDirty: true });
      setValue(`pieces.${index}.customerSubtotal`, finalTotal, {
        shouldDirty: true,
      });
      setValue(`pieces.${index}.customerPrice`, customerUnit, {
        shouldDirty: true,
      });
    });

    toast.success("General dealer markup applied to all pieces.");
  };

  const summary = useMemo(() => {
    if (!watchedPieces || watchedPieces.length === 0) {
      return {
        totalUnits: 0,
        subtotal: 0,
        taxAmount: 0,
        totalPayable: 0,
        dealerTotal: 0,
        dealerProfit: 0,
        dealerTaxAmount: 0,
        dealerGrandTotal: 0,
        pieceBreakdown: {} as Record<string, number>,
      };
    }

    const breakdown: Record<string, number> = {};

    const totals = watchedPieces.reduce(
      (acc, piece) => {
        if (!piece || !piece.idProd || Number(piece.idProd) <= 0) return acc;

        const qty = Number(piece.qty) || 0;

        const unitPrice = roundMoney(Number(piece.price) || 0);
        const lineFactorySubtotal = roundMoney(unitPrice * qty);

        const lineDealerTotal = roundMoney(
          Number(piece.total) || lineFactorySubtotal,
        );

        acc.totalUnits += qty;
        acc.subtotal = roundMoney(acc.subtotal + lineFactorySubtotal);
        acc.dealerTotal = roundMoney(acc.dealerTotal + lineDealerTotal);

        const productIdNumber = Number(piece.idProd);
        const product = productsWithBrands.find((p) => p.id === productIdNumber);
        if (product) {
          breakdown[product.name] = (breakdown[product.name] || 0) + qty;
        }

        return acc;
      },
      { totalUnits: 0, subtotal: 0, dealerTotal: 0 },
    );

    const factoryTaxAmount = roundMoney(totals.subtotal * taxRate);
    const factoryTotalPayable = roundMoney(totals.subtotal + factoryTaxAmount);

    const customerTaxRateDec = roundMoney(
      (Number(customerTaxRatePercent) || 0) / 100,
      4,
    );
    const dealerTaxAmount = roundMoney(totals.dealerTotal * customerTaxRateDec);
    const dealerGrandTotal = roundMoney(totals.dealerTotal + dealerTaxAmount);

    const dealerProfit = roundMoney(totals.dealerTotal - totals.subtotal);

    return {
      totalUnits: totals.totalUnits,
      subtotal: roundMoney(totals.subtotal),
      taxAmount: factoryTaxAmount,
      totalPayable: factoryTotalPayable,
      dealerTotal: roundMoney(totals.dealerTotal),
      dealerTaxAmount,
      dealerGrandTotal,
      dealerProfit,
      pieceBreakdown: breakdown,
    };
  }, [watchedPieces, productsWithBrands, taxRate, customerTaxRatePercent]);

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
    const newPiece: PieceFormValues = {
      ...pieceToDuplicate,
      id: undefined,
      mark: "",
      rate: 0,
      price: 0,
      subtotal: 0,
      total: 0,
      netProfitD: 0,
      customerPrice: 0,
      customerSubtotal: 0,
      dpPosPsf: null,
      dpNegPsf: null,
    };

    append(newPiece);
    setEditingPieceIndex(fields.length);
    setIsPieceModalOpen(true);
    toast.info("Piece duplicated. Please enter a new mark and recalculate.");
  };

  const handleSavePiece = (data: PieceFormValues) => {
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
      const customerTaxRateDec = isDealer
        ? (Number(data.customerTaxRate) || 0) / 100
        : 0;

      const mapPiecesForApi = (
        p: PieceFormValues,
      ): CreatePieceData & { id?: number } => {
        return {
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
          muntin: p.muntin ?? null,
          qty: Number(p.qty),

          dealerMarkup: isDealer ? Number(p.dealerMarkup || 0) : 0,
        };
      };

      type CustomerFields = Pick<
        CreateEstimateData,
        | "customerFirstName"
        | "customerLastName"
        | "customerEmail"
        | "customerPhone"
        | "customerStreet"
        | "customerCity"
        | "customerState"
        | "customerPostalCode"
      >;

      const customerHeader: Partial<CustomerFields> = showCustomerSection
        ? {
            customerFirstName: data.customerFirstName?.trim() || null,
            customerLastName: data.customerLastName?.trim() || null,
            customerEmail: data.customerEmail?.trim() || null,
            customerPhone: data.customerPhone?.trim() || null,
            customerStreet: data.customerStreet?.trim() || null,
            customerCity: data.customerCity?.trim() || null,
            customerState: data.customerState?.trim() || null,
            customerPostalCode: data.customerPostalCode?.trim() || null,
          }
        : {};

      if (isEditMode && estimate?.id) {
        const updateData: UpdateEstimateData = {
          name: data.name,
          customerTaxRate: customerTaxRateDec,
          ...customerHeader,
          pieces: data.pieces.map(mapPiecesForApi),
        };

        await updateEstimate(estimate.id, updateData);
        toast.success("Estimate updated successfully!");
      } else {
        const createData: CreateEstimateData = {
          name: data.name,
          customerTaxRate: customerTaxRateDec,
          ...customerHeader,
          pieces: data.pieces.map((p) => {
            const { id, ...rest } = mapPiecesForApi(p);
            return rest;
          }),
        };

        await createEstimate(createData);
        toast.success("Estimate created successfully!");
      }

      router.push("/estimates");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "An unexpected error occurred.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  });

  const showLoadingState = isSubmitting;
  const isSubmitDisabled = !isDirty || showLoadingState || fields.length === 0;

  const editingPieceData = useMemo<PieceFormValues>(() => {
    if (
      editingPieceIndex !== null &&
      watchedPieces &&
      watchedPieces[editingPieceIndex]
    ) {
      return getValues(`pieces.${editingPieceIndex}`);
    }

    return {
      mark: "",
      idProd: 0,
      idBrand: 0,
      idSyst: 0,
      idConf: 0,
      idFC: Number(defaultFrameColorId) || 0,

      width: "",
      height: "",
      heightLeft: "",
      heightRight: "",
      legHeight: "",

      idCryst: 0,
      idTint: 0,
      privacy: false,
      idCoat: 0,
      screen: false,
      muntin: null,
      qty: 1,

      rate: 0,
      price: 0,
      subtotal: 0,

      dealerMarkup: getValues("generalDealerMarkup") || 0,
      total: 0,
      netProfitD: 0,
      customerPrice: 0,
      customerSubtotal: 0,

      dpPosPsf: null,
      dpNegPsf: null,
    };
  }, [editingPieceIndex, getValues, watchedPieces, defaultFrameColorId]);

  const modalTitle =
    editingPieceIndex !== null
      ? `Edit Piece - ${editingPieceData.mark || `#${editingPieceIndex + 1}`}`
      : "Add New Piece";

  const pieceKey = editingPieceIndex ?? "new";
  const pieceIndex = editingPieceIndex ?? fields.length;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="p-6 border rounded-lg bg-slate-50">
          <h3 className="text-xl font-semibold mb-6">Estimate Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <EstimateDetailsLeft
              isEditMode={isEditMode}
              estimateNumber={estimate?.number}
              isDealer={isDealer}
              nameError={errors.name?.message}
              nameRegister={register("name", {
                required: "The name is required",
              })}
              defaultFrameColorId={getValues("defaultFrameColorId")}
              frameColors={frameColors}
              onDefaultColorChange={handleDefaultColorChange}
              generalDealerMarkupRegister={register("generalDealerMarkup", {
                valueAsNumber: true,
                min: 0,
              })}
              onApplyGeneralMarkup={handleApplyGeneralMarkup}
              customerTaxRateRegister={register("customerTaxRate", {
                valueAsNumber: true,
                min: 0,
              })}
              onCustomerTaxBlur={(value) => {
                const v = roundMoney(Number(value) || 0, 2);
                setValue("customerTaxRate", v, { shouldDirty: true });
              }}
            />

            <EstimateTotalsCard
              isDealer={isDealer}
              taxRate={taxRate}
              customerTaxRatePercent={Number(customerTaxRatePercent) || 0}
              summary={summary}
              formatCurrency={formatCurrency}
            />
          </div>

          {showCustomerSection && (
            <div className="mt-6">
              <CustomerDetailsCard
                register={register}
                control={control}
                errors={errors}
              />
            </div>
          )}

          <PiecesBreakdownBar
            totalUnits={summary.totalUnits}
            pieceBreakdown={summary.pieceBreakdown}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Pieces</h3>
            <Button type="button" variant="green" onClick={handleAddNewPiece}>
              + Add Piece
            </Button>
          </div>

          {isDealer ? (
            <PiecesDealerTable
              fields={fields as any}
              watchedPieces={watchedPieces}
              productsWithBrands={productsWithBrands}
              frameColors={frameColors}
              formatCurrency={formatCurrency}
              onDuplicate={handleDuplicatePiece}
              onEdit={handleEditPiece}
              onRemove={remove}
            />
          ) : (
            <PiecesClientList
              fields={fields as any}
              watchedPieces={watchedPieces}
              productsWithBrands={productsWithBrands}
              frameColors={frameColors}
              formatCurrency={formatCurrency}
              onDuplicate={handleDuplicatePiece}
              onEdit={handleEditPiece}
              onRemove={remove}
            />
          )}
        </div>

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

      <PieceModal
        open={isPieceModalOpen}
        onOpenChange={setIsPieceModalOpen}
        title={modalTitle}
        pieceKey={pieceKey}
        initialData={editingPieceData}
        index={pieceIndex}
        onSave={handleSavePiece}
        onCancel={() => setIsPieceModalOpen(false)}
        productsWithBrands={productsWithBrands}
        systemsWithConfigs={systemsWithConfigs}
        frameColors={frameColors}
        crystals={crystals}
        tints={tints}
        coatings={coatings}
        muntinPatterns={muntinPatterns}
        muntinTypes={muntinTypes}
        isDealer={isDealer}
      />

      <ColorUpdateAlertDialog
        open={showColorUpdateAlert}
        onOpenChange={setShowColorUpdateAlert}
        onCancel={handleCancelColorChange}
        onNewPiecesOnly={setNewColorForFuturePieces}
        onUpdateAll={updateAllPiecesColor}
      />
    </>
  );
}