// src/app/settings/(write)/users/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/navigation/back-link";
import { getUser } from "@/app/api/users.api";
import { getRoles } from "@/app/api/roles.api";
import { UserForm } from "../../new/user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) notFound();

  const [user, roles] = await Promise.all([getUser(userId), getRoles()]);
  if (!user) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink href="/settings/users" label="Back to Users" />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Edit User: {user.username}</CardTitle>
          <CardDescription>
            Update the role or set a custom markup for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm user={user} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
