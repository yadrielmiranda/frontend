// src/lib/validators-email.ts

/**
 * Normaliza email:
 * - trim
 * - lowercase
 * - null si vacío
 */
export function normalizeEmail(
  input?: string | null
): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  return v.toLowerCase();
}

/**
 * Validación básica para UI
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
