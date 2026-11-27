import { PublicAuthScreen } from "@/components/auth/public-auth-screen";
import { dealerRegistrationRequestId } from "@/lib/dealer-registration-request";
import { requestPortalLanguage } from "@/lib/public-language-server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{
  registrationRequest?: string | string[];
  firstEstimate?: string | string[];
  lang?: string | string[];
}> }) {
  const params = await searchParams;
  const requestId = dealerRegistrationRequestId(params.registrationRequest);
  return (
    <PublicAuthScreen
      mode="login"
      initialLocale={await requestPortalLanguage(params.lang)}
      registrationRequestId={requestId}
      firstEstimate={params.firstEstimate === "1" && !requestId}
    />
  );
}
