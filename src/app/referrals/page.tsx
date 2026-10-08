import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ReferralDashboard } from "@/components/referrals/referral-dashboard";

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user || !["dealer", "client"].includes(user.role.name)) notFound();
  return <ReferralDashboard userId={user.id} />;
}
