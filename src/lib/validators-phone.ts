import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;

/** One contact number, without extensions or text surrounding the number. */
export function normalizePhoneToE164(input?: string | null, defaultCountry: CountryCode = "US"): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 80 || !PHONE_CHARACTERS.test(raw)) return null;
  const phone = parsePhoneNumberFromString(raw, { defaultCountry, extract: false });
  return phone && !phone.ext && phone.isValid() ? phone.number : null;
}

export function isValidPhone(input?: string | null, defaultCountry: CountryCode = "US"): boolean {
  return normalizePhoneToE164(input, defaultCountry) !== null;
}

/** Mirrors the currently supported SMS destinations; account phones can be international. */
export function isSmsPhoneSupported(input?: string | null): boolean {
  const phone = normalizePhoneToE164(input);
  return !!phone && /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone);
}

export function phoneCountry(input?: string | null): CountryCode | undefined {
  if (typeof input !== "string" || !input.trim().startsWith("+")) return undefined;
  return parsePhoneNumberFromString(input.trim(), { extract: false })?.country;
}

/** Preserve partial/invalid input for form validation instead of silently clearing it. */
export function internationalPhoneInputValue(input: string, country: CountryCode): string {
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  if (PHONE_CHARACTERS.test(raw)) {
    const phone = parsePhoneNumberFromString(raw, { defaultCountry: country, extract: false });
    if (phone && !phone.ext) return phone.number;
  }
  return `+${getCountryCallingCode(country)} ${raw}`;
}

export function nationalPhoneInputValue(input: string, country: CountryCode): string {
  if (!input) return "";
  const normalized = normalizePhoneToE164(input, country);
  const phone = normalized ? parsePhoneNumberFromString(normalized) : undefined;
  if (phone?.country === country) return phone.formatNational();
  const prefix = `+${getCountryCallingCode(country)}`;
  return input.startsWith(prefix) ? input.slice(prefix.length).trimStart() : input;
}

// Compatibility for existing callers; US is only the default interpretation.
export const normalizeUSPhoneToE164 = normalizePhoneToE164;
export const isValidUSPhone = isValidPhone;
