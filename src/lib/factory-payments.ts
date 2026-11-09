export type FactoryManufacturer = {
  id: number;
  name: string;
  active: boolean;
  isDefault: boolean;
};

export type FactoryPaymentStatus = "PENDING_IMPORT" | "UNPAID" | "PARTIAL" | "PAID" | "CREDIT";
export type FactoryPaymentKind = "DEPOSIT" | "PARTIAL" | "FINAL" | "OTHER";
export const factoryPaymentStatusLabels: Record<FactoryPaymentStatus, string> = {
  PENDING_IMPORT: "Pending PO import", UNPAID: "Unpaid", PARTIAL: "Partially paid", PAID: "Paid", CREDIT: "Credit balance",
};
export const factoryPaymentKindLabels: Record<FactoryPaymentKind, string> = {
  DEPOSIT: "Deposit", PARTIAL: "Partial payment", FINAL: "Final payment", OTHER: "Other",
};

export type FactoryPaymentOrder = {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  projectName: string | null;
  poNumber: string | null;
  imported: boolean;
  manufacturer: { id: number; name: string } | null;
  accountId: number | null;
  version: number | null;
  factoryTotal: string | null;
  importedTotal: string | null;
  sourceCostChanged: boolean;
  paid: string;
  remaining: string | null;
  status: FactoryPaymentStatus;
};

export type FactoryPayment = {
  id: number;
  requestId: string;
  amount: string;
  paidOn: string;
  invoiceNumber: string;
  kind: FactoryPaymentKind;
  reference: string | null;
  note: string | null;
  createdAt: string;
  createdByName?: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  voidedByName?: string | null;
};
export type FactoryPaymentDetail = {
  order: FactoryPaymentOrder;
  payments: FactoryPayment[];
  events: { id: number; action: string; detail: string; createdAt: string; actorName?: string | null }[];
};
export type FactoryPaymentList = {
  rows: FactoryPaymentOrder[];
  total: number;
  page: number;
  pageSize: number;
  summary: { factoryTotal: string; paid: string; remaining: string; credit: string };
};
export type FactoryPaymentFilters = {
  search?: string;
  manufacturerId?: number;
  status?: "ALL" | FactoryPaymentStatus;
  page?: number;
  pageSize?: number;
};
export type RegisterFactoryPayment = {
  manufacturerId: number;
  version?: number;
  amount: string;
  paidOn: string;
  invoiceNumber: string;
  kind: FactoryPaymentKind;
  reference?: string;
  note?: string;
  requestId: string;
};

// Display only: all balances and totals are calculated with decimals by the backend.
export function factoryMoney(value: string | null | undefined): string {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export function factoryDate(value: string): string {
  const date = value.slice(0, 10);
  const [year, month, day] = date.split("-");
  return year && month && day ? `${month}/${day}/${year}` : value;
}

export function todayForFactoryPayment(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function newFactoryPaymentRequestId(
  cryptoApi: Pick<Crypto, "getRandomValues"> & Partial<Pick<Crypto, "randomUUID">> = globalThis.crypto,
): string {
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  // Local installations may use HTTP, where randomUUID is unavailable.
  if (typeof cryptoApi?.getRandomValues !== "function") throw new Error("Could not prepare the payment. Reload the page and try again.");
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

