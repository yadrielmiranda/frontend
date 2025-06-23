export interface AuthUser {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string; // Opcional, si tu backend lo devuelve
  // Añade otros campos públicos del usuario si tu API los devuelve en el cuerpo
}

export interface LoginResponse {
  message?: string; // Mensaje de éxito del backend
  user?: AuthUser;  // ¡Los datos del usuario ahora vendrán aquí!
}
