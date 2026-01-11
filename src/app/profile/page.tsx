// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  // 🔒 Protección real en server (sin loaders innecesarios)
  if (!user) redirect("/login");

  // Pasamos el AuthUser inicial al cliente para:
  // 1) hidratar useAuth
  // 2) preservar role aunque getProfile no lo traiga completo
  return <ProfileClient initialAuthUser={user} />;
}
