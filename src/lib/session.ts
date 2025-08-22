// src/lib/session.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Leemos el secreto directamente de las variables de entorno.
// ¡Asegúrate de que JWT_SECRET_KEY esté definida en tu archivo .env o .env.local!
const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY,
);

// Definimos un tipo para el payload del JWT que esperamos,
// coincidiendo con lo que envías desde NestJS y usas en tu API Route.
interface UserPayload {
  sub: number; // 'sub' es el estándar para el ID de usuario
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
  // Permite otros campos por si los añades en el futuro
  [key: string]: any; 
}

/**
 * Obtiene los datos del usuario actual desde la cookie en un Server Component.
 * @returns El payload del usuario decodificado o null si no está autenticado o el token es inválido.
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
  // La función cookies() devuelve una Promesa, por lo que necesita 'await'.
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return null;
  }

  try {
    // Verificamos el token usando el secreto de las variables de entorno
    const { payload } = await jwtVerify(token, secretKey);
    
    // Usamos 'as unknown as UserPayload' para una conversión de tipos explícita y segura.
    return payload as unknown as UserPayload;
    
  } catch (error) {
    // Si el token es inválido (expirado, etc.), la función jwtVerify lanzará un error.
    console.error("Error verifying token in session helper:", error);
    return null;
  }
}