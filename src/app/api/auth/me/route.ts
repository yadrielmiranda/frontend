import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { isAuthenticated: false, user: null, message: "No autenticado" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // ✅ Proxy a Nest (ya valida el JWT con su secret)
  const res = await fetch(`${API_URL}/api/auth/profile`, {
    method: "GET",
    headers: {
      Cookie: `access_token=${accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { isAuthenticated: false, user: null, message: "No autenticado" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const user = await res.json();

  return NextResponse.json(
    { isAuthenticated: true, user },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
