import type { ExternalPoLine } from "@/app/api/external-po.api";

export function externalPoReviewState(lines: ExternalPoLine[], parts: Record<string, string>) {
  let invalid = 0;
  let needsReview = false;
  let totalParts = 0;
  for (const line of lines) {
    const value = Number(parts[line.lineNumber]);
    const valid = Number.isSafeInteger(value) && value >= 1 && value <= 200;
    if (!valid || (line.locked && value !== line.expectedParts)) invalid++;
    if (valid) totalParts += value;
    if (line.needsReview || (!line.locked && value !== line.expectedParts)) needsReview = true;
  }
  return { invalid, needsReview, totalParts };
}
