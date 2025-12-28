export const normalizeUSZip = (v: unknown): string => {
  if (v == null) return "";
  return String(v).replace(/\D/g, "").slice(0, 5); // solo 5 dígitos
};

export const isValidUSZip = (v: unknown): boolean => {
  const z = normalizeUSZip(v);
  return /^\d{5}$/.test(z);
};
