export type PaymentMilestone = "ORDER" | "RELEASE" | "INSTALL" | "COMPLETE";
export type PaymentBasis = "PROJECT" | "MATERIAL" | "INSTALLATION";
export type PaymentPlanStep = {
  milestone: PaymentMilestone;
  basis: PaymentBasis;
  percent: number;
};
export type PaymentPlanDefinition = {
  withInstallation: PaymentPlanStep[];
  withoutInstallation: PaymentPlanStep[];
};
export type PaymentPlan = {
  id: number;
  name: string;
  definition: PaymentPlanDefinition;
  isActive: boolean;
};
export type PaymentScheduleRow = {
  approvedCredit?: string;
  originalAmount?: string;
  kind?: 'CITY_FEE';
  sequence: number;
  milestone: PaymentMilestone;
  title: string;
  description: string;
  amount: string;
  paid: string;
  credit: string;
  balance: string;
  status: "PAID" | "DUE" | "UPCOMING" | "CREDIT" | "REVIEW";
};
export type PaymentSchedule = {
  refundReviewPending?: boolean;
  refunded?: string;
  approvedRefundCredit?: string;
  fullBalance?: { amount: string; sequences: number[] } | null;
  cityFeePending?: boolean;
  requiresOrderReview?: boolean;
  orderReviewPending?: boolean;
  orderReviewBlockedReason?: string | null;
  name: string;
  provisional: boolean;
  provisionalMessage?: string | null;
  rows: PaymentScheduleRow[];
  next: PaymentScheduleRow | null;
  total: string;
  paid: string;
  balance: string;
  depositPaid: string;
  permitPaid: string;
  creditBalance: string;
  canRelease: boolean;
  canInstall: boolean;
  initialSequence: number;
};
