export type EstimateDiscountScope = "MATERIAL" | "INSTALLATION";

export type EstimateDiscountConfig = {
  // PROJECT permite mostrar descuentos anteriores sin reasignar sus importes.
  scope: EstimateDiscountScope | "PROJECT";
  type: "PERCENTAGE" | "AMOUNT";
  value: string;
  lockedAt?: string | null;
  materialDiscountBasis?: "BEFORE_TAX";
};
export type DiscountBucket = {
  before: string;
  // En materiales incluye el ajuste fiscal; netDiscount es el descuento comercial.
  discount: string;
  total: string;
};
export type EstimateDiscountSummary = EstimateDiscountConfig & {
  payer: "CUSTOMER" | "ACCOUNT_OWNER";
  base: string;
  discount: string;
  projectBefore: string;
  projectTotal: string;
  material: DiscountBucket & {
    subtotal: string;
    tax: string;
    netDiscount: string;
  };
  installation: DiscountBucket;
  permit: DiscountBucket;
  city: DiscountBucket;
};
export const discountScopeLabel = {
  PROJECT: "Project total",
  MATERIAL: "Material",
  INSTALLATION: "Installation",
};
