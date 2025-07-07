import { Role } from "@/app/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  return headers;
};

export async function getRoles(token?: string): Promise<Role[]> {
  const res = await fetch(`${API_URL}/api/roles`, {
    cache: "no-store",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch roles");
  }
  
  return res.json();
}
