"use client";

import React from "react";
import { PromotionPrice } from "@/components/promotions/promotion-price";
import {
  Trash2,
  Pencil,
  Copy,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Privacy,
  MuntinPattern,
  MuntinType,
} from "@/lib/types";

import type { PieceFormValues } from "./types";

import { Button } from "@/components/ui/button";
import type { CompanyLocale } from "@/components/company/company-content";
import { pieceListText } from "./piece-list-language";
import { PieceFormDetailsPanel } from "./piece-form-details-panel";
import { InlinePieceMarkInput } from "./inline-piece-mark-input";
import { describeListedPiece } from "./piece-dimension-description";

interface PiecesClientListProps {
  locale?: CompanyLocale;
  fields: { id: string }[];
  watchedPieces: PieceFormValues[] | undefined;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  privacies: Privacy[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];

  formatCurrency: (amount: number) => string;

  onDuplicate: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onMarkSave: (index: number, mark: string) => Promise<boolean>;
}

export function PiecesClientList({
  locale = "en",
  fields,
  watchedPieces,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  privacies,
  muntinPatterns,
  muntinTypes,
  formatCurrency,
  onDuplicate,
  onEdit,
  onRemove,
  onMarkSave,
}: PiecesClientListProps) {
  const t = pieceListText(locale);
  const [openPieceIds, setOpenPieceIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const allPiecesOpen =
    fields.length > 0 && fields.every((field) => openPieceIds.has(field.id));

  const togglePiece = (pieceId: string) => {
    setOpenPieceIds((previous) => {
      const next = new Set(previous);

      if (next.has(pieceId)) {
        next.delete(pieceId);
      } else {
        next.add(pieceId);
      }

      return next;
    });
  };

  const toggleAllPieces = () => {
    setOpenPieceIds(
      allPiecesOpen ? new Set() : new Set(fields.map((field) => field.id)),
    );
  };

  if (fields.length === 0) {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border">
        <p className="py-6 text-center text-gray-500">
          {t("No pieces have been added yet.")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-lg border">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full text-sm xl:min-w-[760px]">
          <thead className="hidden border-b bg-slate-100 xl:table-header-group">
            <tr>
              <th className="px-4 py-2 w-10">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleAllPieces}
                  title={allPiecesOpen ? t("Collapse All") : t("Expand All")}
                  aria-label={allPiecesOpen ? t("Collapse All") : t("Expand All")}
                >
                  {allPiecesOpen ? (
                    <ChevronsUp className="h-4 w-4" />
                  ) : (
                    <ChevronsDown className="h-4 w-4" />
                  )}
                </Button>
              </th>
              <th className="px-4 py-2 text-left font-semibold">{t("Mark")}</th>
              <th className="px-4 py-2 text-left font-semibold">{t("Description")}</th>
              <th className="px-4 py-2 text-right font-semibold">{t("Qty")}</th>
              <th className="px-4 py-2 text-right font-semibold">
                {t("Price (unit)")}
              </th>
              <th className="px-4 py-2 text-right font-semibold">Subtotal</th>
              <th className="px-4 py-2 text-right font-semibold">{t("Actions")}</th>
            </tr>
          </thead>

          <tbody>
            {fields.map((field, index) => {
              const currentPieceData = watchedPieces?.[index];
              if (!currentPieceData) return null;

              const product = productsWithBrands.find(
                (p) => p.id === Number(currentPieceData.idProd),
              );

              const frameColor = frameColors.find(
                (fc) => fc.id === Number(currentPieceData.idFC),
              );

              const selectedSystem = systemsWithConfigs.find(
                (s) => s.id === Number(currentPieceData.idSyst),
              );

              const qty = Number(currentPieceData.qty) || 0;
              const unitPrice = Number(currentPieceData.price) || 0;
              const originalUnitPrice =
                currentPieceData.promotionSnapshot &&
                currentPieceData.regularPrice != null
                  ? Number(currentPieceData.regularPrice)
                  : undefined;
              const subtotal =
                Number(currentPieceData.subtotal) || unitPrice * qty || 0;

              const description = describeListedPiece(currentPieceData, product, selectedSystem, frameColor, locale);

              return (
                <React.Fragment key={field.id}>
                  <tr className="border-b last:border-b-0 hover:bg-slate-50">
                    <td colSpan={7} className="p-0 xl:hidden">
                      <div className="space-y-3 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => togglePiece(field.id)}
                              title={
                                openPieceIds.has(field.id)
                                  ? t("Hide Details")
                                  : t("View Details")
                              }
                              aria-label={
                                openPieceIds.has(field.id)
                                  ? t("Hide piece details")
                                  : t("View piece details")
                              }
                              aria-expanded={openPieceIds.has(field.id)}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  openPieceIds.has(field.id)
                                    ? "rotate-0"
                                    : "-rotate-90"
                                }`}
                              />
                            </Button>

                            <InlinePieceMarkInput
                              locale={locale}
                              value={currentPieceData.mark}
                              fallback={`#${index + 1}`}
                              className="min-w-0 max-w-40 flex-1"
                              onSave={(mark) => onMarkSave(index, mark)}
                            />
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => onDuplicate(index)}
                              title={t("Duplicate Piece")}
                              aria-label={t("Duplicate piece")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => onEdit(index)}
                              title={t("Edit Piece")}
                              aria-label={t("Edit piece")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => onRemove(index)}
                              title={t("Delete Piece")}
                              aria-label={t("Delete piece")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="min-w-0 text-sm leading-5 text-slate-700 [overflow-wrap:anywhere]">
                          {description}
                          {currentPieceData.highBottom && (
                            <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {t("High Bottom")}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 divide-x rounded-lg border border-slate-200 bg-slate-50">
                          <div className="min-w-0 px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {t("Qty")}
                            </p>
                            <p className="mt-0.5 font-semibold text-slate-950">
                              {qty}
                            </p>
                          </div>
                          <div className="min-w-0 px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {t("Unit price")}
                            </p>
                            <p className="mt-0.5 truncate font-mono font-semibold text-slate-950">
                              <PromotionPrice
                                locale={locale}
                                amount={unitPrice}
                                originalAmount={originalUnitPrice}
                                formatValue={formatCurrency}
                                align="center"
                              />
                            </p>
                          </div>
                          <div className="min-w-0 px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Subtotal
                            </p>
                            <p className="mt-0.5 truncate font-mono font-semibold text-slate-950">
                              <PromotionPrice
                                locale={locale}
                                amount={subtotal}
                                originalAmount={
                                  originalUnitPrice == null
                                    ? undefined
                                    : originalUnitPrice * qty
                                }
                                formatValue={formatCurrency}
                                align="center"
                              />
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-4 py-2 align-middle xl:table-cell">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePiece(field.id)}
                        title={
                          openPieceIds.has(field.id)
                            ? t("Hide Details")
                            : t("View Details")
                        }
                        aria-expanded={openPieceIds.has(field.id)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openPieceIds.has(field.id)
                              ? "rotate-0"
                              : "-rotate-90"
                          }`}
                        />
                      </Button>
                    </td>

                    <td className="hidden w-40 px-4 py-2 align-middle xl:table-cell">
                      <InlinePieceMarkInput
                        locale={locale}
                        value={currentPieceData.mark}
                        fallback={`#${index + 1}`}
                        className="w-32"
                        onSave={(mark) => onMarkSave(index, mark)}
                      />
                    </td>

                    <td className="hidden px-4 py-2 align-middle text-gray-700 xl:table-cell">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{description}</span>

                        {currentPieceData.highBottom && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {t("High Bottom")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="hidden px-4 py-2 align-middle text-right xl:table-cell">
                      {qty}
                    </td>

                    <td className="hidden px-4 py-2 align-middle text-right font-mono xl:table-cell">
                      <PromotionPrice
                        locale={locale}
                        amount={unitPrice}
                        originalAmount={originalUnitPrice}
                        formatValue={formatCurrency}
                      />
                    </td>

                    <td className="hidden px-4 py-2 align-middle text-right font-mono xl:table-cell">
                      <PromotionPrice
                        locale={locale}
                        amount={subtotal}
                        originalAmount={
                          originalUnitPrice == null
                            ? undefined
                            : originalUnitPrice * qty
                        }
                        formatValue={formatCurrency}
                      />
                    </td>

                    <td className="hidden px-4 py-2 align-middle text-right xl:table-cell">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onDuplicate(index)}
                          title={t("Duplicate Piece")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(index)}
                          title={t("Edit Piece")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => onRemove(index)}
                          title={t("Delete Piece")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {openPieceIds.has(field.id) && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <PieceFormDetailsPanel
                          locale={locale}
                          piece={currentPieceData}
                          productsWithBrands={productsWithBrands}
                          systemsWithConfigs={systemsWithConfigs}
                          frameColors={frameColors}
                          crystals={crystals}
                          tints={tints}
                          coatings={coatings}
                          privacies={privacies}
                          muntinPatterns={muntinPatterns}
                          muntinTypes={muntinTypes}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
