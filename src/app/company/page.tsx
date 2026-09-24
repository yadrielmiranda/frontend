import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Hammer, Mail, MapPin, PanelsTopLeft, Phone } from "lucide-react";
import type { Branding } from "@/app/api/brandings.api";
import { API_URL } from "@/app/api/_base";

export const dynamic = "force-dynamic";

// Se comparte la lectura entre el contenido y el título de la misma solicitud.
const getCompanyInformation = cache(async (): Promise<Branding | null> => {
  try {
    // Solo se consulta el endpoint público, sin cookies ni renovación de sesión.
    // Los datos se cargan en el servidor para que sean visibles sin JavaScript.
    const response = await fetch(`${API_URL}/api/brandings/company/public`, {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Branding | null;
  } catch {
    // La página y sus enlaces siguen disponibles si el backend no responde.
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanyInformation();
  const companyName = company?.name?.trim() || "Authentic Evolution Co";
  return {
    title: `${companyName} | Impact Windows & Doors`,
    description: `${companyName} sells and distributes impact windows and doors in South Florida, with online estimates, orders, payments, and project coordination.`,
  };
}

const services = [
  {
    title: "Impact windows & doors",
    description:
      "Sales and distribution of impact windows and doors for homeowners and dealers.",
    icon: PanelsTopLeft,
  },
  {
    title: "Online estimates & orders",
    description:
      "Product estimates, guidance, and order management through our online platform.",
    icon: FileText,
  },
  {
    title: "Measurements, installation & permits",
    description:
      "Coordination of measurements, installation, and permits through partner professionals and contractors.",
    icon: Hammer,
  },
];

export default async function CompanyPage() {
  const company = await getCompanyInformation();
  const companyName = company?.name?.trim() || "Authentic Evolution Co";
  const phone = company?.phone?.trim();
  const email = company?.email?.trim();
  const street = company?.street?.trim();
  const stateAndPostalCode = [company?.state?.trim(), company?.postalCode?.trim()]
    .filter(Boolean)
    .join(" ");
  const locality = [company?.city?.trim(), stateAndPostalCode]
    .filter(Boolean)
    .join(", ");
  const logoUrl = company?.logoUrl?.trim() || "/branding/authentic-login-logo.png";
  const hasContact = Boolean(phone || email || street || locality);

  return (
    <div className="bg-white text-slate-950">
      <div className="bg-black text-white">
        <header className="border-b border-white/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link href="/company" className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span className="block text-lg font-semibold tracking-tight sm:text-xl">{companyName}</span>
              <span className="mt-1 block text-xs tracking-wide text-white/60">Impact Windows &amp; Doors</span>
            </Link>
            <Link href="/login" prefetch={false} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Client Portal <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section aria-labelledby="company-title" className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 md:grid-cols-[1.3fr_1fr] md:gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Serving South Florida</p>
            <h1 id="company-title" className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Impact windows<br />&amp; doors.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {companyName} sells and distributes impact windows and doors in South Florida. We serve homeowners and dealers through a digital platform for product estimates, orders, and payments.
            </p>
            <a href="#contact" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Contact us <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
          <div className="mx-auto flex w-full max-w-xs items-center justify-center md:max-w-sm">
            <Image src={logoUrl} alt={`${companyName} logo`} width={420} height={420}
              priority unoptimized className="h-auto max-h-96 w-full object-contain" />
          </div>
        </section>
      </div>

      <section aria-labelledby="services-title" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What we do</p>
        <h2 id="services-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Support for your window and door project.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {services.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-200 p-6">
              <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-8 border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 sm:py-14 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
            <h2 id="contact-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Let’s talk about your project.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              {hasContact
                ? "Contact our team with questions about windows, doors, estimates, or installation."
                : "Visit our client portal to review your estimates, orders, and project information."}
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold">{companyName}</p>
            <address className="mt-5 space-y-5 text-sm not-italic">
              {(street || locality) && (
                <div className="flex gap-3">
                  <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <p className="mb-1 font-medium">Business address</p>
                    {street && <p className="break-words leading-6 text-slate-600">{street}</p>}
                    {locality && <p className="leading-6 text-slate-600">{locality}</p>}
                  </div>
                </div>
              )}
              {phone && (
                <div className="flex gap-3">
                  <Phone aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <p className="mb-1 font-medium">Phone</p>
                    <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="break-all text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-black">{phone}</a>
                  </div>
                </div>
              )}
              {email && (
                <div className="flex gap-3">
                  <Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="mb-1 font-medium">Email</p>
                    <a href={`mailto:${email}`} className="break-all text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-black">{email}</a>
                  </div>
                </div>
              )}
            </address>
            <Link href="/login" prefetch={false} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
              Open Client Portal <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <nav aria-label="Company policies" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
          <Link href="/terms" prefetch={false} className="underline underline-offset-4 hover:text-black">Terms and Conditions</Link>
          <Link href="/sms/terms" prefetch={false} className="underline underline-offset-4 hover:text-black">SMS Terms</Link>
          <Link href="/sms/privacy" prefetch={false} className="underline underline-offset-4 hover:text-black">SMS Privacy Policy</Link>
          <Link href="/sms" prefetch={false} className="underline underline-offset-4 hover:text-black">SMS notifications</Link>
        </nav>
        <p className="mt-6 text-xs text-slate-500">© {new Date().getFullYear()} {companyName}</p>
      </footer>
    </div>
  );
}
