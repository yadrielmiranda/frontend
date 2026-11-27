"use client";

import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CompanyLocale } from "@/components/company/company-content";

const languages = {
  en: { name: "English", flag: "/country-flags/US.svg" },
  es: { name: "Español", flag: "/country-flags/ES.svg" },
};

function Flag({ locale }: { locale: keyof typeof languages }) {
  return (
    <Image src={languages[locale].flag} width={21} height={14} alt="" unoptimized
      className="shrink-0 rounded-[2px] ring-1 ring-current/15" />
  );
}

type LanguageSwitchProps = { locale: CompanyLocale; saving?: boolean } & (
  | { onChange: (locale: CompanyLocale) => void; hrefForLanguage?: never; onFollowLanguage?: never }
  | { hrefForLanguage: (locale: CompanyLocale) => string; onChange?: never; onFollowLanguage?: (locale: CompanyLocale) => void }
);

export function PortalLanguageSwitch({ locale, saving = false, onChange, hrefForLanguage, onFollowLanguage }: LanguageSwitchProps) {
  const label = locale === "es" ? "Cambiar idioma (español)" : "Change language (English)";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        aria-busy={saving}
        className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white data-[state=open]:bg-white/10 sm:px-2"
      >
        <Flag locale={locale} />
        {locale.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" lang={locale} aria-label={locale === "es" ? "Idioma" : "Language"}>
        <DropdownMenuRadioGroup value={locale}>
          {(["en", "es"] as const).map(code => {
            const href = code !== locale ? hrefForLanguage?.(code) : undefined;
            const option = <>
              <Flag locale={code} />
              <span lang={code}>{languages[code].name}</span>
              <span aria-hidden="true" className="ml-auto text-xs text-muted-foreground">{code.toUpperCase()}</span>
            </>;
            return (
              <DropdownMenuRadioItem key={code} value={code} textValue={languages[code].name} disabled={saving}
                asChild={Boolean(href)} className="min-h-11 gap-2.5"
                onSelect={() => { if (!saving && code !== locale) onChange?.(code); }}>
                {href ? <a href={href} hrefLang={code} rel="nofollow" onClick={event => {
                  if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) onFollowLanguage?.(code);
                }}>{option}</a> : option}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
