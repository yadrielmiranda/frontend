export type FrameColorModifierValues = {
  modifierEnabled: boolean;
  basePriceMultiplier: string;
  basePriceDeduction: string;
};

export const neutralFrameColorModifier = (): FrameColorModifierValues => ({
  modifierEnabled: false,
  basePriceMultiplier: "1",
  basePriceDeduction: "0",
});

// Keep the decimal text intact from the editor to the API.
export function validateFrameColorModifier(
  values: FrameColorModifierValues,
): string | null {
  const decimal = /^\d{1,18}(?:\.\d{1,20})?$/;
  const multiplier = values.basePriceMultiplier.trim();
  const deduction = values.basePriceDeduction.trim();
  if (!decimal.test(multiplier) || !/[1-9]/.test(multiplier)) {
    return "Base multiplier must be greater than 0, with up to 18 whole-number digits and 20 decimal places.";
  }
  if (!decimal.test(deduction)) {
    return "Amount to subtract must be 0 or greater, with up to 18 whole-number digits and 20 decimal places.";
  }
  return null;
}
