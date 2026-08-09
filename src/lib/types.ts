// --- Tipos de Entidades Base ---

export interface Role {
  id: number;
  name: string;
  markup: number;
  installationPriceProfileId?: number | null;
  installationPriceProfile?: InstallationPriceProfile | null;
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
  installationPriceProfileId?: number | null;
  installationPriceProfile?: InstallationPriceProfile | null;
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

export type DimensionRuleType = "MAIN" | "DOOR" | "SIDELITE";

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

export type PricingComponentType = "DOOR" | "SIDELITE";

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
  hexCode: string;
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
  hexCode: string;
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

export type PaymentType =
  | "MATERIAL"
  | "INSTALLATION_DEPOSIT"
  | "PERMIT"
  | "INSTALLATION"
  | "EXTRA";
export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED";

export interface EstimatePayment {
  id: number;
  type: PaymentType;
  sequence: number;
  status: PaymentStatus;
  baseAmount: string | number;
  surchargePercent: string | number;
  surchargeAmount: string | number;
  amount: string | number;
  stripeSessionId: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  payments?: EstimatePayment[];
  installationJob?: {
    id: number;
    status: InstallationJobStatus;
  } | null;
}

export type InstallationBillingUnit =
  | "UNIT"
  | "PANEL"
  | "SQFT"
  | "SQFT_RECTANGULAR"
  | "LINEAR_FOOT";

export type InstallationRuleMetric =
  | "NONE"
  | "WIDTH"
  | "HEIGHT"
  | "AREA"
  | "PANEL_COUNT"
  | "LENGTH";

export type InstallationLineOrigin = "AUTO" | "USER_SELECTED" | "FIELD_ADDED";

export type InstallationJobStatus =
  | "REQUESTED"
  | "DEPOSIT_PAYMENT_PENDING"
  | "MEASUREMENT_SCHEDULING"
  | "MEASUREMENT_SCHEDULED"
  | "MEASUREMENT_PENDING"
  | "QUOTE_DRAFT"
  | "ADMIN_APPROVAL_PENDING"
  | "CUSTOMER_APPROVAL_PENDING"
  | "APPROVED"
  | "PERMIT_PAYMENT_PENDING"
  | "PERMIT_PROCESSING"
  | "MATERIAL_PAYMENT_PENDING"
  | "MATERIAL_PAID"
  | "INSTALLATION_PAYMENT_PENDING"
  | "INSTALLATION_PAID"
  | "SCHEDULING"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export type InstallationQuoteReason =
  | "REMEASUREMENT"
  | "PERMIT_REVISION"
  | "FIELD_CHANGE";

export type InstallationQuoteStatus =
  | "DRAFT"
  | "PENDING_ADMIN_APPROVAL"
  | "PENDING_CUSTOMER_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type InstallationPermitStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "SUBMITTED"
  | "CHANGES_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export type InstallationAppointmentStatus =
  | "PROPOSED"
  | "ACCEPTED"
  | "RESCHEDULE_REQUESTED"
  | "SUPERSEDED"
  | "CANCELED"
  | "COMPLETED";

export type InstallationAppointmentType = "REMEASUREMENT" | "INSTALLATION";

export interface InstallationServiceRule {
  id: number;
  serviceId: number;
  minValue: string | number | null;
  minInclusive: boolean;
  maxValue: string | number | null;
  maxInclusive: boolean;
  rate: string | number;
  sortOrder: number;
  isActive: boolean;
}

export interface InstallationService {
  id: number;
  name: string;
  description?: string | null;
  billingUnit: InstallationBillingUnit;
  ruleMetric: InstallationRuleMetric;
  baseRate: string | number;
  minimumCharge: string | number;
  availableForRequest: boolean;
  availableForField: boolean;
  isActive: boolean;
  sortOrder: number;
  rules: InstallationServiceRule[];
  _count?: { sysConfs: number; lines: number };
}

export interface InstallationPriceProfile {
  id: number;
  name: string;
  adjustmentPercent: string | number;
  minimumCharge: string | number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  _count?: { roles: number; users: number; quotes: number };
}

export interface InstallationMeasurement {
  id: number;
  jobId: number;
  pieceId: number | null;
  unitIndex: number;
  label: string;
  isManual: boolean;
  status: "PENDING" | "COMPLETED";
  widthIn: string | number | null;
  heightIn: string | number | null;
  heightLeftIn: string | number | null;
  heightRightIn: string | number | null;
  legHeightIn: string | number | null;
  sashHeightIn: string | number | null;
  windowHeightIn: string | number | null;
  doorWidthIn: string | number | null;
  doorHeightIn: string | number | null;
  leftSideliteWidthIn: string | number | null;
  rightSideliteWidthIn: string | number | null;
  leftPanels: number | null;
  rightPanels: number | null;
  panelCount: number | null;
  horizontalHeights: number[] | null;
  lengthIn: string | number | null;
  notes?: string | null;
  measuredAt?: string | null;
  updatedAt?: string;
}

export type EstimateRevisionStatus =
  | "DRAFT"
  | "PENDING_ADMIN_APPROVAL"
  | "PENDING_CUSTOMER_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type EstimateRevisionItemAction =
  | "UNCHANGED"
  | "UPDATE"
  | "REPLACE"
  | "REMOVE";

export type EstimateRevisionChangeReason =
  | "REMEASUREMENT"
  | "EGRESS"
  | "DIMENSION_LIMITS"
  | "STRUCTURAL_CONDITION"
  | "CUSTOMER_REQUEST"
  | "OTHER";

export interface EstimateRevisionTotals {
  units: number;
  rateT: string | number;
  priceT: string | number;
  netProfit: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  totalPayable: string | number;
  customerPriceT: string | number;
  customerTaxRate: string | number;
  customerTaxAmount: string | number;
  customerTotalPayable: string | number;
  netProfitD: string | number;
}

export interface EstimateRevisionPieceSnapshot {
  mark?: string;
  productName?: string | null;
  brandName?: string | null;
  systemName?: string | null;
  configName?: string | null;
  crystalName?: string | null;
  width?: string | number | null;
  height?: string | number | null;
  doorWidth?: string | number | null;
  doorHeight?: string | number | null;
  pieceInput?: CreatePieceData;
  display?: {
    productName?: string | null;
    brandName?: string | null;
    systemName?: string | null;
    configName?: string | null;
    crystalName?: string | null;
  };
}

export interface EstimateRevisionItem {
  id: number;
  revisionId: number;
  measurementId: number;
  originalPieceId: number | null;
  sourceUnitIndex: number;
  action: EstimateRevisionItemAction;
  reason: EstimateRevisionChangeReason;
  reasonNote?: string | null;
  originalSnapshot: EstimateRevisionPieceSnapshot;
  proposedPieceInput?: CreatePieceData | null;
  calculatedSnapshot?: (EstimateRevisionPieceSnapshot & {
    rate?: string | number;
    price?: string | number;
    customerPrice?: string | number;
  }) | null;
}

export interface EstimateRevision {
  id: number;
  estimateId: number;
  installationJobId: number;
  quoteId: number;
  version: number;
  status: EstimateRevisionStatus;
  reason: InstallationQuoteReason;
  originalTotals: EstimateRevisionTotals;
  revisedTotals: EstimateRevisionTotals;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  appliedAt?: string | null;
  items: EstimateRevisionItem[];
}

export interface InstallationQuoteLine {
  id: number;
  quoteId: number;
  serviceId: number;
  measurementId: number | null;
  origin: InstallationLineOrigin;
  serviceNameSnapshot: string;
  billingUnitSnapshot: InstallationBillingUnit;
  ruleMetricSnapshot: InstallationRuleMetric;
  componentLabel?: string | null;
  widthIn?: string | number | null;
  heightIn?: string | number | null;
  areaSqFt?: string | number | null;
  panelCount?: number | null;
  lengthIn?: string | number | null;
  rate: string | number;
  billableQuantity: string | number;
  occurrences: number;
  baseAmount: string | number;
  adjustmentPercent: string | number;
  adjustedAmount: string | number;
  description?: string | null;
  sortOrder: number;
}

export interface InstallationQuoteApproval {
  id: number;
  stage: "ADMIN" | "CUSTOMER";
  decision: "APPROVED" | "REJECTED";
  comment?: string | null;
  createdAt: string;
  actor?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}

export interface InstallationServiceMinimumSnapshot {
  serviceId: number;
  serviceName: string;
  minimumCharge: string | number;
  calculatedAmount: string | number;
  adjustment: string | number;
}

export interface InstallationQuote {
  id: number;
  jobId: number;
  version: number;
  status: InstallationQuoteStatus;
  approvalReason: InstallationQuoteReason;
  profileNameSnapshot: string;
  profileAdjustmentPercent: string | number;
  profileMinimumSnapshot: string | number;
  baseSubtotal: string | number;
  adjustedSubtotal: string | number;
  serviceMinimumAdjustment: string | number;
  serviceMinimumsSnapshot?: InstallationServiceMinimumSnapshot[] | null;
  minimumAdjustment: string | number;
  total: string | number;
  needsRecalculation: boolean;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  lines: InstallationQuoteLine[];
  approvals: InstallationQuoteApproval[];
}

export interface InstallationPermit {
  id: number;
  status: InstallationPermitStatus;
  permitFeeSnapshot: string | number;
  cityFee: string | number | null;
  notes?: string | null;
  paidAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

export interface InstallationAppointment {
  id: number;
  type: InstallationAppointmentType;
  status: InstallationAppointmentStatus;
  startsAt: string;
  endsAt?: string | null;
  note?: string | null;
  responseNote?: string | null;
  proposedBy?: { id: number; firstName: string; lastName: string };
  respondedBy?: { id: number; firstName: string; lastName: string } | null;
}

export interface InstallationJob {
  id: number;
  estimateId: number;
  status: InstallationJobStatus;
  depositAmountSnapshot: string | number;
  depositTermsSnapshot?: string | null;
  depositTermsAcceptedAt?: string | null;
  cancellationReason?: string | null;
  requestedAt: string;
  updatedAt: string;
  estimate: Estimate & {
    user: User;
    order?: (Order & { status?: OrderStatus }) | null;
    pieces?: PieceWithRelations[];
  };
  measurements: InstallationMeasurement[];
  quotes: InstallationQuote[];
  permit?: InstallationPermit | null;
  payments: EstimatePayment[];
  appointments: InstallationAppointment[];
  revisions: EstimateRevision[];
}

export type InstallationListScope =
  | "active"
  | "completed"
  | "canceled"
  | "all";

export interface InstallationListQuery {
  page?: number;
  pageSize?: 25 | 50 | 100;
  scope?: InstallationListScope;
  status?: InstallationJobStatus;
  search?: string;
}

export interface InstallationJobSummary {
  id: number;
  estimateId: number;
  status: InstallationJobStatus;
  requestedAt: string;
  updatedAt: string;
  estimate: {
    idUser: number;
    number: string;
    name: string;
    customerFirstName?: string | null;
    customerLastName?: string | null;
    customerEmail?: string | null;
    user: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
      role: { name: string };
    };
    order?: { id: number; number: string } | null;
  };
  openings: number;
  latestQuote: {
    id: number;
    version: number;
    status: InstallationQuoteStatus;
    approvalReason: InstallationQuoteReason;
    total: string | number;
  } | null;
  nextAppointment: {
    id: number;
    type: InstallationAppointmentType;
    status: InstallationAppointmentStatus;
    startsAt: string;
    endsAt?: string | null;
  } | null;
}

export interface InstallationJobsPage {
  items: InstallationJobSummary[];
  page: number;
  pageSize: 25 | 50 | 100;
  total: number;
  totalPages: number;
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
  extraCharges?: OrderExtraCharge[];
}

export type OrderExtraChargeStatus =
  | "DRAFT"
  | "PENDING_CUSTOMER_APPROVAL"
  | "PAYMENT_DUE"
  | "PAID"
  | "REJECTED"
  | "CANCELED";

export interface OrderExtraChargeLine {
  id: number;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  taxable: boolean;
  subtotal: string | number;
  taxAmount: string | number;
  total: string | number;
  sortOrder: number;
}

export interface OrderExtraCharge {
  id: number;
  orderId: number;
  sequence: number;
  status: OrderExtraChargeStatus;
  subtotal: string | number;
  taxRateSnapshot: string | number;
  taxAmount: string | number;
  total: string | number;
  notes?: string | null;
  decisionComment?: string | null;
  lines: OrderExtraChargeLine[];
  payment?: EstimatePayment | null;
  submittedAt?: string | null;
  respondedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface PricingRangeRule {
  id: number;
  rangeId: number;
  idCrystal: number;

  costoA: string;
  costoB: string;
  costoC: string;

  crystal: Crystal;

  createdAt: string;
  updatedAt: string;
}

export interface PricingRange {
  id: number;

