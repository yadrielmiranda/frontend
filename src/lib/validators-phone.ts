// src/lib/validators-phone.ts
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normaliza un teléfono US a formato E.164.
 * Ej: (305) 555-1234 → +13055551234
 * Retorna null si es inválido o vacío.
 */
export function normalizeUSPhoneToE164(
  input?: string | null
): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const phone = parsePhoneNumberFromString(raw, "US");
  if (!phone || !phone.isValid()) return null;

  return phone.number; // +1XXXXXXXXXX
}

/**
 * Valida si un teléfono US es válido
 */
export function isValidUSPhone(input?: string | null): boolean {
  if (!input) return false;
  const phone = parsePhoneNumberFromString(input, "US");
  return !!phone && phone.isValid();
}
