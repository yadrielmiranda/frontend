// src/app/settings/(write)/users/[id]/change-password/page.tsx
import { notFound } from "next/navigation";
import { BackLink } from "@/components/navigation/back-link";
import { getUser } from "@/app/api/users.api";
import { AdminChangePasswordForm } from "@/components/admin-change-password-form";

export default async function AdminChangePasswordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) notFound();

  const user = await getUser(userId);
  if (!user) notFound();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-6xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <BackLink href="/settings/users" label="Back to Users" />

        <AdminChangePasswordForm user={user} />
      </div>
    </div>
  );
}