import type {
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
    MATERIAL_PAYMENT_PENDING: "Awaiting material + City Fee payment",
    MATERIAL_PAID: "Material paid",
    INSTALLATION_PAYMENT_PENDING: "Awaiting installation payment",
    INSTALLATION_PAID: "Installation paid — awaiting schedule",
    SCHEDULING: "Scheduling",
    SCHEDULED: "Installation scheduled",
    IN_PROGRESS: "Installation in progress",
    COMPLETED: "Installed",
    CANCELED: "Installation canceled",
  };
  return labels[status];
}

export function installationStageLabel(job: InstallationJob): string {
  return installationStageLabelFromStatus(
    job.status,
    job.quotes[0]?.approvalReason,
  );
}

export function paymentTypeLabel(type: PaymentType): string {
  if (type === "INSTALLATION_DEPOSIT") {
    return "Installation deposit (non-refundable)";
  }
  if (type === "PERMIT") return "Permit";
  if (type === "MATERIAL") return "Material + City Fee";
  if (type === "INSTALLATION") return "Installation";
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
