export type EstimateDiscountScope = "MATERIAL" | "INSTALLATION";
export type EstimateDiscountRule = {
  type: "PERCENTAGE" | "AMOUNT";
  value: string;
};

export type EstimateDiscountConfig = ({
  // PROJECT permite mostrar descuentos anteriores sin reasignar sus importes.
  scope: EstimateDiscountScope | "PROJECT";
} & EstimateDiscountRule | {
  scope: "MULTIPLE";
  material?: EstimateDiscountRule;
  installation?: EstimateDiscountRule;
}) & {
  lockedAt?: string | null;
  materialDiscountBasis?: "BEFORE_TAX";
};

export type EstimateDiscountUpdate = {
  material: { type: EstimateDiscountRule["type"]; value: number } | null;
  installation: { type: EstimateDiscountRule["type"]; value: number } | null;
};

export function estimateDiscountRules(config: EstimateDiscountConfig | null) {
  return {
    material: config?.scope === "MULTIPLE" ? config.material ?? null
      : config?.scope === "MATERIAL" ? { type: config.type, value: config.value } : null,
    installation: config?.scope === "MULTIPLE" ? config.installation ?? null
      : config?.scope === "INSTALLATION" ? { type: config.type, value: config.value } : null,
  };
}
export type DiscountBucket = {
  before: string;
  // En materiales incluye el ajuste fiscal; netDiscount es el descuento comercial.
  discount: string;
  total: string;
};
export type EstimateDiscountSummary = {
  scope: EstimateDiscountConfig["scope"];
  type?: EstimateDiscountRule["type"];
  value?: string;
  lockedAt?: string | null;
  materialDiscountBasis?: "BEFORE_TAX";
  rules?: { material?: EstimateDiscountRule; installation?: EstimateDiscountRule };
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
  MULTIPLE: "Material & Installation",
};
