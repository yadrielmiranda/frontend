// src/app/settings/(write)/layout.tsx
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

export default async function SettingsWriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();  
  if (!user) notFound();
  
  const role = user?.role?.name ?? null; 

  // ✅ Si tiene sesión pero no tiene permiso, fuera
  if (!canEditSettings(role)) notFound();

  return <>{children}</>;
}
