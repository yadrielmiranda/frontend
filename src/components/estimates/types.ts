import type {
  CreatePieceData,
  EstimateWithRelations,
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  MuntinPattern,
  MuntinType,
  PieceMuntin,
} from "@/lib/types";

export interface PieceFormValues extends CreatePieceData {
  id?: number;
  rate: number;
  price: number;
  subtotal: number;
  dealerMarkup: number;
  total: number;
  netProfitD: number;
  customerPrice: number;
  customerSubtotal: number;
  dpPosPsf: number | null;
  dpNegPsf: number | null;
  muntin?: PieceMuntin | null;

  idActiveOption?: number | null;
  idPreparationOption?: number | null;
  idSillOption?: number | null;
  idReinforcementOption?: number | null;

  heightLeft?: string | null;
  heightRight?: string | null;
  legHeight?: string | null;

  doorWidth?: string | null;
  leftSideliteWidth?: string | null;
  rightSideliteWidth?: string | null;
  leftPanels?: number | null;
  rightPanels?: number | null;
  panelCount?: number | null;
  horizontalHeights?: number[] | null;
}

export interface EstimateFormValues {
  name: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerStreet?: string;
  customerCity?: string;
  customerState?: string;
  customerPostalCode?: string;

  generalDealerMarkup: number;
  defaultFrameColorId: number;
  defaultTintId: number;
  defaultCoatingId: number;
  customerTaxRate: number;
  pieces: PieceFormValues[];
}

export interface EstimateFormProps {
  estimate?: EstimateWithRelations;
  taxRate: number;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  globalFrameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];
}