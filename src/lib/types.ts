// --- Tipos de Entidades Base ---

export interface Role {
  id: number;
  name: string;
  markup: number;
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

  isActive: boolean;
  deletedAt?: string | null;

  idRole: number;
  role: Role;
}

export interface Brand {
  id: number;
  name: string;
  isActive: boolean;
  highBottomPercent?: number | null;
}

export interface Product {
  id: number;
  name: string;
  isActive: boolean;
  kind: ProductKind;
  pricingMode: PricingMode;
  diagramFamily: DiagramFamily;
}

export type ProductKind = "GLAZED_UNIT" | "LINEAR_MATERIAL";

export type PricingMode = "AREA_PERIMETER" | "LINEAR_INCH";

export type DiagramFamily =
  | "GENERIC"
  | "BIFOLD"
  | "CASEMENT"
  | "FIXED_SHAPE"
  | "FRENCH_DOOR"
  | "GARAGE_DOOR"
  | "HORIZONTAL_SLIDER"
  | "LINEAR_MATERIAL"
  | "PIVOT_DOOR"
  | "SINGLE_HUNG"
  | "SLIDING_DOOR"
  | "WINDOW_WALL";

export interface ConfigCategory {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  idProduct: number;
  createdAt?: string;
  updatedAt?: string;

  product?: Product;
  _count?: {
    configs: number;
  };
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
  isActive: boolean;
  allowHighBottom: boolean;

  defaultConfigId?: number | null;
  defaultCrystalId?: number | null;
  systemCrystals?: {
    idCrystal: number;
    sortOrder?: number;
    crystal: Crystal;
  }[];

  systemFrameColors?: {
    idFrameColor: number;
    sortOrder?: number;
    frameColor: FrameColor;
  }[];
}

export interface ConfigMuntinLayoutItem {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface DiagramSpec {
  family: DiagramFamily;
  [key: string]: JsonValue;
}

export type DimensionMode =
  | "STANDARD"
  | "ECO_WINDOWS_DOOR"
  | "ECO_NOVO_DOOR"
  | "WINDOW_WALL";

export type DimensionRuleType = "MAIN" | "DOOR" | "SIDELITE" | "TRANSOM";

export interface Config {
  id: number;
  conf: string;
  idProduct: number;
  isActive: boolean;

  categoryId?: number | null;
  category?: ConfigCategory | null;

  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  requiresSashHeight?: boolean;
  requiresWindowHeight?: boolean;

  muntinLayout?: ConfigMuntinLayoutItem[] | null;

  diagramSpec?: DiagramSpec | null;
  diagramSpecVersion: number;

  prod?: Product;
}

export type PricingComponentType = "DOOR" | "SIDELITE" | "TRANSOM";

export interface PricingSourceConfig {
  id: number;
  conf: string;
  categoryId?: number | null;
  isActive: boolean;
  category?: ConfigCategory | null;
}

export interface SysConfPricingComponent {
  componentType: PricingComponentType;
  sourceConfigId: number;
  quantity?: number | null;
  sourceConfig?: PricingSourceConfig;
}

export interface FrameColor {
  id: number;
  color: string;
  isActive: boolean;
  isGlobal: boolean;
}

export interface Crystal {
  id: number;
  glass: string;
  isActive: boolean;
}

export interface Tint {
  id: number;
  color: string;
  isActive: boolean;
}

export interface Coating {
  id: number;
  name: string;
  isActive: boolean;
}

export interface MuntinPattern {
  id: number;
  name: string;
  requiresLites: boolean;
  isActive: boolean;
  isDefault: boolean;
}

export interface MuntinType {
  id: number;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface PieceMuntinPanel {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
  horizontalLites: number;
  verticalLites: number;
}

export interface CreatePieceMuntinPanelData {
  panelIndex: number;
  panelLabel: string;
  panelCode?: string;
  horizontalLites: number;
  verticalLites: number;
}

export interface CreatePieceMuntinData {
  idPattern: number;
  idType?: number | null;
  panels: CreatePieceMuntinPanelData[];
}

export type PieceMuntin = CreatePieceMuntinData;

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
  sashHeight?: string | null;
  windowHeight?: string | null;

