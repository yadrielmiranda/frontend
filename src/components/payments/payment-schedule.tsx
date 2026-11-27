import { formatMoney } from "@/lib/formatters";
import type { CompanyLocale } from "@/components/company/company-content";
import type { PaymentSchedule, PaymentScheduleRow } from "@/lib/payment-plan";
import { paymentRowDescription, paymentRowTitle, paymentScheduleNotice } from "@/lib/payment-plan-language";

function rowStatus(row: PaymentScheduleRow, locale: CompanyLocale) {
  const spanish = locale === "es";
  switch (row.status) {
    case "REVIEW": return spanish ? "En revisión" : "Under review";
    case "PAID":
      if (Number(row.amount) === 0) return spanish ? "Sin cargo" : "No charge";
      if (Number(row.credit) > 0) return spanish ? "Cubierta" : "Covered";
      return spanish ? "Pagada" : "Paid";
    case "CREDIT": return spanish ? "Crédito" : "Credit";
    case "DUE": return spanish ? "Por pagar" : "Due";
    default: return spanish ? "Próxima" : "Upcoming";
  }
}

export function PaymentScheduleView({
  schedule,
  termsOnly = false,
  locale = "en",
}: {
  schedule: PaymentSchedule | null | undefined;
  termsOnly?: boolean;
  locale?: CompanyLocale;
}) {
  if (!schedule) return null;
  const spanish = locale === "es";
  return (
    <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm print:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {termsOnly ? (spanish ? "Plan de pagos" : "Payment Schedule") : (spanish ? "Estado de los pagos" : "Payment Status")}
        </h3>
      </div>
      {schedule.provisional && (
        <p className="mb-3 text-sm text-amber-800">
          {paymentScheduleNotice(locale, schedule.provisionalMessage ??
            "Amounts are preliminary until the included charges are finalized.")}
        </p>
      )}
      {!termsOnly && schedule.refundReviewPending && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        {spanish ? "Hay un reembolso en revisión. Los pagos afectados están suspendidos temporalmente. Puedes seguir pagando las demás cuotas disponibles." : "A refund is under review. Affected payments are temporarily unavailable; other due payments can still be paid."}
      </p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">{spanish ? "Etapa" : "Milestone"}</th>
              <th className="p-2 text-right">{spanish ? "Importe" : "Amount"}</th>
              {!termsOnly && (
                <>
                  <th className="p-2 text-right">{spanish ? "Pagado / acreditado" : "Paid / credited"}</th>
                  <th className="p-2 text-right">{spanish ? "Saldo" : "Balance"}</th>
                  <th className="py-2 pl-3 text-right">{spanish ? "Estado" : "Status"}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row) => (
              <tr key={row.sequence} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-medium">{paymentRowTitle(locale, row)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {paymentRowDescription(locale, row)}
                  </p>
                </td>
                <td className="whitespace-nowrap p-2 text-right font-medium">
                  {formatMoney(Number(row.amount))}
                  {Number(row.approvedCredit) > 0 && <span className="block text-xs font-normal text-muted-foreground">{spanish ? "Reducción de" : "Reduced by"} {formatMoney(Number(row.approvedCredit))}</span>}
                </td>
                {!termsOnly && (
                  <>
                    <td className="whitespace-nowrap p-2 text-right">
                      {formatMoney(Number(row.paid) + Number(row.credit))}
                    </td>
                    <td className="whitespace-nowrap p-2 text-right">
                      {formatMoney(Number(row.balance))}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${row.status === "PAID" || row.status === "CREDIT" ? "bg-emerald-50 text-emerald-800" : row.status === "DUE" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {rowStatus(row, locale)}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-x-8 gap-y-2 border-t pt-3 text-sm">
        <span>
          {spanish ? "Total del proyecto" : "Project total"} <strong>{formatMoney(Number(schedule.total))}</strong>
        </span>
        {!termsOnly && (
          <>
            <span>
              {spanish ? "Pagado" : "Paid"} <strong>{formatMoney(Number(schedule.paid))}</strong>
            </span>
            <span>
              {spanish ? "Saldo" : "Balance"} <strong>{formatMoney(Number(schedule.balance))}</strong>
            </span>
          </>
        )}
      </div>
      {!termsOnly && Number(schedule.refunded) > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {spanish
            ? `El importe pagado refleja los reembolsos confirmados. Se reembolsaron ${formatMoney(Number(schedule.refunded))}, incluidas las comisiones de procesamiento devueltas.`
            : `Paid reflects confirmed refunds. Refunded receipts: ${formatMoney(Number(schedule.refunded))}, including any refunded processing fees.`}
          {Number(schedule.approvedRefundCredit) > 0 && (spanish
            ? ` El total del proyecto incluye una reducción aprobada de ${formatMoney(Number(schedule.approvedRefundCredit))}.`
            : ` Project total includes an approved reduction of ${formatMoney(Number(schedule.approvedRefundCredit))}.`)}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {spanish
          ? "Si ya pagaste un depósito de instalación, se abona a la primera cuota de la orden. Cualquier crédito sobrante se aplica a las cuotas siguientes. El depósito se cuenta una sola vez. Este plan excluye la entrega y los cargos adicionales que se cobran por separado."
          : "Any installation deposit already paid is credited toward the first order installment. Unused credit carries forward. It is counted once. Delivery and separate extra charges are excluded from this schedule."}
      </p>
      {!termsOnly && Number(schedule.depositPaid) > 0 && (
        <p className="mt-2 text-sm text-emerald-800">
          {spanish ? "Depósito incluido en el importe pagado o acreditado:" : "Deposit included in paid / credited:"}{" "}
          {formatMoney(Number(schedule.depositPaid))}.
        </p>
      )}
      {!termsOnly && Number(schedule.permitPaid) > 0 && (
        <p className="mt-1 text-sm text-emerald-800">
          {spanish ? "Pago del permiso incluido en el importe pagado o acreditado:" : "Permit payment included in paid / credited:"}{" "}
          {formatMoney(Number(schedule.permitPaid))}.
        </p>
      )}
      {!termsOnly && Number(schedule.creditBalance) > 0 && (
        <p className="mt-1 text-sm text-emerald-800">
          {spanish ? "Saldo a favor:" : "Credit balance:"} {formatMoney(Number(schedule.creditBalance))}.
        </p>
      )}
    </section>
  );
}
