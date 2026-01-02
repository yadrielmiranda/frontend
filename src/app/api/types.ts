// --- Tipos de Entidades Base ---

export interface Role {
  id: number;
  name: string;
  markup: number; // Campo 'markup' añadido para reflejar el schema del backend
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  street: string;
  city: string;
  state: string;
  postalCode: string;

  markupOverride?: number | null;
  isTaxExempt: boolean;
  idRole: number;
  role: Role;
}


export interface Brand {
  id: number;
  name: string;
} 

export interface Product  {
  id: number;
  name: string;
}

export interface BrandProduct {
  idBrand: number;
  idProduct: number;
  brand: Brand;
  product: Product;
}

export interface System {
  id: number;
  name: string;
  idProduct: number;
  idBrand: number; 
  brandProduct: BrandProduct;
}

export interface Config {
  id: number;
  conf: string;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  prod?: Product;
}

export interface FrameColor {
  id: number;
  color: string;
}

export interface Crystal {
  id: number;
  glass: string;
}

export interface Tint {
  id: number;
  color: string;
}

export interface Coating {
  id: number;
  name: string;
}

export interface Piece {
  id: number;
  idEst: number;
  mark: string;
  idProd: number;
  idBrand: number;
  idSyst: number;
  idConf: number;
  idFC: number;

  width: string | null;
  height: string | null;
  heightLeft?: string | null;
  heightRight?: string | null;
  legHeight?: string | null;

  idCryst: number;
  idTint: number;
  privacy: boolean;
  idCoat: number;
  screen: boolean;
  muntin: boolean;
  qty: number;

  rate: number;
  price: number;
  markup: number;
  subtotal: number;
  netProfit: number;
  dealerMarkup: number;
  customerPrice: number;
  customerSubtotal: number;
  netProfitD: number;
  dpPosPsf?: number | null;
  dpNegPsf?: number | null;

}


export interface Estimate {
  id: number;
  number: string;
  name: string;
  date: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerStreet?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerPostalCode?: string | null;
  units: number;
  rateT: number;
  priceT: number;
  netProfit: number;
  taxRate: number;
  taxAmount: number;
  totalPayable: number;
  customerPriceT: number;
  customerTaxRate: number;
  customerTaxAmount: number;
  customerTotalPayable: number;
  netProfitD: number;
  idUser: number;
  active: boolean;
  order?: Order | null;
}

export interface OrderStatus {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  number: string;
  date: string;
  units: number;
  amount: number;
  idEst: number;
  statusId: number;
  userId: number;
}

// --- NUEVOS TIPOS PARA REGLAS DE PRECIOS ---

export interface PricingRule {
  id: number;
  idBrand: number;
  idProduct: number;
  idSystem: number;
  idConfig: number;
  idCrystal: number;
  costoA: number;
  costoB: number;
  costoC: number;
  // Propiedades de relación para mostrar en la tabla de datos
  brand?: { name: string };
  product?: { name: string };
  system?: { name: string };
  config?: { conf: string };
  crystal?: { glass: string };
}

// --- Tipos con Relaciones (Para Obtener y Mostrar Datos) ---

export interface PieceWithRelations extends Piece {
  prod: Product;
  bran: Brand;
  syst: System;
  conf: Config;
  fColor: FrameColor;
  cryst: Crystal;
  tin: Tint;
  coat: Coating;
}



export interface SysConf {
  idSystem: number;
  idConfig: number;
  config: Config;
}

export interface ProductWithBrands extends Product {
  brandProducts: {
    brand: Brand;
  }[];
}

export interface SystemWithConfigs extends System {
  sysconfs: SysConf[];
}

export type EstimateWithRelations = Estimate & {
  pieces: PieceWithRelations[];
  user: User;
};

export type OrderWithRelations = Order & {
  estimate: Estimate; // La orden incluye los datos básicos del estimado
  status: OrderStatus;
  user: User;
};


// --- Tipos para Creación y Actualización (DTOs del Frontend) ---

export type CreateProductData = Omit<Product, 'id'>;

export interface CreatePieceData {
  mark: string;
  idProd: number;
  idBrand: number;
  idSyst: number;
  idConf: number;
  idFC: number;
  width?: string | null;
  height?: string | null;
  heightLeft?: string | null;
  heightRight?: string | null;
  legHeight?: string | null;
  idCryst: number;
  idTint: number;
  privacy: boolean;
  idCoat: number;
  screen: boolean;
  muntin: boolean;
  qty: number;
  dealerMarkup?: number; // porcentaje (10 = 10%)
}

export type CalculatePiecePayload = CreatePieceData;

export interface CreateEstimateData extends Omit<Estimate,
  | 'id'
  | 'number'
  | 'date'
  | 'units'
  | 'rateT'
  | 'priceT'
  | 'netProfit'
  | 'taxRate'
  | 'taxAmount'
  | 'totalPayable'
  | 'customerPriceT'
  | 'customerTaxRate'
  | 'customerTaxAmount'
  | 'customerTotalPayable'
  | 'netProfitD'
  | 'active'
  | 'idUser'
  | 'order'
> {
  pieces: CreatePieceData[];
  customerTaxRate?: number;
}


export type UpdateEstimateData = Partial<Omit<CreateEstimateData, 'pieces'>> & {
  pieces?: (CreatePieceData & { id?: number })[];
};

export interface CreateUserDto {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  street: string;
  city: string;
  state: string;
  postalCode: string;

  password: string;
  idRole: number;
  isTaxExempt?: boolean;
}

export type UpdateUserDto = Partial<CreateUserDto> & {
  markupOverride?: number | null;
};

export type CreatePricingRuleData = Omit<PricingRule, 'id' | 'brand' | 'product' | 'system' | 'config' | 'crystal'>;
export type UpdatePricingRuleData = Partial<CreatePricingRuleData>;

export interface UpdateOrderData {
  statusId: number;
}

export interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  recipientId: number;
}

export interface GlobalParameter {
  id: number;
  key: string;
  value: number;
  description: string | null;
  unit: string | null;
  updatedAt: string;
}

export type UpdateGlobalParameterData = {
  value: string;
  description?: string;
  unit?: string;
};




