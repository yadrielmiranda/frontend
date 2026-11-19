import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CardLogin } from "@/components/card-login";
import { PortalInstallButton } from "@/components/pwa/portal-install-button";
import { dealerRegistrationRequestId } from "@/lib/dealer-registration-request";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registrationRequest?: string | string[] }> }) {
  const requestId = dealerRegistrationRequestId((await searchParams).registrationRequest);
  return (
    <AuthPageShell
      title="Welcome"
      description="Professional quoting for impact windows and doors."
      contentMaxWidth="max-w-md"
    >
      <CardLogin appearance="dark" registrationRequestId={requestId} />
      <PortalInstallButton appearance="dark" />
    </AuthPageShell>
  );
}
