import type {
  CreatePieceData,
  EstimateWithRelations,
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
} from "@/app/api/types";

// --- Tipos para el Formulario ---
export interface PieceFormValues extends CreatePieceData {
  id?: number;

  // métricas
  rate: number;
  price: number; // unit (your price)
  subtotal: number; // line (your price * qty)

  // dealer
  dealerMarkup: number; // % en el form
  total: number; // line customer total (customerSubtotal)
  netProfitD: number; // line dealer profit (pre-tax)
  customerPrice: number; // unit customer price
  customerSubtotal: number; // line customer subtotal

  // presiones
  dpPosPsf: number | null;
  dpNegPsf: number | null;

  // dimensiones opcionales
  heightLeft?: string | undefined;
  heightRight?: string | undefined;
  legHeight?: string | undefined;
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
  customerTaxRate: number; // % en el form
  pieces: PieceFormValues[];
}

// --- Props del Componente ---
export interface EstimateFormProps {
  estimate?: EstimateWithRelations;
  taxRate: number;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
}
