export const MAX_ESTIMATE_EMAIL_RECIPIENTS = 10;
export const MAX_ESTIMATE_EMAIL_INPUT_LENGTH = 4096;

export function parseEstimateEmailRecipients(to: string, cc: string, locale: "en" | "es" = "en") {
  const es = locale === "es";
  const recipient = to.trim().toLowerCase();
  const copies: string[] = [];
  const validEmail = (value: string) => value.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
  if (/[\r\n]/.test(to) || !validEmail(recipient)) {
    return { to: recipient, cc: copies, error: es ? "Escribe una dirección de correo válida en Para." : "Enter one valid email address in To." };
  }
  if (cc.length > MAX_ESTIMATE_EMAIL_INPUT_LENGTH || /[\r\n]/.test(cc)) {
    return { to: recipient, cc: copies, error: es ? "Escribe direcciones válidas en CC separadas por comas." : "Enter valid CC email addresses separated by commas." };
  }
  const seen = new Set([recipient]);
  for (const part of cc.trim() ? cc.split(",") : []) {
    const address = part.trim().toLowerCase();
    if (!validEmail(address)) {
      return { to: recipient, cc: copies, error: es ? "Escribe direcciones válidas en CC separadas por comas." : "Enter valid CC email addresses separated by commas." };
    }
    if (seen.has(address)) continue;
    seen.add(address);
    copies.push(address);
    if (seen.size > MAX_ESTIMATE_EMAIL_RECIPIENTS) {
      return { to: recipient, cc: copies, error: es ? `Usa un máximo de ${MAX_ESTIMATE_EMAIL_RECIPIENTS} destinatarios entre Para y CC.` : `Use up to ${MAX_ESTIMATE_EMAIL_RECIPIENTS} recipients in total, including To and CC.` };
    }
  }
  return { to: recipient, cc: copies, error: null };
}
