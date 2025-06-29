export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LoginResponse {
  message?: string; // Mensaje de éxito del backend
  user?: AuthUser;  // ¡Los datos del usuario ahora vendrán aquí!
}