  doorWidth?: string | null;
  doorHeight?: string | null;
  leftSideliteWidth?: string | null;
  rightSideliteWidth?: string | null;
  leftPanels?: number | null;
  rightPanels?: number | null;
  panelCount?: number | null;
  horizontalHeights?: number[] | null;

  idCryst?: number | null;
  idTint?: number | null;
  privacy: boolean;
  idCoat?: number | null;
  screen: boolean;
  highBottom: boolean;
  highBottomPercent?: number | null;
  idActiveOption?: number | null;
  idPreparationOption?: number | null;
  idSillOption?: number | null;
  idReinforcementOption?: number | null;
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

export interface EstimateStatus {
  id: number;
  name: string;
}

export interface EstimatePayment {
  status: string;
  stripeSessionId: string | null;
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
  statusId: number;
  status?: EstimateStatus;
  order?: Order | null;
  payment?: EstimatePayment | null;
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

  price: number;
  rate: number;
  netProfit: number;

  poNumber?: string | null;
  rateReal?: number | null;
  netProfitReal?: number | null;

  updateStatus: string;

  idEst: number;
  statusId: number;
  userId: number;

  createdAt?: string;
  updatedAt?: string;
}

// --- NUEVOS TIPOS PARA REGLAS DE PRECIOS ---

export interface PricingRule {
  id: number;
  idBrand: number;
  idProduct: number;
  idSystem: number;
  idConfig: number;
  idCrystal: number;

  costoA: string;
  costoB: string;
  costoC: string;

  brand?: { name: string };
  product?: { name: string };
  system?: { name: string };
  config?: {
    id?: number;
    conf: string;
    categoryId?: number | null;
    category?: ConfigCategory | null;
  };
  crystal?: { glass: string };
}

export interface LinearPricingRule {
  id: number;
  idBrand: number;
  idProduct: number;
  idSystem: number;
  idConfig: number;

  costPerInch: number;
  minLengthIn: number;
  maxLengthIn: number;

  brand?: Brand;
  product?: Product;
  system?: System;
  config?: Config;

  createdAt?: string;
  updatedAt?: string;
}

export type CreateLinearPricingRuleData = {
  idBrand: number;
  idProduct: number;
  idSystem: number;
  idConfig: number;
  costPerInch: number;
  minLengthIn?: number;
  maxLengthIn?: number;
};

export type UpdateLinearPricingRuleData = Partial<CreateLinearPricingRuleData>;

// --- Tipos con Relaciones (Para Obtener y Mostrar Datos) ---

export interface PieceMuntinPanelRelation {
  id?: number;
  pieceMuntinId?: number;
  panelIndex: number;
  panelCode: string;
  panelLabel?: string | null;
  horizontalLites: number;
  verticalLites: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PieceMuntinWithRelations {
  id?: number;
  pieceId?: number;
  patternId: number;
  typeId?: number | null;
  totalLites?: number | null;
  createdAt?: string;
  updatedAt?: string;
  pattern?: MuntinPattern | null;
  type?: MuntinType | null;
  panels: PieceMuntinPanelRelation[];
}

export interface PieceWithRelations extends Piece {
  prod: Product;
  bran: Brand;
  syst: System;
  conf: Config;
  fColor: FrameColor;
  cryst: Crystal | null;
  tin: Tint | null;
  coat: Coating | null;

  activeOption?: ActiveOption | null;
  preparationOption?: PreparationOption | null;
  sillOption?: SillOption | null;
  reinforcementOption?: ReinforcementOption | null;

  pieceMuntin?: PieceMuntinWithRelations | null;
}

export interface SysConfOptionLink<T> {
  optionId: number;
  option: T;
}

export interface SysConf {
  idSystem: number;
  idConfig: number;
  allowScreen: boolean;
  isSelectableInEstimate: boolean;
  sortOrder: number;
  config: Config;

  dimensionMode: DimensionMode;
  minimumBillableHeightIn?: string | null;

