import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings, isAdminRole } from "@/lib/rbac";
import { getInstallationServices } from "@/app/api/installations.api";
import { InstallationServicesClient } from "./installation-services-client";

export default async function InstallationServicesPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessSettings(user.role?.name)) notFound();

  const services = await getInstallationServices(true);

  return (
    <InstallationServicesClient
      initialServices={services}
      canEdit={isAdminRole(user.role?.name)}
    />
  );
}
