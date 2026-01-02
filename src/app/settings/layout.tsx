// src/app/settings/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessSettings } from "@/lib/rbac";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // ✅ En settings (lectura): sin sesión -> fuera
  if (!user) redirect("/");

  const role = user.role?.name ?? null;
  if (!canAccessSettings(role)) redirect("/");

  return <>{children}</>;
}
