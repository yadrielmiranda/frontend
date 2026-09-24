"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useCompanyBranding } from "@/contexts/CompanyBrandingContext";

export function AuthLoadingScreen() {
  const { branding } = useCompanyBranding();
  const companyName = branding?.name?.trim() || "Authentic Evolution";

  return (
    <main className="relative flex min-h-screen min-h-dvh w-full items-center justify-center overflow-hidden bg-[#050505] px-6 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,1))]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.10]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <Image
          src="/branding/authentic-login-logo.png"
          alt=""
          width={208}
          height={208}
          sizes="(max-width: 640px) 176px, 208px"
          priority
          className="h-44 w-44 object-contain drop-shadow-[0_16px_40px_rgba(220,38,38,0.22)] sm:h-52 sm:w-52"
        />
        <h1 className="mt-4 w-full break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          {companyName}
        </h1>
        <div aria-hidden="true" className="mt-4 h-1 w-10 rounded-full bg-red-600" />
        <p role="status" className="mt-8 flex items-center justify-center gap-3 text-sm text-white/75">
          <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin text-red-500 motion-reduce:animate-none" />
          Loading...
        </p>
        <p className="mt-2 text-xs text-white/50">Please wait a moment.</p>
      </div>
    </main>
  );
}
