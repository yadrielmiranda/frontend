import type { PaymentSchedule, PaymentScheduleRow } from "./payment-plan";

const milestoneOrder = { ORDER: 0, RELEASE: 1, INSTALL: 2, COMPLETE: 3 };

export function paymentAmountCents(value: string): number | null {
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export type CustomPaymentAllocation = { row: PaymentScheduleRow; amount: number; remaining: number };

export function previewCustomPayment(schedule: PaymentSchedule | null | undefined, input: string) {
  const maximum = paymentAmountCents(schedule?.fullBalance?.amount ?? "");
  const available = Boolean(maximum && maximum > 0 && !schedule?.estimateCanceled
    && !schedule?.materialRevisionPending && !schedule?.refundReviewPending);
  const amountCents = paymentAmountCents(input);
  let error: string | null = !available ? "A custom payment is not available for this project balance."
    : amountCents == null || amountCents <= 0 ? "Enter an amount greater than zero with up to two decimal places."
    : amountCents > maximum! ? "The amount cannot exceed the outstanding project balance." : null;
  const rows = (schedule?.rows ?? []).filter(row => schedule?.fullBalance?.sequences.includes(row.sequence)
    && row.status !== "REVIEW")
    .sort((a, b) => milestoneOrder[a.milestone] - milestoneOrder[b.milestone] || a.sequence - b.sequence);
  const allocations: CustomPaymentAllocation[] = [];
  if (!error) {
    let remaining = amountCents!;
    for (const row of rows) {
      const balance = paymentAmountCents(row.balance);
      if (balance == null) { error = "The payment schedule changed. Refresh before paying."; break; }
      const applied = Math.min(balance, remaining);
      // A credit-covered initial installment can still need its confirmation.
      allocations.push({ row, amount: applied / 100, remaining: (balance - applied) / 100 });
      remaining -= applied;
      if (!remaining) break;
    }
    if (remaining) error = "The payment schedule changed. Refresh before paying.";
  }
  const valid = !error;
  const cities = valid ? allocations.filter(item => item.row.kind === "CITY_FEE") : [];
  return {
    available, valid, error, amount: amountCents == null ? 0 : amountCents / 100,
    maximum: (maximum ?? 0) / 100, allocations: valid ? allocations : [],
    cityFeeAmount: cities.reduce((sum, item) => sum + Math.round(Number(item.row.amount) * 100), 0) / 100,
    cityFeeKey: cities.length ? JSON.stringify(cities.map(item => [item.row.sequence, item.row.amount, item.amount])) : "",
  };
}
