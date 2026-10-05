import { formatInchesFromEighthStep } from "@/lib/dimensions";

type Dimension = string | number | null | undefined;

function dimensionText(value: Dimension): string {
  if (typeof value === "string" && !value.trim()) return "";
  return formatInchesFromEighthStep(value);
}

export function formatDimensionPair(
  width: Dimension,
  height: Dimension,
  widthLabel = "W",
  heightLabel = "H",
): string {
  const widthText = dimensionText(width);
  const heightText = dimensionText(height);
  return [widthText && `${widthText} ${widthLabel}`, heightText && `${heightText} ${heightLabel}`]
    .filter(Boolean).join(" x ");
}

export function formatDoorDimensions(doorWidth: Dimension, doorHeight: Dimension, height: Dimension): string {
  // Compare the saved numeric dimensions, not rounded display strings. A
  // distinct door/transom height must remain visible even if formatting rounds.
  const repeatsHeight = dimensionText(doorHeight) !== "" && dimensionText(height) !== ""
    && Number(doorHeight) === Number(height);
  return formatDimensionPair(doorWidth, repeatsHeight ? null : doorHeight);
}
