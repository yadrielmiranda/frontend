import type { CompanyLocale } from "@/components/company/company-content";

export function DealerSubmissionMessage({ locale, username }: { locale: CompanyLocale; username?: string }) {
  const spanish = locale === "es";
  return (
    <div role="status" className="space-y-3">
      <h2 className="text-2xl font-semibold">{spanish ? "Solicitud enviada" : "Application submitted"}</h2>
      <p>{spanish
        ? "Tu solicitud está pendiente de aprobación. Una vez aprobada, podrás iniciar sesión con tu correo electrónico"
        : "Your request is pending approval. Once approved, you can sign in with your email"}{username && <>
        {spanish ? " o con tu nombre de usuario, " : " or your username, "}<strong className="break-all">{username}</strong>
      </>}.</p>
      <a href="/login" className="inline-block underline underline-offset-4">{spanish ? "Ir al inicio de sesión" : "Go to sign in"}</a>
    </div>
  );
}
