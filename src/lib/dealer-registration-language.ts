import type { CompanyLocale } from "@/components/company/company-content";
import type { RegistrationLevel } from "@/app/api/dealer-network.api";
import { registrationError, registrationSmsText, registrationText } from "./registration-language";

const spanish = new Map<string, string>([
  ["Dealer network registration", "Registro de la red de distribuidores"],
  ["Apply for access to the Authentic Evolution dealer network.", "Solicita acceso a la red de distribuidores de Authentic Evolution."],
  ["Invited by", "Invitación de"],
  ["Loading invitation…", "Cargando la invitación…"],
  ["This invitation is unavailable. Please ask the person who invited you for a current link.", "Esta invitación no está disponible. Pídele un enlace vigente a la persona que te invitó."],
  ["We could not load your invitation. Please try again.", "No pudimos cargar tu invitación. Inténtalo de nuevo."],
  ["Account details", "Datos de la cuenta"],
  ["First name", "Nombre"], ["Last name", "Apellido"],
  ["Address", "Dirección"], ["Street address", "Dirección de la calle"], ["City", "Ciudad"],
  ["State", "Estado"], ["Select state", "Selecciona el estado"], ["ZIP code", "Código postal"],
  ["Apartment, suite, unit, etc. (optional)", "Apartamento, suite, unidad, etc. (opcional)"],
  ["Business details", "Datos del negocio"], ["Company name (optional)", "Nombre de la empresa (opcional)"],
  ["Estimated monthly sales (USD, optional)", "Ventas mensuales estimadas (USD, opcional)"],
  ["Years of experience", "Años de experiencia"],
  ["Enter a valid phone number.", "Escribe un número de teléfono válido."],
  ["This username is already in use. Choose another username or use an automatic one.", "Ese nombre de usuario ya está en uso. Elige otro o usa el nombre automático."],
  ["The email or phone is already in use.", "El correo electrónico o el teléfono ya está en uso."],
  ["The username, email or phone is already in use.", "El nombre de usuario, el correo electrónico o el teléfono ya está en uso."],
  ["The inviting network is inactive or suspended.", "La red que te invitó está inactiva o suspendida."],
  ["Invitation unavailable.", "Esta invitación ya no está disponible."],
  ["SMS is blocked after a STOP request. Leave both SMS options unchecked to submit your application.", "Los SMS están bloqueados porque se respondió STOP. Deja ambas casillas de SMS sin marcar para enviar tu solicitud."],
  ["SMS notifications are not available for this phone number. You can still submit your application.", "Los SMS no están disponibles para este número. Puedes enviar tu solicitud de todos modos."],
  ["SMS is not currently available for this phone number. You can use your account without enabling SMS.", "Este número no puede recibir SMS. Puedes enviar tu solicitud con ambas opciones de SMS desmarcadas."],
  ["Enter a valid phone number to check SMS availability.", "Escribe un número de teléfono válido para comprobar si puede recibir SMS."],
  ["Could not load SMS options. You can still submit your application.", "No pudimos cargar las opciones de SMS. Puedes enviar tu solicitud de todos modos."],
  ["Retry SMS options", "Volver a cargar las opciones de SMS"],
  ["Loading SMS options...", "Cargando las opciones de SMS…"],
  ["Loading terms...", "Cargando los términos…"],
  ["Retry terms", "Volver a cargar los términos"],
  ["Submitting…", "Enviando…"], ["Submit application", "Enviar solicitud"],
  ["Could not submit your application. Please try again.", "No pudimos enviar tu solicitud. Inténtalo de nuevo."],
]);

const headings: Record<RegistrationLevel, string> = {
  Dealer: "Registro de distribuidores",
  Subdealer: "Registro de subdistribuidores",
  Distributor: "Registro de distribuidores finales",
};

export function dealerRegistrationTitle(locale: CompanyLocale, level?: RegistrationLevel): string {
  if (!level) return dealerRegistrationText(locale, "Dealer network registration");
  return locale === "es" ? headings[level] : `${level} registration`;
}

export function dealerRegistrationText(locale: CompanyLocale, source: string): string {
  return locale === "es" ? spanish.get(source) ?? registrationText(locale, source) : source;
}

export function dealerSubmissionError(locale: CompanyLocale, source: string, code?: unknown): string {
  const translated = locale === "es" ? spanish.get(source) : undefined;
  if (translated) return translated;
  return registrationError(locale, source, code);
}

const dealerSmsStatements = [
  ["I agree to receive automated service SMS from {company} about my dealer network application, including its approval or rejection, and, if approved, my estimates, installation appointments, orders, payments, and account activity at the phone number I provide.", "Acepto recibir SMS automatizados de servicio de {company} en el número que proporciono sobre mi solicitud de ingreso a la red de distribuidores, incluida su aprobación o rechazo. Si se aprueba, también acepto recibirlos sobre mis cotizaciones, citas de instalación, órdenes, pagos y actividad de mi cuenta."],
  ["If my application is approved, I agree to receive automated promotional SMS from {company}, including offers, discounts, and product news, at the phone number I provide.", "Si se aprueba mi solicitud, acepto recibir SMS promocionales automatizados de {company} en el número que proporciono, incluidas ofertas, descuentos y novedades sobre productos."],
] as const;

export function dealerRegistrationSmsText(locale: CompanyLocale, source: string, company: string): string {
  if (locale === "es" && company) {
    for (const [english, translation] of dealerSmsStatements) {
      if (source === english.replace("{company}", () => company)) return translation.replace("{company}", () => company);
    }
  }
  return registrationSmsText(locale, source, company);
}
