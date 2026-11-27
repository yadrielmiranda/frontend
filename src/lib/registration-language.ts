import type { CompanyLocale } from "@/components/company/company-content";
import { USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";

const spanish = new Map<string, string>([
  ["Welcome", "Bienvenido"],
  ["Professional quoting for impact windows and doors.", "Cotizaciones profesionales de puertas y ventanas de impacto."],
  ["Loading...", "Cargando…"],
  ["Sign in to create your first estimate.", "Inicia sesión para crear tu primera cotización."],
  ["Access Portal", "Acceder al portal"],
  ["Sign in to continue to your quoting workspace.", "Inicia sesión para acceder a tus cotizaciones."],
  ["Username or Email", "Nombre de usuario o correo electrónico"],
  ["Enter your username or email", "Escribe tu nombre de usuario o correo electrónico"],
  ["Username or email is required.", "Escribe tu nombre de usuario o correo electrónico."],
  ["Enter your password", "Escribe tu contraseña"],
  ["Password must be at least 8 characters.", "La contraseña debe tener al menos 8 caracteres."],
  ["Sign In", "Iniciar sesión"],
  ["Session expired", "Tu sesión venció"],
  ["Sign in again to continue.", "Vuelve a iniciar sesión para continuar."],
  ["Unlock session", "Reanudar sesión"],
  ["Session restored.", "Tu sesión está activa de nuevo."],
  ["Signing in...", "Iniciando sesión…"],
  ["Forgot your password?", "¿Olvidaste tu contraseña?"],
  ["New client? Create an account", "¿Eres cliente nuevo? Crea una cuenta"],
  ["Sign in failed", "No pudimos iniciar tu sesión"],
  ["Invalid credentials or server error.", "Revisa tus datos de acceso e inténtalo de nuevo."],
  ["Invalid username or password.", "El usuario o la contraseña son incorrectos."],
  ["This user account is inactive.", "Esta cuenta está inactiva."],
  ["This account is suspended. Contact your dealer or administrator.", "Esta cuenta está suspendida. Comunícate con tu distribuidor o administrador."],
  ["Create Client Account", "Crear cuenta de cliente"],
  ["Client account details and notification preferences.", "Datos de tu cuenta y preferencias de notificaciones."],
  ["Checking your link…", "Verificando tu enlace…"],
  ["This registration link is invalid. Please request a new link.", "Este enlace de registro no es válido. Solicita uno nuevo."],
  ["This registration link could not be verified. Try again or request a new link.", "No pudimos verificar este enlace de registro. Inténtalo de nuevo o solicita otro enlace."],
  ["Try again", "Volver a intentar"],
  ["First Name", "Nombre"],
  ["Last Name", "Apellido"],
  ["Email", "Correo electrónico"],
  ["Phone", "Teléfono"],
  ["Enter your first name", "Escribe tu nombre"],
  ["Enter your last name", "Escribe tu apellido"],
  ["name@example.com", "nombre@ejemplo.com"],
  ["Enter your phone number", "Escribe tu número de teléfono"],
  ["Providing a phone number does not enroll you in SMS.", "Al ingresar tu teléfono no te suscribes a los SMS."],
  ["Username", "Nombre de usuario"],
  ["Use automatic username", "Usar el nombre de usuario automático"],
  ["Choose your username", "Elige tu nombre de usuario"],
  ["Suggested username", "Nombre de usuario sugerido"],
  ["Suggested username based on your name", "Nombre de usuario sugerido a partir de tu nombre"],
  ["Change", "Cambiar"],
  ["Password", "Contraseña"],
  ["Create a password", "Crea una contraseña"],
  ["Show password", "Mostrar contraseña"],
  ["Hide password", "Ocultar contraseña"],
  ["Use at least 8 characters.", "Usa al menos 8 caracteres."],
  ["SMS notifications", "Notificaciones por SMS"],
  ["SMS notifications are not available for this phone number. You can still create your account.", "Los SMS no están disponibles para este número. Puedes crear tu cuenta de todos modos."],
  ["SMS options could not load. You can still register.", "No pudimos cargar las opciones de SMS. Puedes registrarte de todos modos."],
  ["Retry", "Reintentar"],
  ["Loading SMS options…", "Cargando las opciones de SMS…"],
  ["Service notifications (optional)", "Notificaciones de servicio (opcionales)"],
  ["Promotional messages (optional)", "Mensajes promocionales (opcionales)"],
  ["Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from all SMS or HELP for help.", "La frecuencia de los mensajes varía. Pueden aplicarse cargos por mensajes y datos. Responde STOP para cancelar todos los SMS o HELP para obtener ayuda."],
  ["SMS consent details", "Detalles del consentimiento para SMS"],
  ["Original SMS consent text", "Texto original del consentimiento para SMS"],
  ["SMS Terms of Service", "Términos del servicio SMS (en inglés)"],
  ["SMS Privacy Policy", "Política de privacidad de los SMS (en inglés)"],
  ["Terms and Conditions", "Términos y condiciones"],
  ["Read Terms and Conditions", "Leer los términos y condiciones"],
  ["Back to registration", "Volver al registro"],
  ["Loading terms…", "Cargando los términos…"],
  ["Close", "Cerrar"],
  ["Terms and Conditions have not been published yet.", "Aún no se han publicado los términos y condiciones."],
  ["Could not load the Terms and Conditions. Please try again.", "No pudimos cargar los términos y condiciones. Inténtalo de nuevo."],
  ["I have read and accept the Terms and Conditions for using the platform.", "He leído y acepto los términos y condiciones de uso de la plataforma."],
  ["Account registration is not available yet. Please check back later.", "El registro de cuentas aún no está disponible. Vuelve más tarde."],
  ["Creating account...", "Creando tu cuenta…"],
  ["Create Account", "Crear cuenta"],
  ["Back to Sign In", "Volver al inicio de sesión"],
  ["Your account is ready", "Tu cuenta está lista"],
  ["We couldn’t sign you in automatically. Try again to open your first estimate.", "No pudimos iniciar tu sesión automáticamente. Inténtalo de nuevo para abrir tu primera cotización."],
  ["Opening your first estimate…", "Abriendo tu primera cotización…"],
  ["Continue to my first estimate", "Continuar a mi primera cotización"],
  ["Sign in manually", "Iniciar sesión manualmente"],
  ["Client account created.", "Cuenta de cliente creada."],
  ["Registration failed", "No pudimos crear tu cuenta"],
  ["Please review your information and try again.", "Revisa tus datos e inténtalo de nuevo."],
  ["First name is required.", "Escribe tu nombre."],
  ["Last name is required.", "Escribe tu apellido."],
  ["Please enter a valid email address.", "Escribe un correo electrónico válido."],
  ["Please enter a valid phone number.", "Escribe un número de teléfono válido."],
  ["Password must be at least 8 characters long.", "La contraseña debe tener al menos 8 caracteres."],
  ["That username is already in use. Choose another one.", "Ese nombre de usuario ya está en uso. Elige otro."],
  ["That email is already in use.", "Ese correo electrónico ya está en uso."],
  ["That phone number is already in use.", "Ese número de teléfono ya está en uso."],
  ["Read and accept the Terms and Conditions to continue.", "Lee y acepta los términos y condiciones para continuar."],
  ["The Terms and Conditions changed. Review the current version before accepting.", "Los términos y condiciones han cambiado. Revisa la versión actual antes de aceptarla."],
  ["The messaging terms changed. Review them and select your preferences again.", "Los términos de los SMS han cambiado. Revísalos y vuelve a seleccionar tus preferencias."],
  ["SMS is not currently available for this phone number. You can use your account without enabling SMS.", "Los SMS no están disponibles para este número. Puedes usar tu cuenta sin activarlos."],
  ["SMS is blocked after a STOP request. Leave both SMS options unchecked to create your account, or reply START to the same sending number before subscribing.", "Los SMS están bloqueados porque se respondió STOP. Puedes crear tu cuenta dejando ambas opciones sin marcar o responder START al mismo número antes de suscribirte."],
  ["This referral link is unavailable. Ask the person who shared it for an active link.", "Este enlace de referido no está disponible. Pídele un enlace activo a la persona que te lo envió."],
  ["ThrottlerException: Too Many Requests", "Has hecho varios intentos seguidos. Espera un momento y vuelve a intentarlo."],
  ["Failed to fetch", "No pudimos conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo."],
  ["I agree to receive automated service SMS from {company} about my estimates, installation appointments, orders, payments, and account activity at the phone number I provide.", "Acepto recibir SMS de servicio automatizados de {company} en el número que proporciono sobre mis cotizaciones, citas de instalación, órdenes, pagos y actividad de mi cuenta."],
  ["I agree to receive automated promotional SMS from {company}, including offers, discounts, and product news, at the phone number I provide.", "Acepto recibir SMS promocionales automatizados de {company} en el número que proporciono, con ofertas, descuentos y novedades sobre productos."],
  ["Both SMS options are optional. Consent is not a condition of creating an account, using the service, or making a purchase. Message frequency varies. Message and data rates may apply. You can turn off either SMS category in Profile and select Save preferences. Reply STOP to unsubscribe from all SMS or HELP for help.", "Ambas opciones de SMS son voluntarias. Puedes crear una cuenta, usar el servicio o comprar sin dar tu consentimiento. La frecuencia de los mensajes varía. Pueden aplicarse cargos por mensajes y datos. Para desactivar una categoría de SMS, abre tu perfil (Profile) y guarda tus preferencias (Save preferences). Responde STOP para cancelar todos los SMS o HELP para obtener ayuda."],
  [USERNAME_VALIDATION_MESSAGE, "El nombre de usuario debe tener entre 4 y 24 caracteres y empezar por una letra. Usa letras, números, puntos, guiones bajos o guiones. Los separadores no pueden ir seguidos ni al final."],
]);

export function registrationText(locale: CompanyLocale, text: string): string {
  return locale === "es" ? spanish.get(text) ?? text : text;
}

export function registrationSignInError(locale: CompanyLocale, message: string): string {
  const source = message === "Credenciales inválidas." ? "Invalid username or password." : message;
  return locale === "es" ? spanish.get(source) ?? registrationText(locale, "Invalid credentials or server error.") : source;
}

// Translate a published SMS statement only while it matches the wording we reviewed.
export function registrationSmsText(locale: CompanyLocale, text: string, company: string): string {
  if (locale !== "es" || !text) return text;
  const key = company ? text.replace(company, "{company}") : text;
  return spanish.get(key)?.replace("{company}", () => company) ?? text;
}

const errorMessages: Record<string, string> = {
  USERNAME_TAKEN: "That username is already in use. Choose another one.",
  EMAIL_TAKEN: "That email is already in use.",
  PHONE_TAKEN: "That phone number is already in use.",
  PLATFORM_TERMS_REQUIRED: "Read and accept the Terms and Conditions to continue.",
  PLATFORM_TERMS_CHANGED: "The Terms and Conditions changed. Review the current version before accepting.",
  CONSENT_VERSION_CHANGED: "The messaging terms changed. Review them and select your preferences again.",
};

export function registrationError(locale: CompanyLocale, message: string | undefined, code: unknown): string {
  const fallback = "Please review your information and try again.";
  if (locale === "en") return message ?? fallback;
  const source = typeof code === "string" && Object.hasOwn(errorMessages, code) ? errorMessages[code] : message ?? fallback;
  return spanish.get(source) ?? registrationText(locale, fallback);
}
