// Percentages use two more integer places than the decimal ratios stored by the API.
export const MARKUP_PERCENT_PATTERN = /^-?(?:\d{1,8}(?:\.\d{1,16})?|\.\d{1,16})$/;

// Move the decimal point as text so editing a markup never rounds through Number.
// Stored Prisma decimals may use exponent notation for very small ratios.
export function shiftDecimalString(value: string, places: number): string {
  const match = value.trim().match(/^(-?)(?:(\d+)(?:\.(\d+))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) throw new Error("Markup must be a valid decimal number.");

  const exponent = Number(match[5] ?? 0);
  if (!Number.isInteger(places) || !Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    throw new Error("Markup must be a valid decimal number.");
  }
  const whole = match[2] ?? "0";
  const fraction = match[3] ?? match[4] ?? "";
  let digits = `${whole}${fraction}`;
  let decimalIndex = whole.length + exponent + places;

  if (decimalIndex < 0) {
    digits = `${"0".repeat(-decimalIndex)}${digits}`;
    decimalIndex = 0;
  } else if (decimalIndex > digits.length) {
    digits = `${digits}${"0".repeat(decimalIndex - digits.length)}`;
  }

  const integerPart = (decimalIndex === 0 ? "0" : digits.slice(0, decimalIndex)).replace(/^0+(?=\d)/, "");
  const fractionPart = digits.slice(decimalIndex).replace(/0+$/, "");
  const isZero = integerPart === "0" && fractionPart.length === 0;
  return `${match[1] && !isZero ? "-" : ""}${integerPart || "0"}${fractionPart ? `.${fractionPart}` : ""}`;
}
