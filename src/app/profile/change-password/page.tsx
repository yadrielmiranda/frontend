// src/app/profile/change-password/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-6xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <BackLink href="/profile" label="Back to Profile" />

        <ChangePasswordForm />
      </div>
    </div>
  );
}
