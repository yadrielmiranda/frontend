import type { CreatePieceData, ProductWithBrands } from "@/lib/types";
import type { PieceFormValues } from "../types";

export function revisionPieceForm(input?: CreatePieceData, dealerMarkup = 0): PieceFormValues {
  return {
    mark: "", idProd: 0, idBrand: 0, idSyst: 0, idConf: 0, idFC: 0,
    idCryst: 0, idTint: 0, idCoat: 0, idPrivacy: 0, screen: false, highBottom: false,
    qty: 1, dealerMarkup, ...input,
    width: input?.width ?? "", height: input?.height ?? "",
    heightLeft: input?.heightLeft ?? "", heightRight: input?.heightRight ?? "",
    legHeight: input?.legHeight ?? "", sashHeight: input?.sashHeight ?? "",
    windowHeight: input?.windowHeight ?? "", doorWidth: input?.doorWidth ?? "",
    doorHeight: input?.doorHeight ?? "", leftSideliteWidth: input?.leftSideliteWidth ?? "",
    rightSideliteWidth: input?.rightSideliteWidth ?? "",
    rate: 0, price: 0, subtotal: 0, total: 0, netProfitD: 0, customerPrice: 0, customerSubtotal: 0,
    dpPosPsf: null, dpNegPsf: null, muntin: input?.muntin ?? null,
  };
}

// Lista blanca: nunca se envían precios calculados, IDs de otra pieza o campos del formulario.
export function revisionPieceInput(piece: CreatePieceData, products: ProductWithBrands[]): CreatePieceData {
  const linear = products.find(product => product.id === Number(piece.idProd))?.kind === "LINEAR_MATERIAL";
  const text = (value: unknown) => value == null || value === "" ? null : String(value);
  const option = (value: unknown) => linear || !value ? null : Number(value);
  return {
    mark: piece.mark.trim(), idProd: Number(piece.idProd), idBrand: Number(piece.idBrand),
    idSyst: Number(piece.idSyst), idConf: Number(piece.idConf), idFC: Number(piece.idFC),
    width: text(piece.width), height: text(piece.height), heightLeft: text(piece.heightLeft), heightRight: text(piece.heightRight),
    legHeight: text(piece.legHeight), sashHeight: text(piece.sashHeight), windowHeight: text(piece.windowHeight),
    doorWidth: text(piece.doorWidth), doorHeight: text(piece.doorHeight), leftSideliteWidth: text(piece.leftSideliteWidth), rightSideliteWidth: text(piece.rightSideliteWidth),
    leftPanels: piece.leftPanels == null ? null : Number(piece.leftPanels), rightPanels: piece.rightPanels == null ? null : Number(piece.rightPanels),
    panelCount: piece.panelCount == null ? null : Number(piece.panelCount), horizontalHeights: Array.isArray(piece.horizontalHeights) ? piece.horizontalHeights.map(Number) : null,
    idCryst: linear ? null : Number(piece.idCryst), idTint: linear ? null : Number(piece.idTint),
    idCoat: linear ? null : Number(piece.idCoat), idPrivacy: linear ? null : Number(piece.idPrivacy),
    screen: !linear && Boolean(piece.screen), highBottom: !linear && Boolean(piece.highBottom),
    idActiveOption: option(piece.idActiveOption), idPreparationOption: option(piece.idPreparationOption),
    idSillOption: option(piece.idSillOption), idReinforcementOption: option(piece.idReinforcementOption),
    muntin: linear ? null : piece.muntin ?? null,
    qty: Number(piece.qty), dealerMarkup: Number(piece.dealerMarkup || 0),
  };
}
