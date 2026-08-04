import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings, isAdminRole } from "@/lib/rbac";
import { getInstallationProfiles } from "@/app/api/installations.api";
import { InstallationProfilesClient } from "./installation-profiles-client";

export default async function InstallationProfilesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessSettings(user.role?.name)) notFound();

  return (
    <InstallationProfilesClient
      initialProfiles={await getInstallationProfiles(true)}
      canEdit={isAdminRole(user.role?.name)}
    />
  );
}
