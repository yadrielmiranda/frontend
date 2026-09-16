import type { InstallationQuote } from "@/lib/types";
import { roundMoney } from "@/lib/formatters";

type AdditionalServiceTotal = {
  serviceId: number;
  name: string;
  amount: number;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function additionalServiceTotals(
  quote: InstallationQuote | null,
): AdditionalServiceTotal[] {
  if (!quote) return [];
  if (quote.additionalServices) {
    return quote.additionalServices.map((service) => ({ ...service, amount: numberValue(service.amount) }));
  }

  const automaticServiceIds = new Set(
    quote.lines
      .filter((line) => line.origin === "AUTO")
      .map((line) => line.serviceId),
  );
  const grouped = new Map<number, AdditionalServiceTotal>();

  for (const line of quote.lines) {
    if (line.origin !== "USER_SELECTED" && line.origin !== "FIELD_ADDED") {
      continue;
    }

    const current = grouped.get(line.serviceId);
    const amount = numberValue(line.adjustedAmount);

    if (current) {
      current.amount = roundMoney(current.amount + amount);
    } else {
      grouped.set(line.serviceId, {
        serviceId: line.serviceId,
        name: line.serviceNameSnapshot,
        amount: roundMoney(amount),
      });
    }
  }

  const minimums = Array.isArray(quote.serviceMinimumsSnapshot)
    ? quote.serviceMinimumsSnapshot
    : [];

  for (const minimum of minimums) {
    const current = grouped.get(Number(minimum.serviceId));

    // El mínimo exclusivo de un servicio adicional se suma a ese servicio.
    // Los ajustes compartidos o automáticos permanecen en Installation.
    if (current && !automaticServiceIds.has(current.serviceId)) {
      current.amount = roundMoney(
        current.amount + numberValue(minimum.adjustment),
      );
    }
  }

  return Array.from(grouped.values());
}
