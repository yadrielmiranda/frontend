import { formatMoney } from "@/lib/formatters";
import type { PaymentSchedule } from "@/lib/payment-plan";

export function PaymentScheduleView({
  schedule,
  termsOnly = false,
}: {
  schedule: PaymentSchedule | null | undefined;
  termsOnly?: boolean;
}) {
  if (!schedule) return null;
  return (
    <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm print:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {termsOnly ? "Payment Schedule" : "Payment Status"}
        </h3>
      </div>
      {schedule.provisional && (
        <p className="mb-3 text-sm text-amber-800">
          {schedule.provisionalMessage ??
            "Amounts are preliminary until the included charges are finalized."}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Milestone</th>
              <th className="p-2 text-right">Amount</th>
              {!termsOnly && (
                <>
                  <th className="p-2 text-right">Paid / credited</th>
                  <th className="p-2 text-right">Balance</th>
                  <th className="py-2 pl-3 text-right">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row) => (
              <tr key={row.sequence} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-medium">{row.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                </td>
                <td className="whitespace-nowrap p-2 text-right font-medium">
                  {formatMoney(Number(row.amount))}
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
                        {row.status === "PAID"
                          ? Number(row.amount) === 0
                            ? "No charge"
                            : Number(row.credit) > 0
                              ? "Covered"
                              : "Paid"
                          : row.status === "CREDIT"
                            ? "Credit"
                            : row.status === "DUE"
                              ? "Due"
                              : "Upcoming"}
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
          Project total <strong>{formatMoney(Number(schedule.total))}</strong>
        </span>
        {!termsOnly && (
          <>
            <span>
              Paid <strong>{formatMoney(Number(schedule.paid))}</strong>
            </span>
            <span>
              Balance <strong>{formatMoney(Number(schedule.balance))}</strong>
            </span>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Any installation deposit already paid is credited toward the first order
        installment. Unused credit carries forward. It is counted once. Delivery
        and separate extra charges are excluded from this schedule.
      </p>
      {!termsOnly && Number(schedule.depositPaid) > 0 && (
        <p className="mt-2 text-sm text-emerald-800">
          Deposit included in paid / credited:{" "}
          {formatMoney(Number(schedule.depositPaid))}.
        </p>
      )}
      {!termsOnly && Number(schedule.permitPaid) > 0 && (
        <p className="mt-1 text-sm text-emerald-800">
          Permit payment included in paid / credited:{" "}
          {formatMoney(Number(schedule.permitPaid))}.
        </p>
      )}
      {!termsOnly && Number(schedule.creditBalance) > 0 && (
        <p className="mt-1 text-sm text-emerald-800">
          Credit balance: {formatMoney(Number(schedule.creditBalance))}.
        </p>
      )}
    </section>
  );
}
