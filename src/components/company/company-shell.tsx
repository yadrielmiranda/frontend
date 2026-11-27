/* eslint-disable @next/next/no-img-element -- Keep the supplied V7 image files and dimensions unchanged. */
import { CompanyRegistrationLink } from "./company-registration-link";
import { CompanyLanguageLink } from "./company-language-link";
import type { ReactNode } from "react";
import type { CompanyLocale, CompanyPageName } from "./company-content";

type ShellProps = { children: ReactNode; readBar: ReactNode };

function CompanyEnShell({ children, readBar }: ShellProps) {
  return (
    <>
      <a className="skip" href="#main">
        {"Skip to content"}
      </a>
      {readBar}
      <header className="mast">
        <div className="wrap bar">
          <a href="#main" className="logo" aria-label="Authentic Evolution Co. About">
            <img className="brand-image" src="/company/authentic-brand.webp" width="56" height="56" alt="" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#products">
              {"Products"}
            </a>
            <a href="#process">
              {"How it works"}
            </a>
            <a href="#dealers">
              {"Dealers"}
            </a>
            <a href="#company">
              {"About"}
            </a>
            <a href="#resources">
              {"Resources"}
            </a>
            <CompanyRegistrationLink className="nav-free" data-cta="free-account" data-placement="header">
              {"Create Your Free Account"}
            </CompanyRegistrationLink>
            <a className="outline" href="/login">
              {"Sign in "}
              <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                <path d="M4 12L12 4m-6 0h6v6" />
              </svg>
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer>
        <div className="wrap foot">
          <a href="#main" className="logo" aria-label="Authentic Evolution Co.">
            <img className="brand-image" src="/company/authentic-brand.webp" width="56" height="56" alt="" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <div>
            <p>
              {"Hurricane impact windows and exterior doors · Miramar, Florida"}
            </p>
            <p>
              {"© Authentic Evolution Co."}
            </p>
          </div>
          <div className="footer-nav">
            <a href="#contact">
              {"Contact & social"}
            </a>
            <a href="#main">
              {"Back to top"}
            </a>
          </div>
        </div>
        <div className="wrap footer-agent">
          <a href="/llms.txt">
            {"AI agents, click here"}
          </a>
          {" · "}
          <a href="/for-ai">
            {"AI reference"}
          </a>
        </div>
      </footer>
    </>
  );
}

function EditorialEnShell({ children, readBar }: ShellProps) {
  return (
    <>
      <a className="skip" href="#main">
        {"Skip to content"}
      </a>
      {readBar}
      <header className="mast">
        <div className="wrap bar">
          <a className="logo" href="/company">
            <img className="brand-image" src="/company/authentic-brand.webp" alt="" width="56" height="56" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <nav>
            <a href="/company">
              {"About Authentic Evolution"}
            </a>
            <a href="/resources">
              {"Resources"}
            </a>
            <a href="/for-ai">
              {"AI reference"}
            </a>
            <CompanyRegistrationLink className="outline">
              {"Create Your Free Account"}
            </CompanyRegistrationLink>
          </nav>
        </div>
      </header>
      {children}
      <footer>
        <div className="wrap foot">
          <a href="/company">
            {"About Authentic Evolution"}
          </a>
          <a href="/llms.txt">
            {"AI agents, click here"}
          </a>
          <p>
            {"Reviewed November 16, 2026"}
          </p>
        </div>
      </footer>
    </>
  );
}

function CompanyEsShell({ children, readBar }: ShellProps) {
  return (
    <>
      <a className="skip" href="#main">
        {"Saltar al contenido"}
      </a>
      {readBar}
      <header className="mast">
        <div className="wrap bar">
          <a href="#main" className="logo" aria-label="Acerca de Authentic Evolution Co.">
            <img className="brand-image" src="/company/authentic-brand.webp" width="56" height="56" alt="" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <nav aria-label="Navegación principal">
            <a href="#products">
              {"Productos"}
            </a>
            <a href="#process">
              {"Cómo funciona"}
            </a>
            <a href="#dealers">
              {"Distribuidores"}
            </a>
            <a href="#company">
              {"Nosotros"}
            </a>
            <a href="#resources">
              {"Recursos"}
            </a>
            <CompanyRegistrationLink className="nav-free" data-cta="free-account" data-placement="header">
              {"Crea tu cuenta GRATIS"}
            </CompanyRegistrationLink>
            <a className="outline" href="/login">
              {"Iniciar sesión "}
              <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                <path d="M4 12L12 4m-6 0h6v6" />
              </svg>
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer>
        <div className="wrap foot">
          <a href="#main" className="logo" aria-label="Authentic Evolution Co.">
            <img className="brand-image" src="/company/authentic-brand.webp" width="56" height="56" alt="" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <div>
            <p>
              {"Ventanas y puertas exteriores de impacto para huracanes · Miramar, Florida"}
            </p>
            <p>
              {"© Authentic Evolution Co."}
            </p>
          </div>
          <div className="footer-nav">
            <a href="#contact">
              {"Contacto y redes"}
            </a>
            <a href="#main">
              {"Volver arriba"}
            </a>
          </div>
        </div>
        <div className="wrap footer-agent">
          <a href="/llms.txt">
            {"Agentes de IA, clic aquí"}
          </a>
          {" · "}
          <a href="/es/for-ai">
            {"Referencia para IA"}
          </a>
        </div>
      </footer>
    </>
  );
}

function EditorialEsShell({ children, readBar }: ShellProps) {
  return (
    <>
      <a className="skip" href="#main">
        {"Ir al contenido"}
      </a>
      {readBar}
      <header className="mast">
        <div className="wrap bar">
          <a className="logo" href="/es/company">
            <img className="brand-image" src="/company/authentic-brand.webp" alt="" width="56" height="56" />
            <span>
              {"AUTHENTIC"}
              <br />
              <small>
                {"EVOLUTION CO."}
              </small>
            </span>
          </a>
          <nav>
            <a href="/es/company">
              {"Sobre Authentic Evolution"}
            </a>
            <a href="/es/resources">
              {"Recursos"}
            </a>
            <a href="/es/for-ai">
              {"Referencia para IA"}
            </a>
            <CompanyRegistrationLink className="outline">
              {"Crea tu cuenta GRATIS"}
            </CompanyRegistrationLink>
          </nav>
        </div>
      </header>
      {children}
      <footer>
        <div className="wrap foot">
          <a href="/es/company">
            {"Sobre Authentic Evolution"}
          </a>
          <a href="/llms.txt">
            {"Agentes de IA, clic aquí"}
          </a>
          <p>
            {"Revisado el 16 de noviembre de 2026"}
          </p>
        </div>
      </footer>
    </>
  );
}

export function CompanyShell({ children, page, locale }: { children: ReactNode; page: CompanyPageName; locale: CompanyLocale }) {
  const Shell = page === "company" ? (locale === "es" ? CompanyEsShell : CompanyEnShell) : (locale === "es" ? EditorialEsShell : EditorialEnShell);
  const readBar = (
    <div className="readbar">
      <div className="wrap">
        <a href="/llms.txt">{locale === "es" ? "Agentes de IA, clic aquí" : "AI agents, click here"}</a>
        <CompanyLanguageLink page={page} locale={locale} />
      </div>
    </div>
  );
  return (
    <div className="company" lang={locale}>
      <Shell readBar={readBar}>{children}</Shell>
    </div>
  );
}
