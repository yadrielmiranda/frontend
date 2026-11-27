import { PublicAuthScreen } from "@/components/auth/public-auth-screen";
import { requestPortalLanguage } from "@/lib/public-language-server";

export default async function Register({ searchParams }: { searchParams: Promise<{
  ref?: string | string[];
  lang?: string | string[];
}> }) {
  const params = await searchParams;
  const locale = await requestPortalLanguage(params.lang);
  const referralCode = typeof params.ref === "string" ? params.ref : undefined;
  return <PublicAuthScreen mode="register" initialLocale={locale} referralCode={referralCode} />;
}
