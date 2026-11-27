import type { CompanyLocale } from "@/components/company/company-content";
import type { PaymentType } from "@/lib/types";

const spanishMethods = new Map([
  ["CARD", "Tarjeta"],
  ["Card", "Tarjeta"],
  ["BANK", "Banco"],
  ["CHECK", "Cheque"],
  ["CASH", "Efectivo"],
  ["WIRE", "Transferencia bancaria"],
  ["OTHER", "Otro"],
  ["Bank (Link)", "Banco (Link)"],
  ["Card (Link)", "Tarjeta (Link)"],
  ["Bank (ACH)", "Banco (ACH)"],
  ["Bank transfer", "Transferencia bancaria"],
  ["No payment required", "Sin pago requerido"],
  ["Stripe - pending verification", "Stripe - pendiente de verificación"],
  ["Stripe — pending verification", "Stripe — pendiente de verificación"],
  ["Stripe — awaiting confirmation", "Stripe — pendiente de confirmación"],
  ["Not recorded", "Sin registrar"],
]);

export function paymentMethodText(locale: CompanyLocale, method: string) {
  return locale === "es" ? spanishMethods.get(method) ?? method : method;
}

const spanish = {
  "Reviewed payment balance": "Saldo del pago revisado",
  "Ready to place your order": "Todo listo para realizar tu orden",
  "Pay the material total and additional charges. Your order will be created automatically after payment is confirmed.": "Paga el total de los materiales y los cargos adicionales. Tu orden se creará cuando se confirme el pago.",
  "Pay the material total. Your order will be created automatically after payment is confirmed.": "Paga el total de los materiales. Tu orden se creará cuando se confirme el pago.",
  "Installation deposit": "Depósito de instalación",
  "This is the next required payment before remeasurement can be scheduled.": "Paga el depósito para poder programar la nueva medición.",
  "Permit Fee": "Tarifa de gestión del permiso",
  "The installation quote is approved. The Permit Fee is the next required payment.": "Se aprobó la cotización de instalación. El próximo pago corresponde a la gestión del permiso.",
  "Materials + City Fee": "Materiales y tasa municipal",
  "Material payment": "Pago de materiales",
  "Payment submits this estimate for administrative order review.": "Al pagar, la cotización se enviará a administración para revisar la orden.",
  "Installation balance": "Saldo de instalación",
  "The remaining installation balance is now available for payment.": "Ya puedes pagar el saldo pendiente de la instalación.",
  "Custom project payment": "Abono al proyecto",
  "Choose an amount to apply toward your project installments.": "Elige cuánto quieres abonar a las cuotas del proyecto.",
  "Full project balance": "Saldo total del proyecto",
  "Pay all remaining project installments, including payments not yet due.": "Paga todas las cuotas restantes del proyecto, incluidas las futuras.",
  "Custom payment": "Abono al proyecto",
  "Advance payment": "Pago anticipado",
  "Next payment": "Próximo pago",
  "Payment total": "Total del pago",
  "Payment amount": "Importe del pago",
  "Due now": "Por pagar ahora",
  "I understand and accept the non-refundable deposit terms": "Entiendo y acepto las condiciones del depósito no reembolsable",
  "I have reviewed and accept the products, dimensions, configurations and prices in this estimate.": "He revisado y acepto los productos, las medidas, las configuraciones y los precios de esta cotización.",
  "Accepted": "Aceptado",
  "Required": "Obligatorio",
  "If this client registered online, ask them to add an address or confirm they can pick up in Miami before paying.": "Si el cliente se registró en línea, pídele que agregue su dirección o confirme que puede recoger su orden en Miami antes de pagar.",
  "Back to next payment": "Volver al próximo pago",
  "Pay another amount": "Pagar otro importe",
  "Add your address or confirm you can pick up in Miami": "Agrega tu dirección o confirma que puedes recoger tu orden en Miami",
  "Secure checkout": "Pago seguro",
  "Opening checkout...": "Abriendo el pago…",
  "Enter a valid amount": "Ingresa un importe válido",
  "Select a payment": "Selecciona un pago",
  "Accept terms to continue": "Acepta las condiciones para continuar",
  "Resume payment": "Reanudar pago",
  "Confirm City Fee": "Confirmar la tasa municipal",
  "Submit for order review": "Enviar la orden a revisión",
  "Confirm order": "Confirmar orden",
  "Confirm step": "Confirmar etapa",
  "Pay next installment": "Pagar la próxima cuota",
  "Continue to payment": "Continuar al pago",
  "Send this payment link to the final customer.": "Envía este enlace de pago al cliente final.",
  "Record verified payment": "Registrar pago verificado",
  "Accept the non-refundable deposit terms first.": "Acepta las condiciones del depósito no reembolsable para continuar.",
  "Accept the material details first.": "Revisa y acepta los detalles de los materiales para continuar.",
  "Review and accept the City Fee adjustment first.": "Revisa y acepta el ajuste de la tasa municipal para continuar.",
} as const;

