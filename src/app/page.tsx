import { requestPortalLanguage } from "@/lib/public-language-server";
import HomePage from "./home-client";

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const { lang } = await searchParams;
  return <HomePage initialLocale={await requestPortalLanguage(lang)} />;
}
