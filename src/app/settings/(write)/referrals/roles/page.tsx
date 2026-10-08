import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ReferralRoleDefaults } from "@/components/referrals/referral-admin-settings";

export default async function ReferralRoleDefaultsPage() {
  const user = await getCurrentUser();
  if (!user || user.role.name !== "admin") notFound();
  return <ReferralRoleDefaults />;
}
