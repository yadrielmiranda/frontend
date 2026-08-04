import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings, isAdminRole } from "@/lib/rbac";
import {
  getDirectSysConfInstallationServiceMappings,
  getInstallationServices,
} from "@/app/api/installations.api";
import { InstallationMappingsClient } from "./installation-mappings-client";

export default async function InstallationMappingsPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessSettings(user.role?.name)) notFound();

  const [initialMappings, services] = await Promise.all([
    getDirectSysConfInstallationServiceMappings(),
    getInstallationServices(true),
  ]);

  return (
    <InstallationMappingsClient
      initialMappings={initialMappings}
      services={services}
      canEdit={isAdminRole(user.role?.name)}
    />
  );
}
