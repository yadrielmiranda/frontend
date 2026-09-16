"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/lib/formatters";

/** Mantiene el estado de cada cobro en su panel y lo muestra al final de la orden. */
export function OrderPaymentSection({
  target,
  title,
  description,
  amount,
  children,
}: {
  target: HTMLDivElement | null;
  title: string;
  description?: string;
  amount: number;
  children: ReactNode;
}) {
  if (!target) return null;

  return createPortal(
    <section className="print:hidden rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Payment amount</p>
          <p className="text-lg font-semibold">{formatMoney(amount)}</p>
        </div>
      </div>
      {children}
    </section>,
    target,
  );
}
