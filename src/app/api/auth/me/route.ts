import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Para acceder a las cookies en el servidor de Next.js
import { jwtVerify } from 'jose'; // Asegúrate de tener 'jose' instalado: npm install jose

// Define tu constante secreta para verificar el JWT.
// ¡Esta DEBE ser EXACTAMENTE la misma que usas en tu backend de NestJS para firmar los JWTs!
// Se recomienda cargarla desde una variable de entorno.
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY );

export async function GET(request: NextRequest) {
  
  try {
    console.log("[/api/auth/me] Solicitud GET recibida.");

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      console.log("[/api/auth/me] No se encontró 'access_token' en las cookies. Devolviendo 401.");
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    console.log("[/api/auth/me] 'access_token' encontrado. Intentando verificar JWT...");

    console.log(`[Next.js Server] Hora actual de antes de verificar: ${new Date().toISOString()}`);

    // Verifica el token JWT. Si es inválido (expirado, modificado), jwtVerify lanzará un error.
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    
    // Si la verificación es exitosa, payload contiene los datos que pusiste al firmar el token en NestJS.
    // Asegúrate de que los nombres de las propiedades (userID, userName, etc.) coincidan con tu payload real.
    console.log("[/api/auth/me] Token verificado exitosamente. Payload:", payload);

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: payload.userID,       // Ejemplo: el ID del usuario
        username: payload.userName, // Ejemplo: el nombre de usuario
        firstname: payload.userFirstName,
        lastname: payload.userLastName,
        email: payload.userEmail, // Si incluiste el email en el payload
      }
    }, { status: 200 }); // Devolver 200 OK si todo está bien

  } catch (error: any) { // Captura cualquier error que ocurra en el bloque try
    console.error("[/api/auth/me] ERROR al verificar el token o procesar la solicitud:");
    console.error("Tipo de error:", error.name);
    console.error("Mensaje de error:", error.message);
    if (error.code) { // Algunos errores de 'jose' tienen un código
        console.error("Código de error (JOSE):", error.code);
    }
    // console.error("Stack Trace:", error.stack); // Descomenta para depuración profunda

    // Devuelve una respuesta JSON de error con un estado 401
    return NextResponse.json({
      message: 'Token inválido o expirado',
      details: error.message || 'Error desconocido en la verificación del token'
    }, { status: 401 });
  }
}