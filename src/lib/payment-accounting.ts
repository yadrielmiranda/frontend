import type { EstimatePayment } from './types';
import { roundMoney } from './formatters';

export function paidPrincipal(payment: EstimatePayment): number {
  return Number(payment.netPaidBaseAmount ?? (payment.status === 'PAID' ? payment.baseAmount : 0));
}
export function refundedBalance(payment: EstimatePayment): number {
  return roundMoney(Math.max(0, Number(payment.originalBaseAmount ?? payment.baseAmount) - paidPrincipal(payment) - Number(payment.refundCreditAmount ?? 0)));
}
export function hasRefundHistory(payment: EstimatePayment): boolean {
  return payment.netPaidBaseAmount != null && Number(payment.refundedAmount) > 0;
}
