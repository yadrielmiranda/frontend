import type { CompanyLocale } from "@/components/company/company-content";

const spanish = {
  "Contract": "Contrato",
  "Preparing agreement": "Preparando el acuerdo",
  "Awaiting signature": "Pendiente de firma",
  "Signed": "Firmado",
  "Requires new signature": "Requiere una nueva firma",
  "Customer agreement": "Acuerdo con el cliente",
  "A material revision is awaiting the customer signature.": "Una revisión de materiales está pendiente de la firma del cliente.",
  "This estimate is canceled; a new signature cannot be requested.": "Esta cotización se canceló y ya no se admite una nueva firma.",
  "Select": "Selecciona",
  "Include contract": "Incluir contrato",
  "and share again.": "y vuelve a compartir la cotización.",
  "An authorized dealer or administrator can share the updated agreement.": "Un distribuidor o administrador autorizado puede compartir el acuerdo actualizado.",
  "The original material stays unchanged until the new agreement is signed.": "Los materiales originales se mantienen hasta que se firme el nuevo acuerdo.",
  "Contract · Signed before cancellation": "Contrato · Firmado antes de la cancelación",
  "Contract · Estimate canceled": "Contrato · Cotización cancelada",
  "Contract signed · Change pending approval": "Contrato firmado · Cambio pendiente de aprobación",
  "Download signed Change Order": "Descargar orden de cambio firmada",
  "Download signed agreement": "Descargar acuerdo firmado",
  "An authorized dealer or administrator can share the updated agreement to request a new signature.": "Un distribuidor o administrador autorizado puede compartir el acuerdo actualizado para solicitar una nueva firma.",
  "Select Include contract and share again to request acceptance of the updated charges.": "Selecciona «Incluir contrato» y vuelve a compartir la cotización para solicitar la aceptación de los cargos actualizados.",
  "Select Include contract and share the estimate again to request a new signature.": "Selecciona «Incluir contrato» y vuelve a compartir la cotización para solicitar una nueva firma.",
  "Previous signed documents": "Documentos firmados anteriormente",
  "Change Order": "Orden de cambio",
  "Agreement revision": "Revisión del acuerdo",
  "Estimate not found.": "No se encontró la cotización.",
  "Failed to fetch": "No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.",
} as const;

export const agreementText = (locale: CompanyLocale) => (label: keyof typeof spanish) =>
  locale === "es" ? spanish[label] : label;

export function agreementError(locale: CompanyLocale, message: string) {
  return locale === "es" && Object.prototype.hasOwnProperty.call(spanish, message)
    ? spanish[message as keyof typeof spanish]
    : message;
}
