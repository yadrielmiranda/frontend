import type { CompanyLocale } from "@/components/company/company-content";
import { estimateActionError } from "@/lib/estimate-action-language";

const notices = {
  "Failed to save the Estimate details.": "No se pudieron guardar los detalles de la cotización.",
  "Estimate recalculated successfully.": "Se recalculó la cotización.",
  "Failed to recalculate the Estimate.": "No se pudo recalcular la cotización.",
  "The Estimate must be created before updating its pieces.": "Crea la cotización antes de actualizar sus piezas.",
  "Add at least one Piece before applying this update.": "Agrega al menos una pieza antes de aplicar este cambio.",
  "Failed to update the Pieces.": "No se pudieron actualizar las piezas.",
  "Frame Color updated and saved for all Pieces.": "Se guardó el color del marco en todas las piezas.",
  "Glass color saved for all applicable pieces.": "Se guardó el color del vidrio en las piezas a las que corresponde.",
  "Coating updated and saved for all applicable Pieces.": "Se guardó el recubrimiento en las piezas a las que corresponde.",
  "General Dealer Markup must be zero or greater.": "El margen general del distribuidor debe ser cero o mayor.",
  "General Dealer Markup applied and saved successfully.": "Se guardó el margen general del distribuidor.",
  "Failed to apply General Dealer Markup.": "No se pudo aplicar el margen general del distribuidor.",
  "Piece duplicated. Please enter a new mark and recalculate.": "Se duplicó la pieza. Escribe un identificador nuevo y vuelve a calcular.",
  "The persisted Piece could not be identified.": "No se pudo identificar la pieza guardada.",
  "Piece updated successfully.": "Se guardaron los cambios de la pieza.",
  "Piece added successfully.": "Se agregó la pieza.",
  "Failed to save the Piece.": "No se pudo guardar la pieza.",
  "The Piece could not be found.": "No se encontró la pieza.",
  "Mark updated successfully.": "Se actualizó el identificador de la pieza.",
  "Failed to update the Mark.": "No se pudo actualizar el identificador de la pieza.",
  "Piece deleted successfully.": "Se eliminó la pieza.",
  "Failed to delete the Piece.": "No se pudo eliminar la pieza.",
} as const;

export type EditorNotice = keyof typeof notices;
export function editorNotice(locale: CompanyLocale, message: EditorNotice, error?: unknown) {
  const fallback = locale === "es" ? notices[message] : message;
  if (!(error instanceof Error) || !error.message || error.message === message) return fallback;
  const detail = estimateActionError(locale, error, error.message);
  return locale === "es" && detail === error.message ? `${fallback} ${detail}` : detail;
}
