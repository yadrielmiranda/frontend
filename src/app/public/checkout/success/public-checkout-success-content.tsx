"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PublicCheckoutSuccessContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const agreementId = params.get("agreementId");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-semibold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment is being confirmed. Projects with installation require administrative review before the order is created.
        </p>
        {token && (
          <Button asChild className="mt-6">
            <Link
              href={
                agreementId
                  ? `/public/estimates/${encodeURIComponent(token)}/agreements/${encodeURIComponent(agreementId)}`
                  : `/public/payments/${encodeURIComponent(token)}`
              }
            >
              {agreementId ? "Return to agreement" : "Return to payment"}
            </Link>
          </Button>
        )}
      </section>
    </main>
  );
}
