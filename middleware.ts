// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Define las rutas que quieres proteger
const protectedRoutes = ['/otra', '/products'];
// 2. Define las rutas de autenticación (login, registro)
// a las que no se debe acceder si el usuario ya está logueado.
const authRoutes = ['/login', '/login/register'];

export async function middleware(request: NextRequest) {
  // Intenta obtener el token de la cookie.
  // 'access_token' debe coincidir EXACTAMENTE con el nombre de la cookie
  // que tu backend de NestJS está estableciendo.
  const accessToken = request.cookies.get('access_token')?.value;

  const { pathname } = request.nextUrl;

  // --- Lógica de Protección ---

  // Caso 1: Usuario intenta acceder a una ruta protegida sin token.
  // Si la ruta está en 'protectedRoutes' Y NO hay 'accessToken', redirige a /login.
  if (protectedRoutes.includes(pathname) && !accessToken) {
    console.log(`Acceso denegado a ${pathname}. Redirigiendo a /login.`);
    const url = request.nextUrl.clone(); // Clona la URL actual para modificarla.
    url.pathname = '/login'; // Cambia el pathname a la página de login.
    return NextResponse.redirect(url); // Redirige al usuario.
  }

  // Caso 2: Usuario ya autenticado intenta acceder a rutas de autenticación (login, register).
  // Si la ruta está en 'authRoutes' Y SÍ hay 'accessToken', redirige a la página principal (ej. /otra).
  if (authRoutes.includes(pathname) && accessToken) {
    console.log(`Usuario autenticado intentando acceder a ${pathname}. Redirigiendo a /otra.`);
    const url = request.nextUrl.clone();
    url.pathname = '/otra'; // O a tu dashboard principal, como '/dashboard' o '/'
    return NextResponse.redirect(url);
  }

  // Si no se cumple ninguna de las condiciones anteriores, la solicitud continúa sin interrupción.
  return NextResponse.next();
}

// 3. Configuración del 'matcher': qué rutas debe interceptar este middleware.
export const config = {
  // El middleware se ejecutará para cualquier ruta que coincida con estos patrones.
  // ':path*' significa que coincide con la ruta base (ej. /otra) y cualquier subruta (ej. /otra/algo).
  matcher: ['/otra/:path*', '/products/:path*', '/login', '/login/register'],
};