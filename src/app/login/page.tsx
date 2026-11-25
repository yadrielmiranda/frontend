import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CardLogin } from "@/components/card-login";
import { PortalInstallButton } from "@/components/pwa/portal-install-button";
import { dealerRegistrationRequestId } from "@/lib/dealer-registration-request";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{
  registrationRequest?: string | string[];
  firstEstimate?: string | string[];
}> }) {
  const params = await searchParams;
  const requestId = dealerRegistrationRequestId(params.registrationRequest);
  return (
    <AuthPageShell
      title="Welcome"
      description="Professional quoting for impact windows and doors."
      contentMaxWidth="max-w-md"
    >
      <CardLogin appearance="dark" registrationRequestId={requestId} firstEstimate={params.firstEstimate === "1"} />
      <PortalInstallButton appearance="dark" />
    </AuthPageShell>
  );
}
