import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit User: {user.username}</CardTitle>
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
