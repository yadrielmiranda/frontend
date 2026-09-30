export interface AuthUser {
  networkSalesBlocked?: boolean;
  parentDealerId?: number | null;
  dealerLevel?: "DEALER" | "SUBDEALER" | "DISTRIBUTOR";
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isTaxExempt: boolean;
  dealerMode?: "EXTERNAL" | "INTERNAL" | null;
  role: {
    id: number;
    name: string;
  };
}

export interface LoginResponse {
  message?: string; // Mensaje de éxito del backend
  user?: AuthUser; // ¡Los datos del usuario ahora vendrán aquí!
}
