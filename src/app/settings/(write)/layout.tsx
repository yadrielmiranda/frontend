// src/app/settings/(write)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canEditSettings } from "@/lib/rbac";

export default async function SettingsWriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // ✅ CLAVE: en write NO redirigimos si no hay sesión
  // para no perder el estado del formulario.
  if (!user) return <>{children}</>;

  const role = user.role?.name ?? null;

  // ✅ Si tiene sesión pero no tiene permiso, fuera
  if (!canEditSettings(role)) redirect("/");

  return <>{children}</>;
}