export function paymentText(locale: CompanyLocale, text: keyof typeof spanish) {
  return locale === "es" ? spanish[text] : text;
}

const spanishPaymentTypes: Record<PaymentType, string> = {
  INSTALLMENT: "la cuota", MATERIAL: "los materiales", INSTALLATION_DEPOSIT: "el depósito de instalación",
  PERMIT: "el permiso", INSTALLATION: "la instalación", DELIVERY: "la entrega", EXTRA: "el cargo adicional",
};
export function reviewedBalanceDescription(locale: CompanyLocale, type: PaymentType) {
  return locale === "es" ? `Tras la revisión del reembolso, queda un saldo pendiente por ${spanishPaymentTypes[type]}.`
    : `Remaining ${type.toLowerCase().replaceAll("_", " ")} balance after refund review.`;
}

const standardDepositTerms = new Map<string, string>([
  ["Once paid, this deposit is non-refundable. If installation proceeds, the full deposit is credited toward the installation balance.", "Una vez pagado, el depósito no es reembolsable. Si la instalación sigue adelante, el importe completo del depósito se abona al saldo de instalación."],
  ["Once paid, this installation deposit is non-refundable. It is credited toward the first order installment. Any remaining credit is applied to subsequent installments. If the installation is canceled, the deposit is not refunded.", "Una vez pagado, el depósito de instalación no es reembolsable. Se abona a la primera cuota de la orden y cualquier crédito restante se aplica a las cuotas siguientes. Si se cancela la instalación, el depósito no se devuelve."],
  ["Once paid, this installation deposit is non-refundable. If the installation proceeds, the full deposit is credited toward the installation balance. If the installation is canceled, the deposit is not refunded.", "Una vez pagado, el depósito de instalación no es reembolsable. Si la instalación sigue adelante, el importe completo se abona al saldo de instalación. Si se cancela la instalación, el depósito no se devuelve."],
]);

export function paymentDepositTerms(locale: CompanyLocale, text: string) {
  return locale === "es" ? standardDepositTerms.get(text) ?? text : text;
}

const checkoutErrors = new Map<string, string>([
  ["Before paying, add your address or confirm that you can pick up in Miami.", "Antes de pagar, agrega tu dirección o confirma que puedes recoger tu orden en Miami."],
  ["Review and accept the material details in your estimate before payment.", "Revisa y acepta los detalles de los materiales de la cotización antes de pagar."],
  ["Accept the non-refundable installation deposit terms before payment.", "Acepta las condiciones del depósito de instalación no reembolsable antes de pagar."],
  ["Review and accept the City Fee adjustment before payment.", "Revisa y acepta el ajuste de la tasa municipal antes de pagar."],
  ["The project balance changed. Refresh and review the updated amount before payment.", "Cambió el saldo del proyecto. Actualiza la página y revisa el importe antes de pagar."],
  ["The selected balance changed. Refresh and review the updated amount before payment.", "Cambió el saldo seleccionado. Actualiza la página y revisa el importe antes de pagar."],
  ["The installment balance changed. Refresh before paying.", "Cambió el saldo de la cuota. Actualiza la página antes de pagar."],
  ["A selected payment is no longer available. Refresh the payment list.", "Uno de los pagos seleccionados ya no está disponible. Actualiza la lista de pagos."],
  ["The full project balance is not available. Refresh the payment schedule.", "El saldo total del proyecto no está disponible. Actualiza el plan de pagos."],
  ["The approved installment balance changed. Refresh the payment schedule.", "Cambió el saldo aprobado de las cuotas. Actualiza el plan de pagos."],
  ["The previous checkout is still processing. Refresh before trying again.", "El pago anterior sigue en proceso. Actualiza la página antes de volver a intentarlo."],
  ["Checkout completed, but payment confirmation is pending.", "El proceso de pago terminó y la confirmación sigue pendiente."],
  ["The payment amount cannot exceed the approved project balance.", "El importe del pago supera el saldo aprobado del proyecto."],
  ["A custom payment is not available. Refresh the approved payment schedule.", "La opción de pagar otro importe no está disponible. Actualiza el plan de pagos."],
  ["Enter a positive payment amount with at most two decimal places.", "Ingresa un importe mayor que cero con un máximo de dos decimales."],
  ["Review the approved project balance before entering a payment amount.", "Revisa el saldo aprobado del proyecto antes de ingresar el importe."],
  ["Review the full project balance before payment.", "Revisa el saldo total del proyecto antes de pagar."],
  ["Internal dealer charges must be paid by the final customer from the public share link.", "El cliente final debe pagar los cargos del distribuidor interno desde el enlace de pago compartido."],
]);

export function checkoutErrorText(locale: CompanyLocale, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (locale === "en") return message || "Could not open checkout. Please try again.";
  return checkoutErrors.get(message) ?? "No se pudo abrir el pago. Actualiza la cotización y vuelve a intentarlo.";
}
