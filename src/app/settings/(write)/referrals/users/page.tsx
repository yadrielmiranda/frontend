import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ReferralIndividualSettings } from "@/components/referrals/referral-admin-settings";

export default async function ReferralIndividualSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role.name !== "admin") notFound();
  return <ReferralIndividualSettings />;
}