  idSystem: number;
  idConfig: number;

  code: string;

  minWidthIn: string | null;
  minWidthInclusive: boolean;
  maxWidthIn: string | null;
  maxWidthInclusive: boolean;

  minHeightIn: string | null;
  minHeightInclusive: boolean;
  maxHeightIn: string | null;
  maxHeightInclusive: boolean;

  sortOrder: number;
  isActive: boolean;

  rules: PricingRangeRule[];

  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRangeData {
  idSystem: number;
  idConfig: number;

  code: string;

  minWidthIn?: string | null;
  minWidthInclusive?: boolean;
  maxWidthIn?: string | null;
  maxWidthInclusive?: boolean;

  minHeightIn?: string | null;
  minHeightInclusive?: boolean;
  maxHeightIn?: string | null;
  maxHeightInclusive?: boolean;

  sortOrder?: number;
  isActive?: boolean;

  rules: UpsertPricingRangeRuleData[];
}

export type UpdatePricingRangeData = Partial<
  Omit<CreatePricingRangeData, "idSystem" | "idConfig">
>;

export interface PricingRangeFilters {
  idSystem?: number;
  idConfig?: number;
}

export interface UpsertPricingRangeRuleData {
  idCrystal: number;
  costoA: string;
  costoB: string;
  costoC: string;
}

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
  minimumBillableWidthIn?: string | null;
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
  hexCode: string;
  isGlobal?: boolean;
};

export type UpdateFrameColorData = {
  color?: string;
  hexCode?: string;
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
  hexCode: string;
};

export type UpdateTintData = {
  color?: string;
  hexCode?: string;
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

export type UpdateEstimateHeaderData = Partial<CreateEstimateHeaderData>;

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
  installationPriceProfileId?: number | null;
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