  requiresWidth: boolean;
  requiresHeight: boolean;
  requiresHeightLeft: boolean;
  requiresHeightRight: boolean;
  requiresLegHeight: boolean;
  requiresDoorWidth: boolean;
  requiresDoorHeight: boolean;
  requiresLeftSideliteWidth: boolean;
  requiresRightSideliteWidth: boolean;
  requiresLeftPanels: boolean;
  requiresRightPanels: boolean;
  requiresPanelCount: boolean;
  requiresHorizontalHeights: boolean;

  defaultActiveOptionId?: number | null;
  defaultPreparationOptionId?: number | null;
  defaultSillOptionId?: number | null;
  defaultReinforcementOptionId?: number | null;

  pricingComponents?: SysConfPricingComponent[];

  activeOptions?: SysConfOptionLink<ActiveOption>[];
  preparationOptions?: SysConfOptionLink<PreparationOption>[];
  sillOptions?: SysConfOptionLink<SillOption>[];
  reinforcementOptions?: SysConfOptionLink<ReinforcementOption>[];
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
  branding?: Branding | null;
};

export type OrderWithRelations = Order & {
  estimate: Estimate;
  status: OrderStatus;
  user: User;
};

// --- Tipos para Creación y Actualización (DTOs del Frontend) ---

export type CreateProductData = {
  name: string;
  kind?: ProductKind;
  pricingMode?: PricingMode;
  diagramFamily?: DiagramFamily;
};

export type UpdateProductData = {
  name?: string;
  isActive?: boolean;
  kind?: ProductKind;
  pricingMode?: PricingMode;
  diagramFamily?: DiagramFamily;
};

export type CreateBrandData = {
  name: string;
  highBottomPercent?: number | null;
};

export type UpdateBrandData = {
  name?: string;
  isActive?: boolean;
  highBottomPercent?: number | null;
};

export type CreateFrameColorData = {
  color: string;
  isGlobal?: boolean;
};

export type UpdateFrameColorData = {
  color?: string;
  isActive?: boolean;
  isGlobal?: boolean;
};

export type CreateCrystalData = {
  glass: string;
};

export type UpdateCrystalData = {
  glass?: string;
  isActive?: boolean;
};

export type CreateTintData = {
  color: string;
};

export type UpdateTintData = {
  color?: string;
  isActive?: boolean;
};

export type CreateCoatingData = {
  name: string;
};

export type UpdateCoatingData = {
  name?: string;
  isActive?: boolean;
};

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
  sashHeight?: string | null;
  windowHeight?: string | null;

  doorWidth?: string | null;
  doorHeight?: string | null;
  leftSideliteWidth?: string | null;
  rightSideliteWidth?: string | null;
  leftPanels?: number | null;
  rightPanels?: number | null;
  panelCount?: number | null;
  horizontalHeights?: number[] | null;

  idCryst?: number | null;
  idTint?: number | null;
  privacy?: boolean;
  idCoat?: number | null;
  screen?: boolean;
  highBottom?: boolean;

  idActiveOption?: number | null;
  idPreparationOption?: number | null;
  idSillOption?: number | null;
  idReinforcementOption?: number | null;

  muntin?: CreatePieceMuntinData | null;
  qty: number;
  dealerMarkup?: number;
}

export type CalculatePiecePayload = CreatePieceData;

export type CreateEstimateHeaderData = Pick<
  Estimate,
  | "name"
  | "customerFirstName"
  | "customerLastName"
  | "customerEmail"
  | "customerPhone"
  | "customerStreet"
  | "customerCity"
  | "customerState"
  | "customerPostalCode"
> & {
  // Fracción decimal, por ejemplo 0.07 representa 7%.
  customerTaxRate?: number;
};

export type UpdateEstimateHeaderData =
  Partial<CreateEstimateHeaderData>;

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
  isActive?: boolean;
};

export type CreatePricingRuleData = Omit<
  PricingRule,
  "id" | "brand" | "product" | "system" | "config" | "crystal"
>;
export type UpdatePricingRuleData = Partial<CreatePricingRuleData>;

export interface UpdateOrderData {
  statusId?: number;
  poNumber?: string | null;
  rateReal?: number | null;
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

export type BrandingType = "COMPANY" | "DEALER";

export interface Branding {
  id: number;
  type: BrandingType;
  userId: number | null;

  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;

  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;

  logoUrl: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveOption {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreparationOption {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SillOption {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReinforcementOption {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}