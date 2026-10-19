type MaterialOperationPolicy = { allowBaseUnitOperations?: boolean };
type MaterialOperationPresentation = { isBase?: boolean; multiplier: number };

/** The base unit remains available for counts and repacking, even when daily operations use full packages only. */
export function allowsMaterialDailyOperation(product: MaterialOperationPolicy, presentation: MaterialOperationPresentation) {
  return product.allowBaseUnitOperations !== false || (!presentation.isBase && presentation.multiplier > 1);
}

export const materialFullPackagesOnlyMessage = "This material is managed in full packages only. Select a box, bag or another package presentation.";
