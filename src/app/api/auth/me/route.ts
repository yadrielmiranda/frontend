import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, JWTPayload } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) throw new Error('JWT_SECRET_KEY is not set');
  return new TextEncoder().encode(secret);
}

interface AuthPayload extends JWTPayload {
  sub?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: { name: string } | string;
}

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();                 // ✅ Next 15: async
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: 'No autenticado' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { payload } = await jwtVerify(accessToken, getJwtSecret(), {
      clockTolerance: 5, // tolerancia reloj
    });

    const p = payload as AuthPayload;
    const id =
      typeof p.sub === 'string' && /^\d+$/.test(p.sub) ? Number(p.sub) : p.sub;

    return NextResponse.json(
      {
        isAuthenticated: true,
        user: {
          id,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          role: p.role,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    const message =
      error?.message || error?.code || 'Token inválido, expirado o error de verificación';
    return NextResponse.json(
      { message: 'Token inválido o expirado', details: message },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
