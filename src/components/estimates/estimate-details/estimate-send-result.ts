import type { EstimateSendChannel, EstimateSendResult } from "@/app/api/estimates.api";

export function estimateSendFeedback(result: EstimateSendResult) {
  const messages: string[] = [];
  const email = result.email;
  const sms = result.sms;
  if (email?.status === "sent") messages.push("Email sent.");
  else if (email?.status === "partial") {
    if (email.accepted?.length) messages.push(`Email accepted for: ${email.accepted.join(", ")}.`);
    if (email.rejected?.length) messages.push(`Email rejected for: ${email.rejected.join(", ")}.`);
    if (email.unconfirmed?.length) messages.push(`Email not confirmed for: ${email.unconfirmed.join(", ")}. Check whether it arrived before sending again.`);
  } else if (email) messages.push(email.message || (email.status === "unknown"
    ? "Email delivery was not confirmed. Check whether it arrived before sending again."
    : "The email could not be sent."));

  if (sms?.status === "sent") messages.push("SMS sent.");
  else if (sms) messages.push(sms.message || (sms.status === "unknown"
    ? "SMS delivery was not confirmed. Check whether it arrived before sending again."
    : "The SMS could not be sent."));

  const retryEmail = email?.status === "failed" ||
    (email?.status === "partial" && !!email.rejected?.length && !email.unconfirmed?.length);
  const retrySms = sms?.status === "failed";
  const retryChannel: EstimateSendChannel | undefined = retryEmail && retrySms ? "both"
    : retryEmail ? "email" : retrySms ? "sms" : undefined;
  if (retryChannel) messages.push(retryChannel === "both"
    ? "You can correct the unsuccessful recipients and try again."
    : `Only ${retryChannel === "email" ? "email" : "SMS"} will be retried.`);
  return { messages, retryEmail, retrySms, retryChannel };
}
