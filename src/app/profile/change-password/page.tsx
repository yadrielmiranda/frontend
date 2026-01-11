// src/app/profile/change-password/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  // 🔒 Protección real en server
  if (!user) redirect("/login");

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <ChangePasswordForm />
    </div>
  );
}
