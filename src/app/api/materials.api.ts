import { apiFetch } from "./_base";
import { prepareMaterialImage } from "@/lib/material-image-upload";

export type MaterialUnit = { id: number; name: string; isActive: boolean };
export type MaterialCategory = { id: number; name: string; isActive: boolean };
export type MaterialPresentation = {
  id: number; productId: number; unitId: number; unit: MaterialUnit; name: string;
  multiplier: number; barcode: string | null; isBase: boolean; isPurchase: boolean;
  isSaleEnabled: boolean; isActive: boolean; salePrice: string | number | null; version: number;
};
export type MaterialStoreInventory = {
  store: { id: number; name: string; isActive: boolean };
  totalBaseQuantity: number; reservedBaseQuantity: number; availableBaseQuantity: number;
  presentations: Array<{ id: number; quantity: number; reservedQuantity: number; availableQuantity: number }>;
};
export type MaterialProduct = {
  id: number; code: string; name: string; description: string | null;
  imageUrl: string | null; brand: string | null; categoryId: number | null; category: MaterialCategory | null;
  baseUnitId: number; baseUnit: MaterialUnit; isActive: boolean; isSaleEnabled: boolean;
  version: number; presentations: MaterialPresentation[]; inventoryByStore: MaterialStoreInventory[];
};
export type MaterialPage<T> = { items: T[]; total: number; page: number; pageSize: number };
export type MaterialMovement = {
  id: number; productId: number; product?: { name: string; code: string }; presentation?: MaterialPresentation | null;
  store?: { id: number; name: string }; kind: string; quantity: number; deltaBaseUnits: number; baseUnitsAfter: number;
  costPerPackage: string | null; totalCost: string | null; supplier: string | null; reference: string | null;
  note: string | null; recipient: string | null; actorId: number | null; actor?: string | null;
  createdAt: string; details?: unknown;
};
type Query = Record<string, string | number | boolean | undefined>;
const get = <T>(path: string, query?: Query) => apiFetch<T>(`/api/materials/${path}`, { query, cache: "no-store" });
const post = <T>(path: string, body: unknown) => apiFetch<T>(`/api/materials/${path}`, { method: "POST", body });
const patch = <T>(path: string, body: unknown) => apiFetch<T>(`/api/materials/${path}`, { method: "PATCH", body });

export const materialUnits = () => get<MaterialUnit[]>("units");
export const createMaterialUnit = (body: { requestKey: string; name: string }) => post<MaterialUnit>("units", body);
export const updateMaterialUnit = (id: number, body: { requestKey: string; name?: string; isActive?: boolean }) => patch<MaterialUnit>(`units/${id}`, body);
export const materialCategories = () => get<MaterialCategory[]>("categories");
export const createMaterialCategory = (body: { requestKey: string; name: string }) => post<MaterialCategory>("categories", body);
export const updateMaterialCategory = (id: number, body: { requestKey: string; name?: string; isActive?: boolean }) => patch<MaterialCategory>(`categories/${id}`, body);
export const uploadMaterialImage = async (file: File) => {
  const body = new FormData();
  body.append("file", await prepareMaterialImage(file));
  return apiFetch<{ imageUrl: string }>("/api/materials/images", { method: "POST", body });
};
export const materialProducts = (query?: Query) => get<MaterialPage<MaterialProduct>>("products", query);
export const materialProduct = (id: number) => get<MaterialProduct>(`products/${id}`);
export const materialBarcode = (barcode: string) => get<{ product: MaterialProduct; presentation: MaterialPresentation }>(`barcode/${encodeURIComponent(barcode)}`);
type MaterialCatalogFields = { imageUrl?: string | null; brand?: string | null; categoryId?: number | null };
export const createMaterialProduct = (body: { requestKey: string; name: string; description?: string; baseUnitId: number; baseBarcode?: string; purchaseUnitId: number; purchaseMultiplier: number; purchaseBarcode?: string } & MaterialCatalogFields) => post<MaterialProduct>("products", body);
export const updateMaterialProduct = (id: number, body: { requestKey: string; version: number; name?: string; description?: string; isActive?: boolean; isSaleEnabled?: boolean } & MaterialCatalogFields) => patch<MaterialProduct>(`products/${id}`, body);
export type MaterialPresentationInput = { requestKey: string; unitId: number; multiplier: number; name?: string; barcode?: string; isPurchase?: boolean; isSaleEnabled?: boolean; salePrice?: number };
export const createMaterialPresentation = (productId: number, body: MaterialPresentationInput) => post<MaterialProduct>(`products/${productId}/presentations`, body);
export const updateMaterialPresentation = (id: number, body: Omit<Partial<MaterialPresentationInput>, "barcode"> & { requestKey: string; version: number; isActive?: boolean; barcode?: string | null; generateBarcode?: boolean }) => patch<MaterialProduct>(`presentations/${id}`, body);
export const deleteMaterialPresentation = (id: number, body: { requestKey: string; version: number }) => apiFetch<{ id: number; productId: number; replayed: boolean }>(`/api/materials/presentations/${id}`, { method: "DELETE", body });
export type MaterialQuantityInput = { requestKey: string; productId: number; presentationId: number; storeId: number; quantity: number; note?: string };
export const receiveMaterial = (body: MaterialQuantityInput & { costPerPackage: number; supplier?: string; reference?: string }) => post("receipts", body);
export const useMaterialInternally = (body: MaterialQuantityInput & { recipient: string; note: string }) => post("internal-use", body);
export const repackMaterial = (body: MaterialQuantityInput & { action: "OPEN" | "PACK" }) => post("repacks", body);
export const transferMaterial = (body: Omit<MaterialQuantityInput, "storeId"> & { fromStoreId: number; toStoreId: number }) => post("transfers", body);
export const adjustMaterial = (body: MaterialQuantityInput & { version: number; note: string }) => post("adjustments", body);
export const materialHistory = (query?: Query) => get<MaterialPage<MaterialMovement>>("history", query);

