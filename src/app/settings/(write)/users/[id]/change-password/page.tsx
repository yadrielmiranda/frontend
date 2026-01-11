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
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/users" label="Back to Users" />
      </div>

      <div className="max-w-lg mx-auto">
        <AdminChangePasswordForm user={user} />
      </div>
    </div>
  );
}
