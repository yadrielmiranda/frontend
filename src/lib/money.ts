/**
 * Redondea valores monetarios a X decimales (por defecto 2).
 * Corrige errores binarios típicos de JS como 13.1749999999.
 *
 * @param value  Número a redondear
 * @param decimals Cantidad de decimales (default 2)
 * @returns number redondeado con precisión estable
 */
export const roundMoney = (value: number, decimals: number = 2): number => {
  if (!Number.isFinite(value)) return 0;

  const factor = Math.pow(10, decimals);

  // Number.EPSILON previene casos como 1.005 → 1.00
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/**
 * Formatea un número como dinero en USD.
 * Se usa para mostrar valores en pantalla.
 *
 * @param value número a formatear
 * @returns string en formato $1,234.56
 */
export const formatMoney = (value: number): string => {
  if (!Number.isFinite(value)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
