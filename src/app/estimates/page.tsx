import { getEstimates } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimatesClient } from "@/components/estimates/estimates-client";
import { isApiError } from "@/app/api/_base";
import { requestPortalLanguage } from "@/lib/public-language-server";
import { notFound, unstable_rethrow } from "next/navigation";

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ owner?: string; lang?: string | string[] }> }) {
  const { owner, lang } = await searchParams;
  const ownerId = Number(owner) || undefined;
  const [user, locale] = await Promise.all([getCurrentUser(), requestPortalLanguage(lang)]);
  if (!user) notFound();
  let estimates: Awaited<ReturnType<typeof getEstimates>> | null = null;
  try {
    estimates = await getEstimates();
  } catch (error) {
    unstable_rethrow(error);
    if (isApiError(error) && error.status < 500) throw error;
  }

  return (
    <EstimatesClient initialEstimates={estimates} currentUser={user} ownerId={ownerId} initialLocale={locale} />
  );
}
