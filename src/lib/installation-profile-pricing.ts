import type {
  InstallationPriceProfile,
  InstallationProfileAdjustment,
} from "./types";

export type ProfileAdjustmentDraft = Omit<
  InstallationProfileAdjustment,
  "value" | "legacyLineRounding"
> & { value: string };
export type ProfileAdjustmentDrafts = Record<string, ProfileAdjustmentDraft>;

export const profileAdjustmentKey = (
  serviceId: number,
  ruleId: number | null,
) => `${serviceId}:${ruleId ?? "base"}`;

export function profileAdjustmentDrafts(
  profile: InstallationPriceProfile,
): ProfileAdjustmentDrafts {
  return Object.fromEntries(
    (profile.adjustments ?? []).map(({ serviceId, ruleId, type, value }) => [
      profileAdjustmentKey(serviceId, ruleId),
      { serviceId, ruleId, type, value: String(Number(value)) },
    ]),
  );
}

export function profileAdjustmentError(
  drafts: ProfileAdjustmentDrafts,
  original?: InstallationPriceProfile,
) {
  for (const draft of Object.values(drafts)) {
    const value = Number(draft.value);
    const saved = original?.adjustments?.find(
      (item) =>
        item.serviceId === draft.serviceId && item.ruleId === draft.ruleId,
    );
    const unchangedLegacy =
      saved?.legacyLineRounding &&
      draft.type === "PERCENT" &&
      value > -100 &&
      saved.type === draft.type &&
      Number(saved.value) === value;
    if (
      !/^-?\d+(?:\.\d{1,4})?$/.test(draft.value) ||
      !Number.isFinite(value) ||
      (value < 0 && !unchangedLegacy)
    ) {
      return "Enter a valid increase: zero or a positive number with up to four decimal places.";
    }
    if (value > (draft.type === "PERCENT" ? 999999.9999 : 99999999.9999)) {
      return draft.type === "PERCENT"
        ? "Percentage increases cannot exceed 999,999.9999%."
        : "Amount increases cannot exceed $99,999,999.9999.";
    }
  }
  return null;
}

export function adjustedProfileRate(
  baseRate: number,
  adjustment?: ProfileAdjustmentDraft,
) {
  if (!Number.isFinite(baseRate)) return null;
  if (!adjustment) return baseRate;
  if (!Number.isFinite(Number(adjustment.value))) return null;
  const scaled = (value: string) => {
    if (!/^-?\d+(?:\.\d{1,4})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(4, "0")}`);
  };
  const unscaled = (value: bigint) => {
    const negative = value < BigInt(0);
    const digits = (negative ? -value : value).toString().padStart(5, "0");
    const result = Number(
      `${negative ? "-" : ""}${digits.slice(0, -4)}.${digits.slice(-4)}`,
    );
    return Number.isFinite(result) ? result : null;
  };
  const rate = scaled(String(baseRate));
  const value = scaled(adjustment.value);
  if (rate === null || value === null) return null;
  if (adjustment.type === "AMOUNT") return unscaled(rate + value);

  // Match the backend's decimal ROUND_HALF_UP, including exact half steps.
  // Floating-point multiplication can turn 1.001 + 15% into 1.151149999… .
  const divisor = BigInt(1000000);
  const numerator = rate * (divisor + value);
  const negative = numerator < BigInt(0);
  const magnitude = negative ? -numerator : numerator;
  const rounded = (magnitude + divisor / BigInt(2)) / divisor;
  return unscaled(negative ? -rounded : rounded);
}
