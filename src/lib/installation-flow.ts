import type {
  EstimatePayment,
  InstallationJob,
  InstallationJobStatus,
  PaymentType,
} from "@/lib/types";

export const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const INSTALLATION_JOB_STATUSES: InstallationJobStatus[] = [
  "REQUESTED",
  "DEPOSIT_PAYMENT_PENDING",
  "MEASUREMENT_SCHEDULING",
  "MEASUREMENT_SCHEDULED",
  "MEASUREMENT_PENDING",
  "QUOTE_DRAFT",
  "ADMIN_APPROVAL_PENDING",
  "CUSTOMER_APPROVAL_PENDING",
  "APPROVED",
  "PERMIT_PAYMENT_PENDING",
  "PERMIT_PROCESSING",
  "MATERIAL_PAYMENT_PENDING",
  "MATERIAL_PAID",
  "INSTALLATION_PAYMENT_PENDING",
  "INSTALLATION_PAID",
  "SCHEDULING",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
];

export function installationStageLabelFromStatus(
  status: InstallationJobStatus,
  approvalReason?: InstallationJob["quotes"][number]["approvalReason"],
): string {
  const labels: Record<InstallationJobStatus, string> = {
    REQUESTED: "Installation requested",
    DEPOSIT_PAYMENT_PENDING: "Awaiting installation deposit",
    MEASUREMENT_SCHEDULING: "Awaiting remeasurement schedule",
    MEASUREMENT_SCHEDULED: "Remeasurement scheduled",
    MEASUREMENT_PENDING: "Awaiting remeasurement",
    QUOTE_DRAFT:
      approvalReason === "PERMIT_REVISION"
        ? "Permit revision in progress"
        : approvalReason === "DEALER_MEASUREMENTS"
          ? "Installation quote under review"
        : "Remeasurement quote in progress",
    ADMIN_APPROVAL_PENDING: "Awaiting internal approval",
    CUSTOMER_APPROVAL_PENDING:
      approvalReason === "PERMIT_REVISION"
        ? "Awaiting permit revision approval"
        : approvalReason === "FIELD_CHANGE"
          ? "Awaiting extra-work approval"
          : "Awaiting customer approval",
    APPROVED: "Approved",
    PERMIT_PAYMENT_PENDING: "Awaiting permit payment",
    PERMIT_PROCESSING: "Permit processing",
    MATERIAL_PAYMENT_PENDING: "Awaiting order payment",
    MATERIAL_PAID: "Order placed",
    INSTALLATION_PAYMENT_PENDING: "Awaiting required payment",
    INSTALLATION_PAID: "Ready to schedule installation",
    SCHEDULING: "Scheduling",
    SCHEDULED: "Installation scheduled",
    IN_PROGRESS: "Installation in progress",
    COMPLETED: "Installed",
    CANCELED: "Installation canceled",
  };
  return labels[status];
}

export function installationStageLabel(job: InstallationJob): string {
  if (job.status !== "CANCELED" && job.estimate.status?.name === "Pending order review") return "Pending order review";
  if (job.paymentSchedule) {
    if (["MATERIAL_PAYMENT_PENDING", "PERMIT_PAYMENT_PENDING", "PERMIT_PROCESSING"].includes(job.status)) return "Awaiting first order installment";
    if (job.status === "MATERIAL_PAID") return "Order placed";
    if (job.status === "INSTALLATION_PAYMENT_PENDING") return "Awaiting required installments";
    if (job.status === "INSTALLATION_PAID") return "Ready to schedule installation";
    if (job.status === "COMPLETED" && Number(job.paymentSchedule.balance) > 0) return "Installed · Balance due";
  }
  return installationStageLabelFromStatus(
    job.status,
    job.quotes[0]?.approvalReason,
  );
}

export function paymentTypeLabel(type: PaymentType): string {
  if (type === "INSTALLMENT") return "Project installment";
  if (type === "INSTALLATION_DEPOSIT") {
    return "Installation deposit (non-refundable)";
  }
  if (type === "PERMIT") return "Permit";
  if (type === "MATERIAL") return "Material + City Fee";
  if (type === "INSTALLATION") return "Installation";
  if (type === "DELIVERY") return "Delivery";
  return "Extra charge";
}

export function paidInstallationCredit(job: InstallationJob): number {
  return job.payments
    .filter(
      (payment) =>
        (payment.type === "INSTALLATION_DEPOSIT" ||
          payment.type === "INSTALLATION") &&
        payment.status === "PAID",
    )
    .reduce((sum, payment) => sum + Number(payment.baseAmount), 0);
}

export function paidBaseFor(job: InstallationJob, type: PaymentType): number {
  return job.payments
    .filter((payment) => payment.type === type && payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.baseAmount), 0);
}

export function hasStartedInstallationPayment(payments: EstimatePayment[]): boolean {
  return payments.some((payment) =>
    payment.status === "PAID" || payment.status === "REFUNDED" ||
    Boolean(payment.paidAt) || Boolean(payment.stripeSessionId));
}

export function canEditInstallationBeforePayment(
  job: InstallationJob | null | undefined,
  estimatePayments: EstimatePayment[] = [],
): boolean {
  if (!job || job.status === "CANCELED") return true;
  if (hasStartedInstallationPayment([...estimatePayments, ...job.payments])) return false;
  if (job.status === "DEPOSIT_PAYMENT_PENDING") return true;
  const quote = job.quotes[0];
  return Boolean(job.dealerMeasurementsAcceptedAt &&
    (job.status === "MATERIAL_PAYMENT_PENDING" || job.status === "PERMIT_PAYMENT_PENDING") &&
    quote?.status === "APPROVED" && quote.approvalReason === "DEALER_MEASUREMENTS" &&
    !quote.submittedAt);
}
