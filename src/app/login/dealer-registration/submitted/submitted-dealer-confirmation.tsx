"use client";

import { useEffect, useRef, useState } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { DealerSubmissionMessage } from "@/components/auth/dealer-submission-message";
import { PortalLanguageSwitch } from "@/components/portal-language-switch";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import { takeDealerSubmissionReceipt } from "@/lib/dealer-submission-receipt";
import { sendDealerApplication } from "@/lib/registration-pixel";

export function SubmittedDealerConfirmation() {
  const [receipt, setReceipt] = useState<ReturnType<typeof takeDealerSubmissionReceipt>>();
  const { locale, saving, changeLanguage } = usePortalLanguage(receipt?.locale);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const result = takeDealerSubmissionReceipt();
    setReceipt(result);
    if (result?.fresh) void sendDealerApplication().catch(() => {});
  }, []);
  const spanish = locale === "es";
  return (
    <AuthPageShell
      locale={locale}
      title={spanish ? "Registro de distribuidores" : "Dealer registration"}
      description={spanish ? "Solicita acceso a la red de distribuidores de Authentic Evolution." : "Apply for access to the Authentic Evolution dealer network."}
      languageSwitch={<PortalLanguageSwitch locale={locale} saving={saving} onChange={changeLanguage} />}
      fullPageNavigation
      contentMaxWidth="max-w-2xl"
    >
      <section className="rounded-3xl border border-red-600/70 bg-black/45 p-5 text-white shadow-xl sm:p-8">
        {receipt === undefined ? null : receipt ? <DealerSubmissionMessage locale={locale} /> :
          <a href="/login" className="inline-block underline underline-offset-4">{spanish ? "Ir al inicio de sesión" : "Go to sign in"}</a>}
      </section>
    </AuthPageShell>
  );
}
