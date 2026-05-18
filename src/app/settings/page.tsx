import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings, isAdminRole } from "@/lib/rbac";
import { SettingsHub } from "./settings-hub";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) notFound();

  const role = user.role?.name ?? null;

  if (!canAccessSettings(role)) notFound();

  return <SettingsHub isAdmin={isAdminRole(role)} />;
}
