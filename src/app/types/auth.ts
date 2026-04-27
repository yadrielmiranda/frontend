
export interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isTaxExempt: boolean;
  role: {
    id: number;
    name: string;
  };
}

export interface LoginResponse {
  message?: string; // Mensaje de éxito del backend
  user?: AuthUser;  // ¡Los datos del usuario ahora vendrán aquí!
}
