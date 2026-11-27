import Link from "next/link";

export function SiteFooter({ locale, fullPageNavigation = false }: { locale?: "en" | "es"; fullPageNavigation?: boolean }) {
  const FooterLink = fullPageNavigation ? "a" : Link;
  const spanish = locale === "es";
  const company = !locale ? "/company" : spanish ? "/es/company" : "/company?lang=en";
  return (
    <footer lang={locale} className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 py-5 text-center text-xs text-slate-500">
      <FooterLink href={company} className="underline underline-offset-4">{spanish ? "Empresa" : "Company"}</FooterLink>
      <FooterLink href="/materials" className="underline underline-offset-4">{spanish ? "Materiales" : "Materials"}</FooterLink>
      <FooterLink href="/terms" className="underline underline-offset-4">{spanish ? "Términos y condiciones" : "Terms and Conditions"}</FooterLink>
    </footer>
  );
}