export type MaterialStoreCountProduct = {
  id: number; code: string; name: string; imageUrl: string | null; isActive: boolean; version: number;
  baseUnit: { id: number; name: string }; totalBaseQuantity: number; reservedBaseQuantity: number; availableBaseQuantity: number;
  presentations: Array<{ id: number; name: string; barcode: string | null; multiplier: number; isBase: boolean; isActive: boolean; quantity: number; reservedQuantity: number; availableQuantity: number }>;
};
export type MaterialStoreCountInventory = { store: { id: number; name: string; isActive: boolean }; products: MaterialStoreCountProduct[] };
export type MaterialStoreCountInput = { requestKey: string; note: string; products: Array<{ productId: number; version: number; counts: Array<{ presentationId: number; quantity: number }> }> };
export type MaterialStoreCountResult = { storeId: number; storeName: string; countedProducts: number; countedPresentations: number; adjustedProducts: number; movementIds: number[]; countedAt: string; replayed: boolean };
export const materialStoreCountInventory = (storeId: number) => get<MaterialStoreCountInventory>(`stores/${storeId}/inventory`);
export const countMaterialStore = (storeId: number, body: MaterialStoreCountInput) => post<MaterialStoreCountResult>(`stores/${storeId}/count`, body);
export type MaterialStoreInternalUseInput = { requestKey: string; recipient: string; note: string; lines: Array<{ productId: number; presentationId: number; quantity: number }> };
export type MaterialStoreInternalUseResult = { storeId: number; storeName: string; recipient: string; note: string; productCount: number; lineCount: number; movementIds: number[]; issuedAt: string; replayed: boolean };
export const useMaterialStoreInternally = (storeId: number, body: MaterialStoreInternalUseInput) => post<MaterialStoreInternalUseResult>(`stores/${storeId}/internal-use`, body);

