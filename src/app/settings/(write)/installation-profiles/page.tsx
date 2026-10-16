import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings, isAdminRole } from "@/lib/rbac";
import { getInstallationProfiles, getInstallationServices } from "@/app/api/installations.api";
import { InstallationProfilesClient } from "./installation-profiles-client";

export default async function InstallationProfilesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessSettings(user.role?.name)) notFound();
  const [profiles, services] = await Promise.all([
    getInstallationProfiles(true),
    isAdminRole(user.role?.name) ? getInstallationServices(true) : Promise.resolve([]),
  ]);

  return (
    <InstallationProfilesClient
      initialProfiles={profiles}
      services={services}
      canEdit={isAdminRole(user.role?.name)}
    />
  );
}
