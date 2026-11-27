"use client";

import { Download } from "lucide-react";
import type { CompanyLocale } from "@/components/company/company-content";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePortalInstall } from "@/components/pwa/portal-install-provider";

const installCopy = {
  en: {
    install: "Install app",
    installing: "Installing…",
    shortcut: "Quick access from your home screen or desktop.",
  },
  es: {
    install: "Instalar aplicación",
    installing: "Instalando…",
    shortcut: "Acceso rápido desde tu pantalla de inicio o escritorio.",
  },
};

export function PortalInstallButton({ appearance = "light", locale = "en" }: {
  appearance?: "dark" | "light";
  locale?: CompanyLocale;
}) {
  const { visible, installing, requestInstall } = usePortalInstall();
  if (!visible) return null;
  const dark = appearance === "dark";
  const copy = installCopy[locale];

  return (
    <div className={`mt-5 border-t pt-4 text-center ${dark ? "border-white/10" : "border-slate-200"}`}>
      <Button
        type="button"
        variant="outline"
        disabled={installing}
        aria-busy={installing}
        className={`min-h-11 gap-2 rounded-xl px-5 ${dark
          ? "border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
        onClick={() => { if (!installing) void requestInstall(); }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {installing ? copy.installing : copy.install}
      </Button>
      <p className={`mt-2 text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>
        {copy.shortcut}
      </p>
    </div>
  );
}

export function PortalInstallMenuItem({ onSelected, locale = "en" }: {
  onSelected?: () => void;
  locale?: CompanyLocale;
}) {
  const { visible, installing, requestInstall } = usePortalInstall();
  if (!visible) return null;
  const copy = installCopy[locale];

  return (
    <DropdownMenuItem
      asChild
      disabled={installing}
      className="cursor-pointer gap-2 rounded-lg"
      onSelect={() => {
        if (installing) return;
        void requestInstall();
        onSelected?.();
      }}
    >
      <button type="button" disabled={installing} aria-busy={installing} className="w-full text-left">
        <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {installing ? copy.installing : copy.install}
      </button>
    </DropdownMenuItem>
  );
}