export type MaterialSaleLine = { id: number; productId: number; presentationId: number; productName: string; productCode: string; presentationName: string; multiplier: number; quantity: number; unitPrice: string; lineTotal: string; storeId?: number; storeName?: string };
export type MaterialPayment = { id: number; receiptCode: string; status: string; source: string; amount: string; refundedAmount: string; paymentMethod: string; reference?: string | null; note?: string | null; paidAt: string | null; createdAt: string };
export type MaterialSale = {
  id: number; code: string; status: string; storeId: number; store: { id: number; name: string };
  customerUserId: number | null; customerName: string; customerEmail: string | null; customerPhone: string | null; note: string | null;
  subtotal: string; discountAmount: string; taxRate: string; taxAmount: string; total: string;
  paidAmount: string; balance: string; currency: string; paymentStatus: "UNPAID" | "PARTIAL" | "PAID"; requireFullPayment: boolean;
  publicToken: string; publicUrl: string; lines: MaterialSaleLine[]; payments: MaterialPayment[];
  version: number; createdAt: string; confirmedAt: string | null; deliveredAt: string | null; canceledAt: string | null; expiresAt: string | null;
};
export type MaterialSaleCustomer = { id: number; name: string; email: string | null; phone: string | null };
export type MaterialSaleCustomerInput =
  | { customerUserId: number; customerName?: never; customerEmail?: never; customerPhone?: never }
  | { customerUserId?: never; customerName: string; customerEmail?: string; customerPhone?: string };
export type MaterialSaleInput = { requestKey: string; storeId: number; note?: string; lines: { presentationId: number; quantity: number }[] } & MaterialSaleCustomerInput;
export const materialSaleCustomers = (q: string) => get<MaterialSaleCustomer[]>("sales/customers", { q });
export const materialSales = (query?: { q?: string }) => get<MaterialSale[]>("sales", query);
export const materialSale = (id: number) => get<MaterialSale>(`sales/${id}`);
export const createMaterialSale = (body: MaterialSaleInput) => post<MaterialSale>("sales", body);
export const materialSaleAction = (id: number, action: "confirm" | "cancel" | "deliver", requestKey: string) => post<MaterialSale>(`sales/${id}/${action}`, action === "deliver" ? { requestKey } : {});
export const recordMaterialPayment = (id: number, body: { requestKey: string; amount: number; paymentMethod: string; reference?: string; note?: string; paidAt?: string; fundsVerified: true }) => post<MaterialSale>(`sales/${id}/payments`, body);
export const materialCheckout = (id: number) => post<{ url: string; sessionId: string }>(`sales/${id}/checkout-session`, {});
export const cancelMaterialCheckout = (id: number) => post(`sales/${id}/checkout-session/cancel`, {});
export const syncMaterialPayments = (id: number) => post<MaterialSale>(`sales/${id}/sync-payments`, {});
export const publicMaterialSale = (token: string) => apiFetch<MaterialSale>(`/api/materials/public/sales/${encodeURIComponent(token)}`, { cache: "no-store", suppressAuthEvent: true });
export const publicMaterialCheckout = (token: string) => apiFetch<{ url: string; sessionId: string }>(`/api/materials/public/sales/${encodeURIComponent(token)}/checkout-session`, { method: "POST", body: {}, suppressAuthEvent: true });
export type MaterialCatalogProduct = {
  id: number; code: string; name: string; description: string | null;
  imageUrl: string | null; brand: string | null; category: MaterialCategory | null;
  baseUnit: { id: number; name: string };
  presentations: Array<{ id: number; name: string; multiplier: number; barcode: string | null; salePrice: string; availableQuantity: number; unit: { id: number; name: string } }>;
};
export type MaterialCatalog = {
  taxRate: string; currency: string; products: MaterialCatalogProduct[];
  total: number; page: number; pageSize: number; categories: MaterialCategory[]; brands: string[];
};
export type MaterialCatalogQuery = {
  q?: string; categoryId?: number; brand?: string; inStock?: boolean;
  sort?: "name-asc" | "name-desc"; page?: number; pageSize?: number; presentationIds?: string;
};
export const materialCatalog = (query?: MaterialCatalogQuery) => get<MaterialCatalog>("catalog", query);
export const createCustomerMaterialOrder = (body: { requestKey: string; lines: { presentationId: number; quantity: number }[] }) => post<MaterialSale>("orders", body);
export type CustomerMaterialOrder = MaterialSale & { canCancel: boolean };
export const customerMaterialOrders = (query?: { page?: number; pageSize?: number }) => get<MaterialPage<CustomerMaterialOrder>>("orders", query);
export const customerMaterialOrder = (id: number) => get<CustomerMaterialOrder>(`orders/${id}`);
export const cancelCustomerMaterialOrder = (id: number) => post<CustomerMaterialOrder>(`orders/${id}/cancel`, {});
