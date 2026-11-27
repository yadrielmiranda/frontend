import type { EstimateSendChannel, EstimateSendResult } from "@/app/api/estimates.api";

const spanishSendErrors = new Map<string, string>(Object.entries({
  "Email delivery was not confirmed. Check whether it arrived before sending again.": "No se pudo confirmar la entrega del correo. Comprueba si llegó antes de volver a enviarlo.",
  "Email delivery could not be confirmed. Check whether it arrived before sending again.": "No se pudo confirmar la entrega del correo. Comprueba si llegó antes de volver a enviarlo.",
  "The email could not be sent.": "No se pudo enviar el correo.",
  "The email service rejected the recipient. Check the email address before trying again.": "El servicio de correo rechazó el destinatario. Revisa su dirección antes de volver a intentarlo.",
  "SMS delivery was not confirmed. Check whether it arrived before sending again.": "No se pudo confirmar la entrega del SMS. Comprueba si llegó antes de volver a enviarlo.",
  "SMS delivery could not be confirmed. Check whether it arrived before sending again.": "No se pudo confirmar la entrega del SMS. Comprueba si llegó antes de volver a enviarlo.",
  "SMS acceptance was not confirmed. Check whether it arrived before sending again.": "No se pudo confirmar el envío del SMS. Comprueba si llegó antes de volver a enviarlo.",
  "The SMS could not be sent.": "No se pudo enviar el SMS.",
  "This number has stopped SMS messages. The recipient must reply START before another SMS can be sent.": "El destinatario dio de baja los SMS. Debe responder START para volver a recibirlos.",
  "The SMS service is busy. The message was not accepted; try again later.": "El servicio de SMS está ocupado. No aceptó el mensaje. Inténtalo más tarde.",
  "The SMS service did not accept this message. Check the phone number before trying again.": "El servicio de SMS rechazó el mensaje. Revisa el número antes de volver a intentarlo.",
  "Estimate SMS is unavailable in this environment.": "El envío de cotizaciones por SMS no está disponible en este entorno.",
  "Estimate SMS is unavailable. Check the SMS configuration.": "El envío de SMS no está disponible. Revisa la configuración de SMS.",
  "The customer link is disabled.": "El enlace del cliente está desactivado.",
  "The agreement is not ready or the estimate changed. Please try again.": "El acuerdo aún no está listo o la cotización cambió. Vuelve a intentarlo.",
  "The estimate owner must upload a contract before including it.": "El propietario de la cotización debe subir un contrato para incluirlo.",
  "This estimate is already being sent.": "Esta cotización ya se está enviando.",
  "The estimate owner account is inactive.": "La cuenta del propietario de la cotización está inactiva.",
  "Only administrators and internal dealers can send estimates.": "Solo los administradores y distribuidores internos pueden enviar cotizaciones."
}));

export function reportSendError(message: string, locale: "en" | "es") {
  return locale === "es" ? spanishSendErrors.get(message) ?? message : message;
}

export function estimateSendFeedback(result: EstimateSendResult, locale: "en" | "es" = "en") {
  const es = locale === "es";
  const messages: string[] = [];
  const email = result.email;
  const sms = result.sms;
  if (email?.status === "sent") messages.push(es ? "Correo enviado." : "Email sent.");
  else if (email?.status === "partial") {
    if (email.accepted?.length) messages.push(`${es ? "Correo aceptado para" : "Email accepted for"}: ${email.accepted.join(", ")}.`);
    if (email.rejected?.length) messages.push(`${es ? "Correo rechazado para" : "Email rejected for"}: ${email.rejected.join(", ")}.`);
    if (email.unconfirmed?.length) messages.push(es ? `Envío sin confirmar para ${email.unconfirmed.join(", ")}. Comprueba si llegó antes de volver a enviarlo.` : `Email not confirmed for: ${email.unconfirmed.join(", ")}. Check whether it arrived before sending again.`);
  } else if (email) messages.push(reportSendError(email.message || (email.status === "unknown"
    ? "Email delivery was not confirmed. Check whether it arrived before sending again."
    : "The email could not be sent."), locale));

  if (sms?.status === "sent") messages.push(es ? "SMS enviado." : "SMS sent.");
  else if (sms) messages.push(reportSendError(sms.message || (sms.status === "unknown"
    ? "SMS delivery was not confirmed. Check whether it arrived before sending again."
    : "The SMS could not be sent."), locale));

  const retryEmail = email?.status === "failed" ||
    (email?.status === "partial" && !!email.rejected?.length && !email.unconfirmed?.length);
  const retrySms = sms?.status === "failed";
  const retryChannel: EstimateSendChannel | undefined = retryEmail && retrySms ? "both"
    : retryEmail ? "email" : retrySms ? "sms" : undefined;
  if (retryChannel) messages.push(retryChannel === "both"
    ? (es ? "Puedes corregir los destinatarios que fallaron y volver a intentarlo." : "You can correct the unsuccessful recipients and try again.")
    : es ? `Solo se volverá a enviar ${retryChannel === "email" ? "el correo" : "el SMS"}.`
    : `Only ${retryChannel === "email" ? "email" : "SMS"} will be retried.`);
  return { messages, retryEmail, retrySms, retryChannel };
}
