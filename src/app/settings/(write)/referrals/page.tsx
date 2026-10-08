import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ReferralAdmin } from "@/components/referrals/referral-admin";

export default async function ReferralSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role.name !== "admin") notFound();
  return <ReferralAdmin currentUserId={user.id} />;
}
